import { useEffect, useState } from 'react';
import { PriceDesk } from '../api/client';
import { getAdminKey, setAdminKey } from '../api/access';
import { stamp as when } from '../format';
import useRemote from '../lib/useRemote';
import { Field, Shimmer, Stamp, useToast } from '../ui';
import { useApp } from './AppShell';
import './simple-markets.css';

const STATUS = {
  SUCCESS: ['Done', 'gain'],
  PARTIAL: ['Partial', 'filled'],
  FAILED: ['Failed', 'loss'],
  RUNNING: ['Running', 'ink'],
};
const TRIGGER = { SCHEDULED: 'Scheduled', MANUAL: 'Manual', ON_DEMAND: 'Single stock' };

/** Admin page for the daily price-check quota and the price update job. */
export default function Desk() {
  const { tracked, reloadTracked } = useApp();
  const toast = useToast();
  const quota = useRemote(() => PriceDesk.quota(), []);
  const runs = useRemote(() => PriceDesk.runs(), []);
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState(null);
  const [adminKey, setKey] = useState('');
  const denied = quota.error?.status === 403 || runs.error?.status === 403;

  const saveAdminKey = (e) => {
    e.preventDefault();
    if (!adminKey.trim()) return;
    setAdminKey(adminKey);
    setKey('');
    Promise.all([quota.reload(), runs.reload()]);
  };

  const budget = quota.data?.dailyBudget ?? 24;
  const left = quota.data?.remainingToday ?? 0;
  const short = quota.data && left < tracked.length;

  const run = async () => {
    setRunning(true);
    try {
      const res = await PriceDesk.run();
      const r = res.data;
      toast(r.status === 'SUCCESS'
        ? (r.callsMade ? `Prices updated: ${r.pricesSaved} saved.` : 'Every price was already up to date.')
        : r.status === 'PARTIAL' ? `Partly updated: ${r.pricesSaved} saved. See the notes in the log.` : `Update failed: ${r.notes || 'no details'}`);
      await Promise.all([quota.reload(), runs.reload(), reloadTracked()]);
    } catch (err) {
      if (err.status === 403) { quota.reload(); runs.reload(); return; }
      toast(err.status === 409 ? 'An update is already running. Give it a minute.' : err.message);
    } finally {
      setRunning(false);
    }
  };

  const log = runs.data || [];
  useEffect(() => {
    if (open !== null && runs.data && !runs.data.some((r) => r.id === open)) setOpen(null);
  }, [runs.data, open]);

  return (
    <>
      <div className="page-head">
        <h1>Price Desk</h1>
        <p>Each tracked stock uses one price check. You get {budget} a day.</p>
      </div>

      {denied && (
        <form onSubmit={saveAdminKey} style={{ display: 'grid', gap: 12, maxWidth: 420, margin: '0 0 28px' }}>
          <Field strong label="Admin key" type="password" value={adminKey} autoComplete="off"
            onChange={(e) => setKey(e.target.value)}
            error={getAdminKey() ? 'That admin key was not accepted.' : undefined} />
          <button type="submit" className="btn btn--primary">Save and retry</button>
        </form>
      )}

      <div className="desk-simple">
        <div>
          <p className="desk-simple__line">
            {quota.data ? <><span className="mono">{left}</span> of {budget} price checks left today</> : quota.error ? 'Price checks unavailable' : '…'}
          </p>
          <p className="desk-simple__note">Resets at midnight IST.</p>
          {short && <p className="loss desk-simple__note">Not enough checks for all {tracked.length} tracked stocks. Some will be skipped.</p>}
        </div>
        <button className="btn btn--stamp" onClick={run} disabled={running}>
          {running ? 'Updating…' : 'Run price update'}
        </button>
      </div>

      <div className="section-head" style={{ marginTop: 32 }}>
        <h2>Price update log</h2>
      </div>
      {(runs.loading || running) && <Shimmer rows={3} />}
      {runs.error && (
        <p role="alert" className="loss" style={{ margin: 0, padding: '24px 0', borderTop: '1px solid var(--ink)' }}>
          ✕ The log won't load.{' '}
          <button className="btn btn--link" style={{ minHeight: 0, color: 'inherit' }} onClick={runs.reload}>Try again</button>
        </p>
      )}
      {!runs.loading && !runs.error && log.length === 0 && (
        <p className="italic muted" style={{ margin: 0, padding: '24px 0', borderTop: '1px solid var(--ink)' }}>
          Nothing here yet. The first price update fills this in.
        </p>
      )}
      {log.length > 0 && (
        <div>
          <div className="srows srows--desk" style={{ borderTop: 0 }}>
            <div className="srows__cols" aria-hidden="true"><span>When</span><span>Status</span><span className="num">Saved</span></div>
          </div>
          <ul className="srows srows--desk" style={{ borderTop: 0 }}>
            {log.map((r) => {
              const [label, stampTone] = STATUS[r.status] || [r.status, 'ink'];
              const isOpen = open === r.id;
              return (
                <li key={r.id} className="srow">
                  <button type="button" className="srow__head" aria-expanded={isOpen} aria-controls={isOpen ? `r-${r.id}` : undefined}
                    onClick={() => setOpen(isOpen ? null : r.id)}>
                    <span className="mono" style={{ fontSize: 14 }}><span className="srow__chev" aria-hidden="true">▸</span>{when(r.startedAt)}</span>
                    <span><Stamp tone={stampTone}>{label}</Stamp></span>
                    <span className="num">{r.pricesSaved}</span>
                  </button>
                  {isOpen && (
                    <div className="srow__body" id={`r-${r.id}`}>
                      <dl className="srow__fact"><dt>Started by</dt><dd>{TRIGGER[r.trigger] || r.trigger}</dd></dl>
                      <dl className="srow__fact"><dt>Price checks used</dt><dd>{r.callsMade}</dd></dl>
                      <dl className="srow__fact" style={{ flex: '1 1 260px' }}><dt>Notes</dt><dd>{r.notes || '-'}</dd></dl>
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
