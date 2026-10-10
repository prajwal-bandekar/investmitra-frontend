import { Link, useParams } from 'react-router-dom';
import { Portfolios } from '../api/client';
import { longDate, money, pct, qty, shortDate, signedMoney, stamp as when, tone } from '../format';
import useRemote from '../lib/useRemote';
import { Glossary, Shimmer, Stamp, StateBlock, Term } from '../ui';
import { useApp } from './AppShell';

/** One folio: summary line, holdings ledger, and trade history. */
export default function Portfolio() {
  const { id } = useParams();
  const { user, latest, openSlip } = useApp();
  const detail = useRemote(() => Portfolios.get(id), [id]);
  const trades = useRemote(() => Portfolios.trades(id), [id]);
  const refresh = () => { detail.reload(); trades.reload(); };

  if (detail.error) {
    const missing = detail.error.status === 404 || detail.error.status === 403;
    return (
      <>
        <Link to="/app/book" className="btn btn--link" style={{ paddingLeft: 0 }}>← My Book</Link>
        <StateBlock error stamp={missing ? 'Not your folio' : 'Ledger jammed'}
          title={missing ? 'This folio isn’t in your book.' : 'We couldn’t open this folio.'}
          action={!missing && <button className="btn" onClick={refresh}>Try again</button>}>
          {missing ? 'It may belong to someone else, or it never existed.' : 'The pages are fine; the server isn’t.'}
        </StateBlock>
      </>
    );
  }

  const d = detail.data;
  const p = d?.portfolio;
  const holdings = d?.holdings || [];
  const rows = trades.data || [];
  const stockFor = (h) => ({ symbol: h.symbol, name: h.name, sector: h.sector, price: h.lastPrice != null ? { close: h.lastPrice, asOf: h.priceAsOf } : null });

  return (
    <>
      <Link to="/app/book" className="btn btn--link" style={{ paddingLeft: 0 }}>← My Book</Link>
      {detail.loading && <Shimmer rows={3} />}
      {p && (
        <>
          <div style={{ marginTop: 6 }}>
            <div className="muted" style={{ fontSize: 15 }}>
              {p.sector ? `${p.sector} only` : 'No sector lock'} · {p.ownerId === user.id ? `Owner: ${p.ownerName}` : `Client ${p.ownerClientId} · ${p.ownerName}`} · Opened {longDate(p.createdOn)}
            </div>
            <h1 className="display" style={{ margin: '6px 0 0', fontSize: 'clamp(36px, 5.4vw, 60px)', lineHeight: 1, letterSpacing: '-.015em' }}>{p.name}</h1>
          </div>

          <div className="summary">
            {[
              ['Invested', money(d.invested), '', 'What you paid for the shares you still hold.'],
              ['Value', money(d.currentValue), '', 'What those shares are worth at the last close.'],
              ['Unrealised', signedMoney(d.unrealizedPnl), tone(d.unrealizedPnl), 'Gain or loss on shares you still hold. Not real until you sell.'],
              ['Realised', signedMoney(d.realizedPnl), tone(d.realizedPnl), 'Gain or loss locked in by selling.'],
              ['Cash', money(d.ownerCash), '', 'Pretend cash left to spend.'],
            ].map(([label, value, cls, tip]) => (
              <div key={label}><div className="kicker"><Term tip={tip}>{label}</Term></div><div className={`v ${cls}`}>{value}</div></div>
            ))}
          </div>

          <div className="section-head">
            <h2>Holdings</h2>
            <span className="muted">{holdings.length} {holdings.length === 1 ? 'holding' : 'holdings'}, valued at the last close</span>
          </div>
          {holdings.length === 0 ? (
            <StateBlock title="Nothing in this folio yet. Even Rakesh started somewhere."
              action={<Link to="/app/markets" className="btn btn--ink">Pick your first stock</Link>}>
              Head to Markets, find a stock you know, and press Trade. Start with one share if you like.
            </StateBlock>
          ) : (
            <div className="table-wrap">
              <table className="ledger" style={{ minWidth: 980 }}>
                <thead>
                  <tr>
                    <th className="sticky">Stock</th><th className="num">Qty</th>
                    <th className="num hide-sm"><Term tip="The average price you paid per share.">Avg buy</Term></th>
                    <th className="num">Last close</th><th className="num hide-sm">Invested</th><th className="num">Value</th>
                    <th className="num"><Term tip="Gain or loss on shares you still hold. Becomes real only when you sell.">Gain or loss</Term></th>
                    <th className="num hide-sm">%</th><th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h) => (
                    <tr key={h.symbol}>
                      <td className="sticky" style={{ minWidth: 160 }}><div className="ticker">{h.symbol}</div><div className="sub">{h.name}</div></td>
                      <td className="num">{qty(h.quantity)}</td>
                      <td className="num hide-sm">{money(h.avgBuyPrice)}</td>
                      <td className="num">
                        <div>{money(h.lastPrice)}</div>
                        <div className="asof">
                          {latest && h.priceAsOf && h.priceAsOf < latest && <Stamp tone="loss" size="sm">Stale</Stamp>}
                          <span>{h.priceAsOf ? `as of ${shortDate(h.priceAsOf)}` : 'no price yet'}</span>
                        </div>
                      </td>
                      <td className="num hide-sm">{money(h.invested)}</td>
                      <td className="num">{money(h.currentValue)}</td>
                      <td className={`num ${tone(h.unrealizedPnl)}`}>{signedMoney(h.unrealizedPnl)}</td>
                      <td className={`num hide-sm ${tone(h.unrealizedPnl)}`}>{pct(h.unrealizedPnlPercent)}</td>
                      <td className="actions"><div>
                        <button className="btn btn--ink" disabled={h.lastPrice == null}
                          onClick={() => openSlip({ stock: stockFor(h), side: 'SELL', portfolioId: p.id, latest, onDone: refresh })}>Sell</button>
                        <button className="btn" disabled={h.lastPrice == null}
                          onClick={() => openSlip({ stock: stockFor(h), side: 'BUY', portfolioId: p.id, latest, onDone: refresh })}>Buy more</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="section-head" style={{ marginTop: 40 }}>
            <h2>Trade history</h2>
            <span className="muted">{rows.length} {rows.length === 1 ? 'trade' : 'trades'}, newest first</span>
          </div>
          {trades.loading && <Shimmer rows={2} />}
          {!trades.loading && rows.length === 0 && (
            <p className="italic muted" style={{ margin: 0, padding: '24px 0', borderTop: '1px solid var(--ink)', fontSize: 17 }}>
              No trades yet. The ledger is clean, and so is your conscience.
            </p>
          )}
          {rows.length > 0 && (
            <div className="table-wrap">
              <table className="ledger" style={{ minWidth: 760 }}>
                <thead>
                  <tr>
                    <th>Date</th><th>Type</th><th>Stock</th><th className="num">Qty</th>
                    <th className="num hide-sm">Price</th><th className="num">Amount</th><th className="num"><Term tip="Gain or loss locked in by selling.">Realised</Term></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => (
                    <tr key={t.id}>
                      <td className="mono" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>{when(t.executedAt)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <Stamp tone={t.side === 'SELL' ? 'filled' : 'ink'}>{t.side === 'BUY' ? 'Bought' : 'Sold'}</Stamp>
                      </td>
                      <td className="ticker">{t.symbol}</td>
                      <td className="num">{qty(t.quantity)}</td>
                      <td className="num hide-sm">{money(t.price)}</td>
                      <td className="num">{money(t.amount)}</td>
                      <td className={`num ${tone(t.realizedPnl)}`}>{t.realizedPnl != null ? signedMoney(t.realizedPnl) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Glossary />
        </>
      )}
    </>
  );
}
