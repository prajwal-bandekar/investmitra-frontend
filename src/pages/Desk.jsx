import { useState } from 'react';
import { PriceDesk } from '../api/client';
import { stamp as when } from '../format';
import useRemote from '../lib/useRemote';
import { Shimmer, Stamp, useToast } from '../ui';
import { useApp } from './AppShell';

const STATUS = {
  SUCCESS: ['Filed', 'gain'],
  PARTIAL: ['Partial', 'filled'],
  FAILED: ['Failed', 'loss'],
  RUNNING: ['Running', 'ink'],
};
const TRIGGER = { SCHEDULED: 'Morning wire', MANUAL: 'Manual run', ON_DEMAND: 'Fetch price' };

/** Admin page for the Alpha Vantage quota and the daily price job. */
export default function Desk() {
  const { tracked, reloadTracked } = useApp();
  const toast = useToast();
  const quota = useRemote(() => PriceDesk.quota(), []);
  const runs = useRemote(() => PriceDesk.runs(), []);
  const [running, setRunning] = useState(false);

  const budget = quota.data?.dailyBudget ?? 24;
  const left = quota.data?.remainingToday ?? 0;
  const short = quota.data && left < tracked.length;

  const run = async () => {
    setRunning(true);
    try {
      const res = await PriceDesk.run();
      const r = res.data;
      toast(r.status === 'SUCCESS'
        ? (r.callsMade ? `Wire filed: ${r.pricesSaved} prices saved.` : 'Every price was already fresh. No wires spent.')
        : r.status === 'PARTIAL' ? `Filed partial: ${r.pricesSaved} saved. Check the notes.` : `Run failed: ${r.notes || 'no details'}`);
      await Promise.all([quota.reload(), runs.reload(), reloadTracked()]);
    } catch (err) {
      toast(err.status === 409 ? 'A run is already on the wire. Give it a minute.' : err.message);
    } finally {
      setRunning(false);
    }
  };

  const log = runs.data || [];

  return (
    <>
      <div className="page-head">
        <div className="kicker">Price Desk · Admin · Wire service</div>
        <h1>The morning wire.</h1>
        <p>Alpha Vantage gives us {budget} calls a day on the free tier. Every tracked stock costs one. Spend them like they're yours.</p>
      </div>

      <div className="desk">
        <div className="desk__quota">
          <div className="kicker">Today's quota</div>
          <div className="desk__big">
            <span className="mono">{quota.data ? left : '-'}</span>
            <span className="display">of {budget} wires left today</span>
          </div>
          <div className="desk__bars" aria-hidden="true">
            {Array.from({ length: budget }, (_, i) => <span key={i} className={i < left ? 'on' : ''} />)}
          </div>
          <p className="fineprint" style={{ marginTop: 10 }}>Filled = left, hollow = spent. Resets at midnight IST.</p>
        </div>
        <div className="desk__next">
          <div className="kicker">Next run</div>
          <p style={{ margin: '6px 0 0', fontSize: 17 }}>
            Fetches up to {tracked.length} tracked names, one wire each. Names with today's close already on file are skipped.
          </p>
          {short && <p className="loss" style={{ margin: '6px 0 0', fontSize: 15 }}>✕ Not enough wires for a full run. It'll file PARTIAL.</p>}
          <button className="btn btn--stamp" style={{ marginTop: 18 }} onClick={run} disabled={running}>
            {running ? 'Wire’s running…' : 'Run the morning wire'}
          </button>
        </div>
      </div>

      <div className="section-head" style={{ marginTop: 32 }}>
        <h2>Wire log</h2>
        <span className="kicker">Last {log.length} runs</span>
      </div>
      {(runs.loading || running) && <Shimmer rows={3} />}
      {runs.error && (
        <p role="alert" className="loss" style={{ margin: 0, padding: '24px 0', borderTop: '1px solid var(--ink)' }}>
          ✕ The log won't load. Ironic, for a wire service.{' '}
          <button className="btn btn--link" style={{ minHeight: 0, color: 'inherit' }} onClick={runs.reload}>Try again</button>.
        </p>
      )}
      {!runs.loading && !runs.error && log.length === 0 && (
        <p className="italic muted" style={{ margin: 0, padding: '24px 0', borderTop: '1px solid var(--ink)' }}>
          Nothing on the wire yet. The first run fills this in.
        </p>
      )}
      {log.length > 0 && (
        <div className="table-wrap">
          <table className="ledger" style={{ minWidth: 820 }}>
            <thead>
              <tr><th>When</th><th>Run</th><th>Status</th><th className="num">Calls</th><th className="num">Saved</th><th>Notes</th></tr>
            </thead>
            <tbody>
              {log.map((r) => {
                const [label, stampTone] = STATUS[r.status] || [r.status, 'ink'];
                return (
                  <tr key={r.id}>
                    <td className="mono" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>{when(r.startedAt)}</td>
                    <td style={{ fontSize: 15, whiteSpace: 'nowrap' }}>{TRIGGER[r.trigger] || r.trigger}</td>
                    <td style={{ padding: '10px 12px' }}><Stamp tone={stampTone}>{label}</Stamp></td>
                    <td className="num">{r.callsMade}</td>
                    <td className="num">{r.pricesSaved}</td>
                    <td style={{ fontSize: 15, minWidth: 280, textWrap: 'pretty' }}>{r.notes || '-'}</td>
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
