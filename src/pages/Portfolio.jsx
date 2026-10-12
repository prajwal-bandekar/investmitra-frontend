import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Portfolios } from '../api/client';
import { longDate, money, pct, qty, shortDate, signedMoney, stamp as when, tone } from '../format';
import useRemote from '../lib/useRemote';
import { Glossary, Shimmer, Stamp, StateBlock, Term } from '../ui';
import { useApp } from './AppShell';
import './simple-portfolio.css';

/** One portfolio: value and gain/loss up top, simple holdings rows that expand, trade history on demand. */
export default function Portfolio() {
  const { id } = useParams();
  const { user, latest, openSlip } = useApp();
  const detail = useRemote(() => Portfolios.get(id), [id]);
  const trades = useRemote(() => Portfolios.trades(id), [id]);
  const [openH, setOpenH] = useState({});
  const [openT, setOpenT] = useState({});
  const [showTrades, setShowTrades] = useState(false);
  const refresh = () => { detail.reload(); trades.reload(); };
  const flip = (setter, key) => setter((o) => ({ ...o, [key]: !o[key] }));

  // Forget expanded rows whose holding or trade has gone after a reload.
  useEffect(() => {
    if (!detail.data) return;
    const keep = new Set((detail.data.holdings || []).map((h) => h.symbol));
    setOpenH((o) => (Object.keys(o).every((k) => keep.has(k)) ? o : Object.fromEntries(Object.entries(o).filter(([k]) => keep.has(k)))));
  }, [detail.data]);
  useEffect(() => {
    if (!trades.data) return;
    const keep = new Set(trades.data.map((t) => String(t.id)));
    setOpenT((o) => (Object.keys(o).every((k) => keep.has(k)) ? o : Object.fromEntries(Object.entries(o).filter(([k]) => keep.has(k)))));
  }, [trades.data]);

  if (detail.error) {
    const missing = detail.error.status === 404 || detail.error.status === 403;
    return (
      <>
        <Link to="/app/book" className="btn btn--link sp-back">← My portfolios</Link>
        <StateBlock error stamp={missing ? 'Not yours' : 'Ledger jammed'}
          title={missing ? 'This portfolio isn’t in your list.' : 'We couldn’t open this portfolio.'}
          action={!missing && <button className="btn" onClick={refresh}>Try again</button>}>
          {missing ? 'It may belong to someone else, or it never existed.' : 'The server hiccuped. Give it a second.'}
        </StateBlock>
      </>
    );
  }

  const d = detail.data;
  const p = d?.portfolio;
  const holdings = d?.holdings || [];
  const rows = trades.data || [];
  const stockFor = (h) => ({ symbol: h.symbol, name: h.name, sector: h.sector, price: h.lastPrice != null ? { close: h.lastPrice, asOf: h.priceAsOf } : null });
  const total = d ? Number(d.unrealizedPnl ?? 0) + Number(d.realizedPnl ?? 0) : 0;

  return (
    <>
      <Link to="/app/book" className="btn btn--link sp-back">← My portfolios</Link>
      {detail.loading && <Shimmer rows={3} />}
      {!detail.loading && !p && (
        <StateBlock title="This portfolio came back empty."
          action={<button className="btn" onClick={refresh}>Try again</button>}>
          The server didn’t send any details for it. Try again, or head back to your list.
        </StateBlock>
      )}
      {p && (
        <>
          <h1 className="display sp-title">{p.name}</h1>
          <div className="sp-sub">
            {p.ownerId === user.id ? 'Opened' : `${p.ownerName} (${p.ownerClientId}) · Opened`} {longDate(p.createdOn)}
            {p.sector && ` · ${p.sector} only`}
          </div>

          <div className="sp-hero">
            <div className="sp-hero__label"><Term tip="What your shares are worth at the last close.">Current value</Term></div>
            <div className="sp-hero__big">{money(d.currentValue)}</div>
            <div className={`sp-hero__pnl ${tone(total)}`}>{signedMoney(total)} total gain/loss</div>
          </div>
          <div className="sp-meta">
            <span><Term tip="What you paid for the shares you still hold.">Invested</Term> <b>{money(d.invested)}</b></span>
            <span><Term tip="Gain or loss locked in by selling.">Realised</Term> <b className={tone(d.realizedPnl)}>{signedMoney(d.realizedPnl)}</b></span>
            <span><Term tip="Pretend cash left to spend.">Cash</Term> <b>{money(d.ownerCash)}</b></span>
          </div>

          <div className="sp-section"><h2>Holdings</h2></div>
          {holdings.length === 0 ? (
            <StateBlock title="Nothing here yet. Even Rakesh started somewhere."
              action={<Link to="/app/markets" className="btn btn--ink">Pick a stock</Link>}>
              Find a stock in Markets and press Trade. One share is fine.
            </StateBlock>
          ) : (
            <div className="sp-rows">
              <div className="sp-colhead sp-row__btn--hold" aria-hidden="true">
                <span>Stock</span><span className="num hide-sm">Qty</span><span className="num">Value</span>
                <span className="num">Gain/loss</span><span />
              </div>
              {holdings.map((h) => {
                const isOpen = !!openH[h.symbol];
                const panel = `hold-${h.symbol}`;
                const stale = latest && h.priceAsOf && h.priceAsOf < latest;
                return (
                  <div className="sp-row" key={h.symbol}>
                    <button type="button" className="sp-row__btn sp-row__btn--hold" aria-expanded={isOpen} aria-controls={isOpen ? panel : undefined}
                      onClick={() => flip(setOpenH, h.symbol)}>
                      <span style={{ minWidth: 0 }}><span className="ticker">{h.symbol}</span><span className="sub" style={{ display: 'block' }}>{h.name}</span></span>
                      <span className="num hide-sm">{qty(h.quantity)}</span>
                      <span className="num">{money(h.currentValue)}</span>
                      <span className={`num ${tone(h.unrealizedPnl)}`}>{signedMoney(h.unrealizedPnl)}</span>
                      <span className="chev" aria-hidden="true">›</span>
                    </button>
                    {isOpen && (
                      <dl className="sp-detail" id={panel}>
                        <div><dt>Shares</dt><dd>{qty(h.quantity)}</dd></div>
                        <div><dt><Term tip="The average price you paid per share.">Avg buy price</Term></dt><dd>{money(h.avgBuyPrice)}</dd></div>
                        <div>
                          <dt><Term tip="The price at the end of the last trading day.">Last close</Term></dt>
                          <dd>{money(h.lastPrice)}</dd>
                          <div className="asof">
                            {stale && <Stamp tone="loss" size="sm">Stale</Stamp>}
                            <span>{h.priceAsOf ? `as of ${shortDate(h.priceAsOf)}` : 'no price yet'}</span>
                          </div>
                        </div>
                        <div><dt>Invested</dt><dd>{money(h.invested)}</dd></div>
                        <div><dt>Return</dt><dd className={tone(h.unrealizedPnl)}>{pct(h.unrealizedPnlPercent)}</dd></div>
                        <div className="sp-detail__act">
                          <button className="btn btn--ink" disabled={h.lastPrice == null}
                            onClick={() => openSlip({ stock: stockFor(h), side: 'SELL', portfolioId: p.id, latest, onDone: refresh })}>Sell</button>
                          <button className="btn" disabled={h.lastPrice == null}
                            onClick={() => openSlip({ stock: stockFor(h), side: 'BUY', portfolioId: p.id, latest, onDone: refresh })}>Buy more</button>
                        </div>
                      </dl>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="sp-section">
            <h2>Trade history</h2>
            {rows.length > 0 && (
              <button type="button" className="btn btn--link" aria-expanded={showTrades} aria-controls={showTrades ? 'trade-list' : undefined}
                onClick={() => setShowTrades((s) => !s)}>
                {showTrades ? 'Hide trade history' : `Show trade history (${rows.length})`}
              </button>
            )}
          </div>
          {trades.loading && <Shimmer rows={2} />}
          {!trades.loading && trades.error && (
            <StateBlock error stamp="Ledger jammed" title="We couldn’t load your trades."
              action={<button className="btn" onClick={trades.reload}>Try again</button>}>
              The server hiccuped. Give it a second.
            </StateBlock>
          )}
          {!trades.loading && !trades.error && rows.length === 0 && (
            <p className="italic muted sp-empty">No trades yet. The ledger is clean.</p>
          )}
          {showTrades && rows.length > 0 && (
            <div className="sp-rows" id="trade-list">
              <div className="sp-colhead sp-row__btn--trade" aria-hidden="true">
                <span>Date</span><span>Type</span><span>Stock</span><span className="num">Amount</span><span />
              </div>
              {rows.map((t) => {
                const isOpen = !!openT[t.id];
                const panel = `trade-${t.id}`;
                return (
                  <div className="sp-row" key={t.id}>
                    <button type="button" className="sp-row__btn sp-row__btn--trade" aria-expanded={isOpen} aria-controls={isOpen ? panel : undefined}
                      onClick={() => flip(setOpenT, t.id)}>
                      <span className="mono" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>{when(t.executedAt).split(',')[0]}</span>
                      <span><Stamp tone={t.side === 'SELL' ? 'filled' : 'ink'}>{t.side === 'BUY' ? 'Bought' : 'Sold'}</Stamp></span>
                      <span className="ticker">{t.symbol}</span>
                      <span className="num">{money(t.amount)}</span>
                      <span className="chev" aria-hidden="true">›</span>
                    </button>
                    {isOpen && (
                      <dl className="sp-detail" id={panel}>
                        <div><dt>Time</dt><dd>{when(t.executedAt)}</dd></div>
                        <div><dt>Shares</dt><dd>{qty(t.quantity)}</dd></div>
                        <div><dt>Price</dt><dd>{money(t.price)}</dd></div>
                        {t.realizedPnl != null && (
                          <div><dt><Term tip="Gain or loss locked in by selling.">Realised</Term></dt><dd className={tone(t.realizedPnl)}>{signedMoney(t.realizedPnl)}</dd></div>
                        )}
                      </dl>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <Glossary />
        </>
      )}
    </>
  );
}
