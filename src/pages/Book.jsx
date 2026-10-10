import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Portfolios, Stocks } from '../api/client';
import { money, parseClientId, signedMoney, tone } from '../format';
import useRemote from '../lib/useRemote';
import { Field, Shimmer, Stamp, StateBlock, useToast } from '../ui';
import { useApp } from './AppShell';

/** All folios the user owns or advises, plus the form to open a new one. */
export default function Book() {
  const { user } = useApp();
  const toast = useToast();
  const advisor = user.role === 'ADVISOR';
  const list = useRemote(() => Portfolios.list(), []);
  const sectors = useRemote(() => Stocks.sectors(), []);
  const [form, setForm] = useState({ name: '', sector: '', client: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const folios = list.data || [];
  const set = (field) => (e) => { setForm({ ...form, [field]: e.target.value }); setErr(''); };

  const create = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setErr('A folio needs a name. “Untitled” is not a strategy.'); return; }
    let ownerId = null;
    if (advisor && form.client.trim()) {
      ownerId = parseClientId(form.client);
      if (ownerId === null) { setErr('Client IDs look like IM-0031. Check the file.'); return; }
    }
    setBusy(true);
    try {
      await Portfolios.create({ name: form.name.trim(), sector: form.sector || null, ownerId });
      setForm({ name: '', sector: '', client: '' });
      toast('Folio opened. Fresh page, fresh mistakes.');
      list.reload();
    } catch (error) {
      setErr(error.status === 404 ? 'No account with that client ID.' : error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div className="kicker">My Book · {folios.length} {folios.length === 1 ? 'folio' : 'folios'}</div>
        <h1>Your book.</h1>
        <p>
          {advisor
            ? 'Every portfolio is a folio. Run your own, or open one per client with their ID.'
            : 'Every portfolio is a folio. Lock one to a sector if you want to keep yourself honest.'}
        </p>
      </div>

      <div className="book">
        <div className="book__list">
          {list.loading && <Shimmer rows={3} />}
          {list.error && (
            <StateBlock error stamp="Ledger jammed" title="We couldn't open your book."
              action={<button className="btn" onClick={list.reload}>Try again</button>}>
              The pages are fine; the server isn't. Give it a second.
            </StateBlock>
          )}
          {!list.loading && !list.error && folios.length === 0 && (
            <StateBlock plain stamp="Blank page" title="Your book is empty. Even Rakesh started somewhere."
              action={<button className="btn btn--ink" onClick={() => document.getElementById('folio-name')?.focus()}>Name your first folio</button>}>
              A folio is a pretend portfolio. Open one with the form, then head to Markets and buy a share with money that isn't yours.
            </StateBlock>
          )}
          {folios.map((f, i) => (
            <Link key={f.id} to={`/app/book/${f.id}`} className="folio">
              <div style={{ minWidth: 0 }}>
                <div className="folio__meta">
                  <span>Folio {String(i + 1).padStart(2, '0')}</span><span aria-hidden="true">·</span>
                  <span>{f.ownerId === user.id ? 'Self' : `Client ${f.ownerClientId} · ${f.ownerName}`}</span>
                </div>
                <div className="folio__name">{f.name}</div>
                <div style={{ marginTop: 10 }}><Stamp tilt={-2}>{f.sector ? `${f.sector} only` : 'Any sector'}</Stamp></div>
              </div>
              <div className="folio__value">
                <div className="kicker">Value</div>
                <div className="v">{money(f.currentValue)}</div>
                <div className={tone(f.totalPnl)} style={{ marginTop: 2, fontSize: 14 }}>{signedMoney(f.totalPnl)} P&amp;L</div>
              </div>
            </Link>
          ))}
        </div>

        <form className="newfolio" onSubmit={create}>
          <div className="kicker">New folio</div>
          <div className="newfolio__title">Open a fresh page.</div>
          <Field id="folio-name" label="Folio name" value={form.name} onChange={set('name')} placeholder="e.g. Pharma, but sensibly" />
          <Field as="select" label="Sector lock (optional)" value={form.sector} onChange={set('sector')}>
            <option value="">No lock: any sector</option>
            {(sectors.data || []).map((s) => <option key={s.sector} value={s.sector}>{s.sector} only</option>)}
          </Field>
          {advisor && (
            <Field label="Client ID (advisors)" mono value={form.client} onChange={set('client')} placeholder="IM-0031"
              style={{ textTransform: 'uppercase' }} />
          )}
          {err && <p role="alert" className="field__error" style={{ margin: 0 }}>✕ {err}</p>}
          <div>
            <button type="submit" className="btn btn--stamp-outline" disabled={busy}>{busy ? 'Opening…' : 'Open folio'}</button>
          </div>
        </form>
      </div>
    </>
  );
}
