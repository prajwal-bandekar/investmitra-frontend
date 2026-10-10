import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Portfolios, PriceDesk, Stocks, Watchlist } from '../api/client';
import { arrow, money, pct, qty, shortDate, signedMoney, tone } from '../format';
import useRemote from '../lib/useRemote';
import { Field, Glossary, Shimmer, Stamp, StateBlock, Term, useToast } from '../ui';
import { useApp } from './AppShell';

const PAGE = 20;

/** Search the NIFTY 500. Reads stored prices only; "Fetch price" is the one action that may spend an API call. */
export default function Markets() {
  const { latest, openSlip, reloadTracked } = useApp();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sector, setSector] = useState('');
  const [page, setPage] = useState(0);
  const [fetching, setFetching] = useState(null);
  const [watching, setWatching] = useState(new Set());

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(q.trim()); setPage(0); }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const sectors = useRemote(() => Stocks.sectors(), []);
  const list = useRemote(() => Stocks.search({ query: debounced, sector, page, size: PAGE }), [debounced, sector, page]);
  const quota = useRemote(() => PriceDesk.quota(), []);
  const folios = useRemote(() => Portfolios.list(), []);

  useEffect(() => {
    Watchlist.list().then((res) => setWatching(new Set(res.data.map((w) => w.symbol)))).catch(() => {});
  }, []);

  const rows = list.data?.content || [];
  const total = list.data?.page?.totalElements ?? list.data?.totalElements ?? 0;
  const pages = list.data?.page?.totalPages ?? list.data?.totalPages ?? 0;

  const toggleWatch = async (s) => {
    try {
      if (watching.has(s.symbol)) {
        await Watchlist.remove(s.symbol);
        setWatching((w) => { const n = new Set(w); n.delete(s.symbol); return n; });
        toast(`${s.symbol} off the watchlist.`);
      } else {
        const target = s.price ? (Math.floor(s.price.close * 95) / 100).toFixed(2) : null;
        await Watchlist.save(s.symbol, target);
        setWatching((w) => new Set(w).add(s.symbol));
        toast(s.price ? `${s.symbol} on the watchlist. Target set 5% under the last close.` : `${s.symbol} on the watchlist. Fetch a price to set a target.`);
      }
    } catch (err) {
      toast(err.message);
    }
  };

  const fetchPrice = async (s) => {
    setFetching(s.symbol);
    try {
      const res = await Stocks.quote(s.symbol);
      const p = res.data;
      toast(p.source === 'ALPHA_VANTAGE'
        ? `${s.symbol} is on the wire: ${money(p.close)}, close of ${shortDate(p.asOf)}.`
        : p.fresh ? `${s.symbol} was already up to date. No wire spent.` : `${s.symbol}: no fresh price today. Showing the last one on file.`);
      await Promise.all([list.reload(), quota.reload(), s.tracked ? reloadTracked() : null]);
    } catch (err) {
      toast(err.status === 503 ? 'Out of wires for today, boss. Quota resets at 05:30 IST.' : err.message);
    } finally {
      setFetching(null);
    }
  };

  return (
    <>
      <div className="page-head">
        <div className="kicker">Markets · {list.data ? `${qty(total)} stocks` : '…'}</div>
        <h1>The NIFTY 500, by close.</h1>
        <p>Search a name, pick a sector, trade at the last close. Anything older than the latest close wears a Stale stamp.</p>
      </div>

      {folios.data && folios.data.length === 0 && (
        <div className="hint">
          <strong>New here? Open a folio, then buy your first share.</strong>
          <p>A folio is a pretend portfolio. You start with ₹10,00,000 of pretend cash, and nothing here is real money.</p>
          <div className="hint__actions">
            <Link to="/app/book" className="btn btn--ink">Open a folio</Link>
            <span className="muted">Then pick a stock below and press Trade.</span>
          </div>
        </div>
      )}
      {!latest && (
        <div className="hint">
          <strong>No prices on file yet.</strong>
          <p>Stocks show a Trade button once they have a price. Press Get price on any stock to fetch one (it uses one wire from today's quota), or run the morning wire for all tracked stocks at once.</p>
          <div className="hint__actions"><Link to="/app/desk" className="btn">Go to the Price Desk</Link></div>
        </div>
      )}

      <div className="filters">
        <Field label="Search ticker or company" type="search" mono value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. RELIANCE, Infosys" />
        <Field as="select" label="Sector" value={sector} onChange={(e) => { setSector(e.target.value); setPage(0); }}>
          <option value="">All sectors</option>
          {(sectors.data || []).map((s) => <option key={s.sector} value={s.sector}>{s.sector}</option>)}
        </Field>
      </div>

      {list.loading && <Shimmer />}
      {list.error && !list.loading && (
        <StateBlock error stamp="Wire down" title="The wire's gone quiet."
          action={<button className="btn" onClick={list.reload}>Try the wire again</button>}>
          {list.error.offline ? 'The server isn’t answering. Your book is safe; we just can’t show prices right now.' : list.error.message}
        </StateBlock>
      )}
      {!list.loading && !list.error && rows.length === 0 && (
        <StateBlock title="No stock by that name on the NIFTY 500."
          action={<button className="btn" onClick={() => { setQ(''); setSector(''); }}>Clear search</button>}>
          Check the spelling, not your luck. Or clear the sector filter.
        </StateBlock>
      )}

      {!list.error && rows.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="ledger" style={{ minWidth: 1100 }}>
              <thead>
                <tr>
                  <th className="sticky">Stock</th><th className="hide-sm">Sector</th>
                  <th className="num">Last close</th><th className="num">Today</th>
                  <th className="num">You hold</th>
                  <th className="num hide-sm"><Term tip="The average price you paid per share.">Avg buy</Term></th>
                  <th className="num"><Term tip="Gain or loss on shares you still hold. Becomes real only when you sell.">Gain or loss</Term></th>
                  <th className="num hide-sm">%</th>
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const pos = s.myPosition;
                  const stale = s.price && latest && s.price.asOf < latest;
                  return (
                    <tr key={s.symbol}>
                      <td className="sticky" style={{ minWidth: 170, maxWidth: 220 }}>
                        <div className="ticker">{s.symbol}</div><div className="sub">{s.name}</div>
                      </td>
                      <td className="hide-sm" style={{ fontSize: 15 }}>{s.sector}</td>
                      <td className="num">
                        {s.price ? (
                          <>
                            <div style={{ fontSize: 16, fontWeight: 500 }}>{money(s.price.close)}</div>
                            <div className="asof">
                              {stale && <Stamp tone="loss" size="sm">Stale</Stamp>}
                              <span>as of {shortDate(s.price.asOf)}</span>
                            </div>
                          </>
                        ) : <span className="italic muted" style={{ fontFamily: 'var(--serif)' }}>no price yet</span>}
                      </td>
                      <td className={`num ${tone(s.price?.changePercent)}`}>
                        {s.price?.changePercent != null ? `${arrow(s.price.changePercent)} ${pct(s.price.changePercent)}` : '-'}
                      </td>
                      <td className="num">{pos ? qty(pos.quantity) : '-'}</td>
                      <td className="num hide-sm">{pos ? money(pos.avgBuyPrice) : '-'}</td>
                      <td className={`num ${tone(pos?.unrealizedPnl)}`}>{pos?.unrealizedPnl != null ? signedMoney(pos.unrealizedPnl) : '-'}</td>
                      <td className={`num hide-sm ${tone(pos?.unrealizedPnl)}`}>{pos?.unrealizedPnlPercent != null ? pct(pos.unrealizedPnlPercent) : '-'}</td>
                      <td className="actions">
                        <div>
                          {s.price
                            ? <button className="btn btn--ink" onClick={() => openSlip({ stock: s, side: 'BUY', latest, onDone: list.reload })}>Trade</button>
                            : <button className="btn btn--ink" disabled={fetching === s.symbol} onClick={() => fetchPrice(s)}>{fetching === s.symbol ? 'Fetching…' : 'Get price'}</button>}
                          <button className={`btn${watching.has(s.symbol) ? ' btn--on' : ''}`} aria-pressed={watching.has(s.symbol)}
                            onClick={() => toggleWatch(s)}>{watching.has(s.symbol) ? '✓ Watching' : 'Watch'}</button>
                          {s.price && (
                            <button className="btn btn--link" disabled={fetching === s.symbol} onClick={() => fetchPrice(s)}>
                              {fetching === s.symbol ? 'On the wire…' : 'Refresh'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="pager">
              <button className="btn" disabled={page === 0} onClick={() => setPage(page - 1)}>← Prev</button>
              <span>Page {page + 1} of {pages}</span>
              <button className="btn" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next →</button>
            </div>
          )}
          <p className="fineprint">
            Get price and Refresh spend one wire from today's Alpha Vantage quota
            {quota.data ? ` (${quota.data.remainingToday} left)` : ''}, and only if no fresh close is on file.
          </p>
          <Glossary />
        </>
      )}
    </>
  );
}
