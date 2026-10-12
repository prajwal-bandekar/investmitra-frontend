import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Portfolios, Stocks } from '../api/client';
import { money, qty as fmtQty, signedMoney } from '../format';
import { istShortDate } from '../lib/market';
import { Field, useToast } from '../ui';
import './TradeSlip.css';

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Zigzag top and bottom edges for the thermal receipt.
const ZIGZAG = (() => {
  const teeth = 22;
  const top = [];
  const bottom = [];
  for (let i = 0; i <= teeth; i += 1) {
    const x = `${((i * 100) / teeth).toFixed(2)}%`;
    top.push(`${x} ${i % 2 ? '0px' : '6px'}`);
    bottom.push(`${x} ${i % 2 ? '100%' : 'calc(100% - 6px)'}`);
  }
  return `polygon(${top.join(',')},${bottom.reverse().join(',')})`;
})();

// Jagged tear line across the slip, left to right, as [x%, y%].
const TEAR = [[0, 40], [7, 45], [15, 39], [24, 46], [32, 41], [41, 48], [50, 42], [59, 49], [67, 43], [76, 50], [84, 44], [92, 51], [100, 46]];
const pts = (list) => list.map(([x, y]) => `${x}% ${y}%`).join(',');
const TEAR_TOP = `polygon(0 0,100% 0,${pts([...TEAR].reverse())})`;
const TEAR_BOTTOM = `polygon(${pts(TEAR)},100% 100%,0 100%)`;

const CONFETTI = [
  ['-46px', '-62px', '#E8A317'], ['-20px', '-84px', '#0A6634'], ['14px', '-90px', '#46014A'], ['44px', '-66px', '#E8A317'],
  ['62px', '-30px', '#0A6634'], ['-62px', '-28px', '#46014A'], ['28px', '-48px', '#E8A317'], ['-34px', '-44px', '#0A6634'],
];

const MAX_QTY = 99999999; // 8 digits

const newRequestId = () => {
  try {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  } catch { /* fall through */ }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
};

const istStamp = (instant) =>
  `${new Date(instant || Date.now()).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  })} IST`;

/**
 * The order slip. Trades execute at the latest stored close.
 * Placing an order turns the slip into a printed receipt that files itself away; tearing it up rips it in two.
 * @param stock        StockView (symbol, name, sector, price)
 * @param side         'BUY' | 'SELL'
 * @param portfolioId  preselect a portfolio (e.g. from a portfolio page)
 * @param latest       ISO date of the newest close, to flag stale prices
 * @param cash         the signed-in user's cash, kept fresh by the shell
 */
