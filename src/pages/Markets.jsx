import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Portfolios, PriceDesk, Stocks, Watchlist } from '../api/client';
import { arrow, money, pct, qty, shortDate, signedMoney, tone } from '../format';
import useRemote from '../lib/useRemote';
import { Field, Glossary, Shimmer, Stamp, StateBlock, Term, useToast } from '../ui';
import { useApp } from './AppShell';
import './simple-markets.css';

const PAGE = 20;

/** Search the NIFTY 500. Reads stored prices only; "Get price" is the one action that may spend a price check. */
export default function Markets() {
  const { latest, openSlip, reloadTracked, isAdvisor } = useApp();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sector, setSector] = useState('');
  const [page, setPage] = useState(0);
  const [fetching, setFetching] = useState(null);
  const [watching, setWatching] = useState(new Set());
  const [open, setOpen] = useState(null);
  const [watchBusy, setWatchBusy] = useState(() => new Set());
  const watchLock = useRef(new Set());

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

  const rows = useMemo(() => list.data?.content || [], [list.data]);
  const total = list.data?.page?.totalElements ?? list.data?.totalElements ?? 0;
  const pages = list.data?.page?.totalPages ?? list.data?.totalPages ?? 0;

  // Reset the open row when its stock is no longer on the page (new page, filter or reload).
  useEffect(() => {
    if (open && list.data && !rows.some((s) => s.symbol === open)) setOpen(null);
  }, [rows, open, list.data]);

  // A shrinking result set (e.g. a narrower search) must not leave us on a page past the end.
  useEffect(() => {
    if (pages > 0 && page >= pages) setPage(pages - 1);
  }, [pages, page]);

  // One request per symbol at a time; the button is disabled while it runs and shows the server's state afterwards.
  const toggleWatch = async (s) => {
    if (watchLock.current.has(s.symbol)) return;
    watchLock.current.add(s.symbol);
    setWatchBusy(new Set(watchLock.current));
    try {
      if (watching.has(s.symbol)) {
        await Watchlist.remove(s.symbol);
        setWatching((w) => { const n = new Set(w); n.delete(s.symbol); return n; });
        toast(`${s.symbol} removed from your watchlist.`);
      } else {
        const target = s.price ? (Math.floor(s.price.close * 95) / 100).toFixed(2) : null;
        await Watchlist.save(s.symbol, target);
        setWatching((w) => new Set(w).add(s.symbol));
        toast(s.price ? `${s.symbol} added. Target set 5% under the last close.` : `${s.symbol} added. Get a price to set a target.`);
      }
    } catch (err) {
      // The change did not happen, so the button keeps showing the real state; re-sync in case the server disagrees.
      toast(err.message);
      Watchlist.list().then((res) => setWatching(new Set(res.data.map((w) => w.symbol)))).catch(() => {});
    } finally {
      watchLock.current.delete(s.symbol);
      setWatchBusy(new Set(watchLock.current));
    }
  };

  const fetchPrice = async (s) => {
    setFetching(s.symbol);
    try {
      const res = await Stocks.quote(s.symbol);
      const p = res.data;
      toast(p.source === 'ALPHA_VANTAGE'
        ? `${s.symbol} updated: ${money(p.close)}, close of ${shortDate(p.asOf)}.`
        : p.fresh ? `${s.symbol} is already up to date.` : `${s.symbol}: no new price today. Showing the last one.`);
      await Promise.all([list.reload(), quota.reload(), s.tracked ? reloadTracked() : null]);
    } catch (err) {
      toast(err.status === 503
        ? (s.tracked ? 'No price checks left today. They reset at midnight IST.' : 'Price arrives with the evening update.')
        : err.message);
    } finally {
      setFetching(null);
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Markets</h1>
        <p>Search a stock and trade at its last close.{list.data ? ` ${qty(total)} stocks.` : ''}</p>
      </div>

      {folios.data && folios.data.length === 0 && (
        <div className="hint">
          <strong>Open a folio to start.</strong>
          <p>A folio is a practice portfolio with ₹10,00,000 of pretend cash.</p>
          <div className="hint__actions">
            <Link to="/app/book" className="btn btn--ink">Open a folio</Link>
          </div>
        </div>
      )}
      {folios.data && folios.data.length > 0 && !latest && (
        <div className="hint">
          <strong>No prices yet.</strong>
          <p>{isAdvisor ? 'Press Get price on a stock, or update all tracked stocks at once.' : 'Prices arrive with the evening update.'}</p>
          {isAdvisor && <div className="hint__actions"><Link to="/app/desk" className="btn">Go to Price Desk</Link></div>}
        </div>
      )}

      <div className="filters">
        <Field label="Search" type="search" mono value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. RELIANCE, Infosys" />
        <Field as="select" label="Sector" value={sector} onChange={(e) => { setSector(e.target.value); setPage(0); }}>
          <option value="">All sectors</option>
          {(sectors.data || []).map((s) => <option key={s.sector} value={s.sector}>{s.sector}{s.stocks != null ? ` (${qty(s.stocks)})` : ''}</option>)}
        </Field>
      </div>

      {list.loading && <Shimmer />}
      {list.error && !list.loading && (
        <StateBlock error stamp="Offline" title="Prices won't load."
          action={<button className="btn" onClick={list.reload}>Try again</button>}>
          {list.error.offline ? 'The server isn’t answering. Your book is safe; we just can’t show prices right now.' : list.error.message}
        </StateBlock>
      )}
      {!list.loading && !list.error && rows.length === 0 && (
        <StateBlock title="No stock matches that."
          action={<button className="btn" onClick={() => { setQ(''); setSector(''); }}>Clear search</button>}>
          Check the spelling, not your luck. Or clear the sector filter.
        </StateBlock>
      )}

      {!list.error && rows.length > 0 && (
        <>
          <div className="srows srows--mkt" style={{ borderTop: 0 }}>
            <div className="srows__cols" aria-hidden="true">
              <span>Stock</span><span className="num">Price</span><span className="num srow__avg">You paid</span>
            </div>
          </div>
          <ul className="srows srows--mkt" style={{ borderTop: 0 }}>
            {rows.map((s) => {
              const pos = s.myPosition;
              const stale = s.price && latest && s.price.asOf < latest;
              const isOpen = open === s.symbol;
              const busy = fetching === s.symbol;
              const on = watching.has(s.symbol);
              return (
                <li key={s.symbol} className="srow srow--split">
                  <button type="button" className="srow__head" aria-expanded={isOpen} aria-controls={isOpen ? `m-${s.symbol}` : undefined}
                    onClick={() => setOpen(isOpen ? null : s.symbol)}>
                    <span>
                      <span className="ticker"><span className="srow__chev" aria-hidden="true">▸</span>{s.symbol}</span>
                      <span className="sub" style={{ display: 'block' }}>{s.name}</span>
                    </span>
                    <span className="num">{s.price ? money(s.price.close) : <span className="srow__muted">none yet</span>}</span>
                    <span className="num srow__avg">{pos ? money(pos.avgBuyPrice) : '-'}</span>
                  </button>
                  <div className="srow__act">
                    {s.price
                      ? <button className="btn btn--ink" onClick={() => openSlip({ stock: s, side: 'BUY', latest, onDone: list.reload })}>Trade</button>
                      : s.tracked
                        ? <button className="btn btn--ink" disabled={busy} onClick={() => fetchPrice(s)}>{busy ? 'Getting…' : 'Get price'}</button>
                        : <span className="srow__muted" style={{ fontSize: 13 }}>Price arrives with the evening update</span>}
                  </div>
                  {isOpen && (
                    <div className="srow__body" id={`m-${s.symbol}`}>
                      <dl className="srow__fact"><dt>Sector</dt><dd>{s.sector}</dd></dl>
                      {s.price && (
                        <dl className="srow__fact"><dt>Today</dt>
                          <dd className={tone(s.price.changePercent)}>{s.price.changePercent != null ? `${arrow(s.price.changePercent)} ${pct(s.price.changePercent)}` : '-'}</dd>
                        </dl>
                      )}
                      {s.price && (
                        <dl className="srow__fact"><dt>Price date</dt>
                          <dd>{shortDate(s.price.asOf)} {stale && <Stamp tone="loss" size="sm">Stale</Stamp>}</dd>
                        </dl>
                      )}
                      {pos && (
                        <>
                          <dl className="srow__fact"><dt>You hold</dt><dd>{qty(pos.quantity)}</dd></dl>
                          <dl className="srow__fact"><dt><Term tip="Gain or loss on shares you still hold. Becomes real only when you sell.">Gain or loss</Term></dt>
                            <dd className={tone(pos.unrealizedPnl)}>
                              {pos.unrealizedPnl != null ? signedMoney(pos.unrealizedPnl) : '-'}
                              {pos.unrealizedPnlPercent != null ? ` (${pct(pos.unrealizedPnlPercent)})` : ''}
                            </dd>
                          </dl>
                        </>
                      )}
                      <div className="srow__acts">
                        <button className={`btn${on ? ' btn--on' : ''}`} aria-pressed={on} disabled={watchBusy.has(s.symbol)} onClick={() => toggleWatch(s)}>{on ? '✓ Watching' : 'Watch'}</button>
                        {s.price && s.tracked && (
                          <button className="btn btn--link" disabled={busy} onClick={() => fetchPrice(s)}>{busy ? 'Updating…' : 'Update price'}</button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {pages > 1 && (
            <div className="pager">
              <button className="btn" disabled={page === 0} onClick={() => setPage(0)} aria-label="First page">«</button>
              <button className="btn" disabled={page === 0} onClick={() => setPage(page - 1)}>← Prev</button>
              <span>Page {qty(page + 1)} of {qty(pages)}</span>
              <button className="btn" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next →</button>
              <button className="btn" disabled={page + 1 >= pages} onClick={() => setPage(pages - 1)} aria-label="Last page">»</button>
            </div>
          )}
          <p className="fineprint">
            Get price and Update price use one daily price check{quota.data ? ` (${quota.data.remainingToday} left)` : ''}, only if no fresh close is saved.
          </p>
          <Glossary />
        </>
      )}
    </>
  );
}
