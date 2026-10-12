import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Watchlist } from '../api/client';
import { money, shortDate } from '../format';
import useRemote from '../lib/useRemote';
import { Shimmer, Stamp, StateBlock, useToast } from '../ui';
import { useApp } from './AppShell';
import './simple-markets.css';

const TARGET_RE = /^\d{1,12}(\.\d{1,2})?$/;
const stored = (w) => (w.targetPrice != null ? Number(w.targetPrice).toFixed(2) : '');

/** Stocks the user is waiting on, each with an editable target price. */
export default function WatchlistPage() {
  const { latest, openSlip } = useApp();
  const toast = useToast();
  const list = useRemote(() => Watchlist.list(), []);
  const [targets, setTargets] = useState({});
  const [open, setOpen] = useState(null);

  const edited = useRef(new Set()); // symbols with a half-typed target that a reload must not wipe

  // Merge stored targets in; keep any row the user is still editing, and forget rows that are gone.
  useEffect(() => {
    if (!list.data) return;
    setTargets((prev) => Object.fromEntries(list.data.map((w) => [
      w.symbol,
      edited.current.has(w.symbol) && w.symbol in prev ? prev[w.symbol] : stored(w),
    ])));
    const symbols = new Set(list.data.map((w) => w.symbol));
    edited.current.forEach((s) => { if (!symbols.has(s)) edited.current.delete(s); });
    setOpen((o) => (o && !symbols.has(o) ? null : o));
  }, [list.data]);

  const items = list.data || [];

  const revert = (w) => {
    edited.current.delete(w.symbol);
    setTargets((t) => ({ ...t, [w.symbol]: stored(w) }));
  };

  const saveTarget = async (w) => {
    const text = targets[w.symbol] ?? '';
    const value = text === '' ? null : Number(text);
    if (value !== null && !(value > 0 && TARGET_RE.test(text))) {
      toast('A target needs to be a price above zero, with up to 2 decimals.');
      revert(w);
      return;
    }
    if (value === (w.targetPrice != null ? Number(w.targetPrice) : null)) { revert(w); return; }
    try {
      await Watchlist.save(w.symbol, value);
      edited.current.delete(w.symbol);
      list.reload();
    } catch (err) {
      toast(err.message);
    }
  };

  const typeTarget = (w, raw) => {
    const text = raw.replace(/[^\d.]/g, '');
    if (!/^\d{0,12}(\.\d{0,2})?$/.test(text)) return; // ignore keystrokes that break the format
    edited.current.add(w.symbol);
    setTargets((t) => ({ ...t, [w.symbol]: text }));
  };

  const remove = async (w) => {
    try {
      await Watchlist.remove(w.symbol);
      toast(`${w.symbol} removed from your watchlist.`);
      setOpen(null);
      list.reload();
    } catch (err) {
      toast(err.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Watchlist</h1>
        <p>Set a target price. When a close reaches it, the stock is marked Target hit.</p>
      </div>

      {list.loading && <Shimmer rows={4} />}
      {list.error && (
        <StateBlock error stamp="Offline" title="Can't check your targets right now."
          action={<button className="btn" onClick={list.reload}>Try again</button>}>
          Your watchlist is saved. The prices just aren't coming through.
        </StateBlock>
      )}
      {!list.loading && !list.error && items.length === 0 && (
        <StateBlock plain title="Nothing on your watchlist."
          action={<Link to="/app/markets" className="btn btn--ink">Go to Markets</Link>}>
          Window-shopping is free. Go to Markets and hit Watch on anything you fancy.
        </StateBlock>
      )}

      {items.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div className="srows srows--wl" style={{ borderTop: 0 }}>
            <div className="srows__cols" aria-hidden="true">
              <span>Stock</span><span className="num">Last close</span><span className="num srow__tgt">Target</span><span className="srow__status">Status</span>
            </div>
          </div>
          <ul className="srows srows--wl" style={{ borderTop: 0 }}>
            {items.map((w) => {
              const close = w.price ? Number(w.price.close) : null;
              const target = w.targetPrice != null ? Number(w.targetPrice) : null;
              const gap = close != null && target ? close - target : null;
              const isOpen = open === w.symbol;
              return (
                <li key={w.symbol} className="srow">
                  <button type="button" className="srow__head" aria-expanded={isOpen} aria-controls={isOpen ? `w-${w.symbol}` : undefined}
                    onClick={() => setOpen(isOpen ? null : w.symbol)}>
                    <span>
                      <span className="ticker"><span className="srow__chev" aria-hidden="true">▸</span>{w.symbol}</span>
                      <span className="sub" style={{ display: 'block' }}>{w.name}</span>
                    </span>
                    <span className="num">{w.price ? money(w.price.close) : <span className="srow__muted">none yet</span>}</span>
                    <span className="num srow__tgt">{target != null ? money(target) : '-'}</span>
                    <span className="srow__status" style={{ whiteSpace: 'nowrap' }}>
                      {w.targetReached
                        ? <Stamp tone="filled" tilt={-4} className="thump">Target hit</Stamp>
                        : <span className="waiting">Waiting</span>}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="srow__body" id={`w-${w.symbol}`}>
                      <label className="srow__fact">
                        <span className="srow__label">Your target</span>
                        <input className="field__input field__input--mono" style={{ width: 130, fontSize: 15 }}
                          inputMode="decimal"
                          value={targets[w.symbol] ?? ''}
                          onChange={(e) => typeTarget(w, e.target.value)}
                          onBlur={() => saveTarget(w)}
                          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
                      </label>
                      <dl className="srow__fact"><dt>Distance</dt>
                        <dd>{gap === null ? '-' : w.targetReached ? (Math.abs(gap) < 0.005 ? 'Right on target' : `${money(-gap)} below`) : `${money(gap)} to go`}</dd>
                      </dl>
                      {w.price && (
                        <dl className="srow__fact"><dt>Price date</dt>
                          <dd>{shortDate(w.price.asOf)} {latest && w.price.asOf < latest && <Stamp tone="loss" size="sm">Stale</Stamp>}</dd>
                        </dl>
                      )}
                      <div className="srow__acts">
                        {w.price && (
                          <button className="btn btn--ink" onClick={() => openSlip({
                            stock: { symbol: w.symbol, name: w.name, sector: w.sector, price: w.price }, side: 'BUY', latest,
                          })}>Trade</button>
                        )}
                        <button className="btn btn--link" onClick={() => remove(w)}>Remove</button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