export default function TradeSlip({ stock, side: initialSide = 'BUY', portfolioId, latest, cash: userCash, onClose, onDone }) {
  const toast = useToast();
  const [side, setSide] = useState(initialSide);
  const [folios, setFolios] = useState(null);
  const [pid, setPid] = useState(portfolioId ? String(portfolioId) : '');
  const [held, setHeld] = useState(0);
  const [heldReady, setHeldReady] = useState(false);
  const [fresh, setFresh] = useState(null);
  const [ownerCash, setOwnerCash] = useState(null);
  const [qtyText, setQtyText] = useState('1');
  const [serverError, setServerError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [shaking, setShaking] = useState(false);
  const [phase, setPhase] = useState('slip'); // slip | tearing | filing
  const [folioName, setFolioName] = useState('My first portfolio');
  const [folioBusy, setFolioBusy] = useState(false);
  const [folioError, setFolioError] = useState('');
  const timers = useRef([]);
  const inFlight = useRef(false);
  const attempt = useRef({ sig: null, id: null }); // same order retried keeps its id; a changed order gets a new one

  const later = useCallback((fn, ms) => { timers.current.push(setTimeout(fn, ms)); }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const loadFolios = useCallback(() => {
    Portfolios.list()
      .then((res) => {
        setFolios(res.data);
        const usable = res.data.filter((p) => !p.sector || p.sector === stock.sector);
        setPid((cur) => cur || (usable.length ? String(usable[0].id) : ''));
      })
      .catch((err) => { setFolios([]); setServerError({ title: err.message }); });
  }, [stock.sector]);
  useEffect(() => { loadFolios(); }, [loadFolios]);

  // How many the chosen folio holds, and the cash of whoever owns it (a client's cash, for advisors).
  useEffect(() => {
    setOwnerCash(null);
    if (!pid) return undefined;
    let live = true;
    setHeldReady(false);
    Portfolios.get(pid)
      .then((res) => {
        if (!live) return;
        const h = res.data?.holdings?.find((x) => x.symbol === stock.symbol);
        const n = h ? h.quantity : 0;
        setHeld(n);
        setHeldReady(true);
        setOwnerCash(res.data?.ownerCash != null ? Number(res.data.ownerCash) : null);
      })
      .catch(() => { if (live) { setHeld(0); setHeldReady(true); setOwnerCash(null); } });
    return () => { live = false; };
  }, [pid, stock.symbol]);

  // Selling never starts above what the chosen portfolio holds.
  useEffect(() => {
    if (side !== 'SELL' || !heldReady || held <= 0) return;
    setQtyText((t) => (/^\d+$/.test(t) && parseInt(t, 10) > held ? String(held) : t));
  }, [side, heldReady, held]);

  // The price may have moved since the list was loaded; show the latest stored close.
  useEffect(() => {
    let live = true;
    Stocks.get(stock.symbol)
      .then((res) => { if (live && res.data?.price) setFresh(res.data.price); })
      .catch(() => {});
    return () => { live = false; };
  }, [stock.symbol]);

  const dismiss = useCallback(() => {
    if (done) {
      toast(`${done.trade.side === 'BUY' ? 'Bought' : 'Sold'} ${fmtQty(done.trade.quantity)} ${stock.symbol}. Filed.`);
    }
    onClose();
  }, [done, onClose, stock.symbol, toast]);

  // Receipt flies into the filing tray, then the dialog closes.
  const fileIt = useCallback(() => {
    if (phase === 'filing') return;
    if (reducedMotion()) { dismiss(); return; }
    setPhase('filing');
    later(dismiss, 800);
  }, [phase, dismiss, later]);

  const tearUp = () => {
    if (phase !== 'slip') return;
    if (reducedMotion()) { onClose(); return; }
    setPhase('tearing');
    later(onClose, 760);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (done) dismiss(); else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [done, dismiss, onClose]);

  // The receipt files itself shortly after it finishes printing, (or sooner, on File it).
  useEffect(() => {
    if (!done || reducedMotion()) return undefined;
    const t = setTimeout(() => { fileIt(); }, 2000 + 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const shake = useCallback(() => {
    setShaking(false);
    // Next frame, so the animation restarts when it fires twice in a row.
    requestAnimationFrame(() => setShaking(true));
    later(() => setShaking(false), 500);
  }, [later]);

  const usable = (folios || []).filter((p) => !p.sector || p.sector === stock.sector);
  const quote = fresh || stock.price;
  const price = Number(quote?.close ?? 0);
  const buy = side === 'BUY';
  // Until the chosen portfolio's owner cash arrives, the signed-in user's cash is only a stand-in for checks, never shown.
  const cashKnown = ownerCash !== null || !pid;
  const cash = ownerCash ?? Number(userCash ?? 0);
  const n = /^\d+$/.test(qtyText) ? parseInt(qtyText, 10) : NaN;
  const validQty = n > 0;
  const total = validQty ? n * price : 0;
  const after = buy ? cash - total : cash + total;
  const stale = latest && quote && quote.asOf < latest;
  const needsFolio = folios !== null && usable.length === 0;

  const problem = useMemo(() => {
    if (qtyText === '') return null;
    if (!validQty) return { title: 'Enter a whole number of shares.', sub: null };
    if (buy && cashKnown && total > cash) return { title: 'Not enough cash for this order.', sub: `You can afford ${fmtQty(Math.floor(cash / price))} shares at this price.` };
    if (!buy && heldReady && n > held) return held
      ? { title: `You only hold ${fmtQty(held)} in this portfolio.`, sub: null }
      : { title: 'You don’t own this stock in this portfolio.', sub: null };
    return null;
  }, [qtyText, validQty, buy, total, cash, cashKnown, price, n, held, heldReady]);

  const canTry = validQty && pid && !busy && (buy || heldReady) && price > 0 && !needsFolio;
  const folioLabel = (folios || []).find((p) => String(p.id) === pid)?.name || '';

  const place = async () => {
    if (inFlight.current || !canTry) return;
    if (problem) { shake(); return; }
    inFlight.current = true;
    setBusy(true);
    setServerError(null);
    try {
      const sig = `${pid}|${side}|${n}`;
      if (attempt.current.sig !== sig) attempt.current = { sig, id: newRequestId() };
      const res = await Portfolios.trade(pid, { symbol: stock.symbol, side, quantity: n, clientRequestId: attempt.current.id });
      setDone(res.data);
      onDone?.();
    } catch (err) {
      setServerError({ title: err.message });
      shake();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const openFolio = async (e) => {
    e.preventDefault();
    if (!folioName.trim()) { setFolioError('Give the portfolio a name first.'); return; }
    setFolioBusy(true);
    setFolioError('');
    try {
      const res = await Portfolios.create({ name: folioName.trim(), sector: null, ownerId: null });
      setFolios((list) => [...(list || []), res.data]);
      setPid(String(res.data.id));
      toast('Portfolio created.');
    } catch (err) {
      setFolioError(err.message);
    } finally {
      setFolioBusy(false);
    }
  };

  const shown = problem || serverError;
  const noPrice = !(price > 0);

  /* ---------------- the slip itself (rendered twice while tearing) ---------------- */
  const sheet = (
    <>
      <div className="slip__head mono">
        <span>Order slip</span><span>{istShortDate()}</span>
      </div>
      <div className="slip__body">
        <div className="slip__stock">
          <div style={{ minWidth: 0 }}>
            <div className="mono slip__ticker">{stock.symbol}</div>
            <div className="muted">{stock.name}</div>
          </div>
        </div>

        {noPrice && (
          <div className="error-box" role="alert">
            <strong>No price on file for {stock.symbol} yet.</strong>
            <span>{stock.tracked === false ? 'Its price arrives with the evening update. Try again after that.' : 'Close this slip, press Get price on the stock, then try again.'}</span>
          </div>
        )}

        <div className="segmented" role="group" aria-label="Order side" style={{ marginTop: 16 }}>
          <button type="button" aria-pressed={buy} onClick={() => setSide('BUY')}>Buy</button>
          <button type="button" aria-pressed={!buy} onClick={() => setSide('SELL')}>Sell</button>
        </div>

        {folios === null && <p className="muted" style={{ margin: '16px 0 0' }}>Loading…</p>}

        {needsFolio && (
          <form className="slip__newfolio" onSubmit={openFolio}>
            <strong>{folios.length ? `None of your portfolios take ${stock.sector} stocks.` : 'Create a portfolio first.'}</strong>
            <Field label="Portfolio name" value={folioName} onChange={(e) => { setFolioName(e.target.value); setFolioError(''); }} />
            {folioError && <p role="alert" className="field__error" style={{ margin: 0 }}>✕ {folioError}</p>}
            <div className="slip__newfolio-actions">
              <button type="submit" className="btn btn--ink" disabled={folioBusy}>{folioBusy ? 'Creating…' : 'Create and continue'}</button>
              <Link to="/app/book" className="btn btn--link" onClick={onClose}>Manage portfolios</Link>
            </div>
          </form>
        )}

        {usable.length > 0 && (
          <Field as="select" label="Portfolio" value={pid} onChange={(e) => setPid(e.target.value)} disabled={!!portfolioId}
            style={{ marginTop: 16 }}>
            {usable.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}{p.sector ? ` (${p.sector} only)` : ''}{p.advisorId ? ` · ${p.ownerClientId}` : ''}
              </option>
            ))}
          </Field>
        )}

        {!needsFolio && (
          <>
            <div className="slip__qtyrow">
              <label className="field">
                <span className="field__label">Quantity</span>
                <div className="slip__stepper">
                  <button type="button" aria-label="One fewer" onClick={() => setQtyText(String(Math.min(MAX_QTY, Math.max(1, (parseInt(qtyText, 10) || 1) - 1))))}>−</button>
                  <input aria-label="Quantity" inputMode="numeric" value={qtyText} autoFocus={phase === 'slip'}
                    onChange={(e) => setQtyText(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    onKeyDown={(e) => e.key === 'Enter' && place()} />
                  <button type="button" aria-label="One more" onClick={() => setQtyText(String(Math.min(MAX_QTY, (parseInt(qtyText, 10) || 0) + 1)))}>+</button>
                </div>
              </label>
              {!buy && (
                <div style={{ textAlign: 'right', paddingBottom: 6 }}>
                  <div className="field__label" style={{ justifyContent: 'flex-end' }}>You hold</div>
                  <div className="mono">{fmtQty(held)}</div>
                  {held > 0 && (
                    <button type="button" className="btn btn--link" style={{ minHeight: 0, padding: 0 }}
                      onClick={() => setQtyText(String(Math.min(MAX_QTY, held)))}>Sell all ({fmtQty(held)})</button>
                  )}
                </div>
              )}
            </div>

            <div className="slip__line">
              <span>Price per share</span>
              <span className="mono">{money(price)}</span>
            </div>
            {stale && <p className="loss" style={{ margin: '8px 0 0', fontSize: 14 }}>This price is out of date. The trade will use it anyway.</p>}

            <div className="slip__totals mono">
              <div className="slip__total"><span>Estimated total</span><span>{money(total)}</span></div>
              <div><span>Cash after</span><span className={after < 0 ? 'loss' : ''} style={{ fontWeight: 600 }}>{cashKnown ? money(after) : '…'}</span></div>
            </div>
          </>
        )}

        {shown && (
          <div className="error-box" role="alert">
            <strong>✕ {shown.title}</strong>
            {shown.sub && <span>{shown.sub}</span>}
          </div>
        )}

        <div className="slip__actions">
          <button className="btn btn--link" type="button" onClick={tearUp}>Cancel</button>
          <button className="btn btn--stamp" onClick={place} disabled={!canTry} aria-disabled={!canTry || undefined}>
            {busy ? 'Placing…' : buy ? 'Confirm buy' : 'Confirm sell'}
          </button>
        </div>
      </div>
    </>
  );

  /* ---------------- the printed receipt ---------------- */
  let receipt = null;
  if (done) {
    const t = done.trade;
    const bought = t.side === 'BUY';
    const pnl = t.realizedPnl != null ? Number(t.realizedPnl) : null;
    const mood = bought ? 'buy' : pnl > 0.004 ? 'win' : pnl < -0.004 ? 'loss' : 'flat';
    const amount = t.amount ?? Number(t.quantity) * Number(t.price);
    receipt = (
      <>
        <div className="printer" aria-hidden="true">
          <span className="printer__led" />
          <span className="printer__slot" />
        </div>
        <div className={`feed${phase === 'filing' ? ' feed--filing' : ''}`}>
          <div className="receipt">
            <div className={`receipt__paper receipt--${mood}`} style={{ clipPath: ZIGZAG }}>
              <div className="receipt__brand">InvestMitra</div>
              <div className="receipt__tag">Practice trade</div>
              <hr className="receipt__rule" />
              <dl className="receipt__rows">
                <div><dt>Date</dt><dd>{istStamp(t.executedAt)}</dd></div>
                <div><dt>Slip no.</dt><dd>IM-{String(t.id ?? 0).padStart(6, '0')}</dd></div>
                <div><dt>Portfolio</dt><dd>{folioLabel || 'Your portfolio'}</dd></div>
              </dl>
              <hr className="receipt__rule" />
              <div className="receipt__stock">{stock.symbol}</div>
              <div className="receipt__name">{stock.name}</div>
              <dl className="receipt__rows">
                <div><dt>Quantity</dt><dd>{fmtQty(t.quantity)}</dd></div>
                <div><dt>Price</dt><dd>{money(t.price)}</dd></div>
              </dl>
              <hr className="receipt__rule receipt__rule--bold" />
              <dl className="receipt__rows receipt__rows--big">
                <div><dt>Total</dt><dd>{money(amount)}</dd></div>
                {pnl !== null && (
                  <div className={`receipt__pnl receipt__pnl--${mood}`}><dt>Realised</dt><dd>{signedMoney(pnl)}</dd></div>
                )}
                <div><dt>Cash left</dt><dd>{money(done.ownerCash)}</dd></div>
              </dl>
              <hr className="receipt__rule" />
              <p className="receipt__foot">Practice trade. No real money moved.</p>
              <p className="receipt__foot receipt__foot--small">
                {mood === 'loss' ? 'A loss, but only on paper.' : mood === 'win' ? 'A gain, locked in.' : 'Saved to your trade history.'}
              </p>
              <div className="receipt__bars" aria-hidden="true" />
              <div className={`rstamp rstamp--${mood}`} aria-hidden="true">{bought ? 'Bought' : 'Sold'}</div>
            </div>
          </div>
          {mood === 'win' && (
            <div className="fx" aria-hidden="true">
              <span className="coin">₹</span>
              {CONFETTI.map(([dx, dy, c], i) => (
                <span key={i} className="confetti" style={{ '--dx': dx, '--dy': dy, '--c': c, '--d': `${i * 30}ms` }} />
              ))}
            </div>
          )}
        </div>
        <div className="tray" aria-hidden="true"><span>Filed</span></div>
        <div className="receipt__actions">
          <button className="btn btn--stamp" onClick={fileIt} autoFocus>File it</button>
        </div>
        <p className="sr-only" role="status">
          {bought ? 'Bought' : 'Sold'} {fmtQty(t.quantity)} {stock.symbol} at {money(t.price)}. Total {money(amount)}.
          {pnl !== null ? ` Realised ${signedMoney(pnl)}.` : ''} Cash left {money(done.ownerCash)}.
        </p>
      </>
    );
  }

  const leaving = phase === 'tearing' || phase === 'filing';
  return (
    <div className={`scrim${leaving ? ` scrim--leaving scrim--${phase}` : ''}`}
      onClick={(e) => e.target === e.currentTarget && (done ? fileIt() : onClose())}>
      <div className={`stage${done ? ' stage--receipt' : ''}`} role="dialog" aria-modal="true" aria-label={done ? 'Trade receipt' : 'Order slip'}>
        {done ? receipt : (
          <div className="tear">
            <div className={`slip${shaking ? ' slip--shake' : ''}${phase === 'tearing' ? ' slip--tear-a' : ''}`}
              style={phase === 'tearing' ? { clipPath: TEAR_TOP } : undefined}>
              {sheet}
            </div>
            {phase === 'tearing' && (
              <div className="slip slip--tear-b" aria-hidden="true" style={{ clipPath: TEAR_BOTTOM }}>{sheet}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
