import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Portfolios, Stocks } from '../api/client';
import { money, parseClientId, signedMoney, tone } from '../format';
import useRemote from '../lib/useRemote';
import { Field, Shimmer, StateBlock, useToast } from '../ui';
import { useApp } from './AppShell';
import './simple-portfolio.css';

const focusName = () => setTimeout(() => document.getElementById('folio-name')?.focus(), 0);

/** Portfolios the user owns or advises, plus a form (behind one button) to create a new one. */
export default function Book() {
  const { user } = useApp();
  const toast = useToast();
  const advisor = user.role === 'ADVISOR';
  const list = useRemote(() => Portfolios.list(), []);
  const sectors = useRemote(() => Stocks.sectors(), []);
  const [form, setForm] = useState({ name: '', sector: '', client: '', advisor: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const folios = list.data || [];
  const mine = folios.filter((f) => f.ownerId === user.id);
  const clients = folios.filter((f) => f.ownerId !== user.id);
  const set = (field) => (e) => { setForm({ ...form, [field]: e.target.value }); setErr(''); };

  const create = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Give the portfolio a name.'); return; }
    let ownerId = null;
    if (advisor && form.client.trim()) {
      ownerId = parseClientId(form.client);
      if (ownerId === null) { setErr('Client IDs look like IM-0031.'); return; }
    }
    let advisorId = null;
    if (!advisor && form.advisor.trim()) {
      advisorId = parseClientId(form.advisor);
      if (advisorId === null) { setErr('Advisor IDs look like IM-0031.'); return; }
    }
    setBusy(true);
    try {
      await Portfolios.create({ name: form.name.trim(), sector: form.sector || null, ownerId, ...(advisorId !== null && { advisorId }) });
      setForm({ name: '', sector: '', client: '', advisor: '' });
      setOpen(false);
      toast('Portfolio created.');
      list.reload();
    } catch (error) {
      setErr(error.status === 404 ? 'No account with that ID.'
        : error.status === 403 && ownerId !== null ? 'This person needs to appoint you as their advisor first.'
        : error.message);
    } finally {
      setBusy(false);
    }
  };

  const row = (f) => (
    <Link key={f.id} to={`/app/book/${f.id}`} className="sp-folio">
      <div style={{ minWidth: 0 }}>
        <div className="sp-folio__name">{f.name}</div>
        <div className="sp-folio__sub">
          {f.ownerId !== user.id && `${f.ownerName} (${f.ownerClientId})`}
          {f.ownerId !== user.id && f.sector && ' · '}
          {f.sector && `${f.sector} only`}
        </div>
      </div>
      <div className="sp-folio__num">
        <div className="v">{money(f.currentValue)}</div>
        <div className={`p ${tone(f.totalPnl)}`}>{signedMoney(f.totalPnl)}</div>
      </div>
    </Link>
  );

  return (
    <>
      <div className="page-head sp-head">
        <h1>My portfolios</h1>
        <button type="button" className="btn btn--ink" aria-expanded={open} aria-controls={open ? 'new-portfolio' : undefined}
          onClick={() => { setOpen((o) => !o); focusName(); }}>
          {open ? 'Cancel' : 'New portfolio'}
        </button>
      </div>

      {open && (
        <form id="new-portfolio" className="sp-form" onSubmit={create}>
          <Field id="folio-name" label="Name" value={form.name} onChange={set('name')} placeholder="e.g. Long-term picks" />
          <Field as="select" label="Limit to one sector (optional)" value={form.sector} onChange={set('sector')}>
            <option value="">Any sector</option>
            {(sectors.data || []).map((s) => <option key={s.sector} value={s.sector}>{s.sector} only</option>)}
          </Field>
          {advisor && (
            <Field label="Client ID (optional, for a client's portfolio)" mono value={form.client} onChange={set('client')} placeholder="IM-0031"
              style={{ textTransform: 'uppercase' }} />
          )}
          {!advisor && (
            <Field label="Advisor ID (optional)" mono value={form.advisor} onChange={set('advisor')} placeholder="IM-0031"
              style={{ textTransform: 'uppercase' }} />
          )}
          {err && <p role="alert" className="field__error" style={{ margin: 0 }}>✕ {err}</p>}
          <div>
            <button type="submit" className="btn btn--stamp-outline" disabled={busy}>{busy ? 'Creating…' : 'Create portfolio'}</button>
          </div>
        </form>
      )}

      {list.loading && <div style={{ marginTop: 24 }}><Shimmer rows={3} /></div>}
      {list.error && (
        <StateBlock error stamp="Ledger jammed" title="We couldn't load your portfolios."
          action={<button className="btn" onClick={list.reload}>Try again</button>}>
          The server hiccuped. Give it a second.
        </StateBlock>
      )}
      {!list.loading && !list.error && folios.length === 0 && (
        <StateBlock plain stamp="Blank page" title="No portfolios yet. Even Rakesh started somewhere."
          action={<button className="btn btn--ink" onClick={() => { setOpen(true); focusName(); }}>Create your first portfolio</button>}>
          A portfolio holds the shares you buy with pretend money.
        </StateBlock>
      )}

      {mine.length > 0 && <div className="sp-list" style={{ marginTop: 24 }}>{mine.map(row)}</div>}

      {clients.length > 0 && (
        <section className="sp-group" aria-labelledby="clients-h">
          <h2 id="clients-h">Client portfolios</h2>
          <p>Portfolios you manage for your clients.</p>
          <div className="sp-list">{clients.map(row)}</div>
        </section>
      )}
    </>
  );
}
