import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Watchlist } from '../api/client';
import { money, shortDate } from '../format';
import useRemote from '../lib/useRemote';
import { Shimmer, Stamp, StateBlock, useToast } from '../ui';
import { useApp } from './AppShell';

/** Stocks the user is waiting on, each with an editable target price. */
export default function WatchlistPage() {
  const { latest, openSlip } = useApp();
  const toast = useToast();
  const list = useRemote(() => Watchlist.list(), []);
  const [targets, setTargets] = useState({});

  useEffect(() => {
    if (list.data) {
      setTargets(Object.fromEntries(list.data.map((w) => [w.symbol, w.targetPrice != null ? Number(w.targetPrice).toFixed(2) : ''])));
    }
  }, [list.data]);

  const items = list.data || [];

  const saveTarget = async (w) => {
    const text = targets[w.symbol] ?? '';
    const value = text === '' ? null : Number(text);
    if (value !== null && !(value > 0)) { toast('A target needs to be a price above zero.'); return; }
    if (value === (w.targetPrice != null ? Number(w.targetPrice) : null)) return;
    try {
      await Watchlist.save(w.symbol, value);
      list.reload();
    } catch (err) {
      toast(err.message);
    }
  };

  const remove = async (w) => {
    try {
      await Watchlist.remove(w.symbol);
      toast(`${w.symbol} off the watchlist.`);
      list.reload();
    } catch (err) {
      toast(err.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <div className="kicker">Watchlist · {items.length} {items.length === 1 ? 'stock' : 'stocks'}</div>
        <h1>Waiting for a dip.</h1>
        <p>Set a target price. When a close lands at or below it, we stamp it Target hit.</p>
      </div>

      {list.loading && <Shimmer rows={4} />}
      {list.error && (
        <StateBlock error stamp="Wire down" title="Can't check your targets right now."
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
        <div className="table-wrap" style={{ marginTop: 18 }}>
          <table className="ledger" style={{ minWidth: 860 }}>
            <thead>
              <tr>
                <th className="sticky">Stock</th><th className="num">Last close</th><th className="num">Your target</th>
                <th className="num">Distance</th><th>Status</th><th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((w) => {
                const close = w.price ? Number(w.price.close) : null;
                const target = w.targetPrice != null ? Number(w.targetPrice) : null;
                const gap = close != null && target ? close - target : null;
                return (
                  <tr key={w.symbol}>
                    <td className="sticky" style={{ minWidth: 150, verticalAlign: 'middle' }}>
                      <div className="ticker">{w.symbol}</div><div className="sub">{w.name}</div>
                    </td>
                    <td className="num" style={{ verticalAlign: 'middle' }}>
                      {w.price ? (
                        <>
                          <div style={{ fontSize: 16, fontWeight: 500 }}>{money(w.price.close)}</div>
                          <div className="asof">
                            {latest && w.price.asOf < latest && <Stamp tone="loss" size="sm">Stale</Stamp>}
                            <span>as of {shortDate(w.price.asOf)}</span>
                          </div>
                        </>
                      ) : <span className="italic muted" style={{ fontFamily: 'var(--serif)' }}>no price yet</span>}
                    </td>
                    <td className="num" style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                      <input className="field__input field__input--mono" style={{ width: 120, textAlign: 'right', fontSize: 15 }}
                        inputMode="decimal" aria-label={`Target price for ${w.name}`}
                        value={targets[w.symbol] ?? ''}
                        onChange={(e) => setTargets({ ...targets, [w.symbol]: e.target.value.replace(/[^\d.]/g, '') })}
                        onBlur={() => saveTarget(w)}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
                    </td>
                    <td className="num" style={{ fontSize: 14, verticalAlign: 'middle' }}>
                      {gap === null ? '-' : w.targetReached ? (Math.abs(gap) < 0.005 ? 'Bang on target' : `${money(-gap)} below`) : `${money(gap)} to go`}
                    </td>
                    <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      {w.targetReached
                        ? <Stamp tone="filled" tilt={-4} className="thump">Target hit</Stamp>
                        : <span className="waiting">Waiting for the price to drop</span>}
                    </td>
                    <td className="actions" style={{ verticalAlign: 'middle' }}><div>
                      {w.price && (
                        <button className="btn btn--ink" onClick={() => openSlip({
                          stock: { symbol: w.symbol, name: w.name, sector: w.sector, price: w.price }, side: 'BUY', latest,
                        })}>Trade</button>
                      )}
                      <button className="btn btn--link" onClick={() => remove(w)}>Remove</button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
