import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plan } from '../../api/client';
import { monthName, thisMonth } from '../../format';
import { Field, MONTH_RE, useToast } from '../../ui';

// Mirrors the backend CommitmentKind enum.
export const KIND_LABELS = {
  EMI: 'EMI', BNPL: 'Pay later', INSURANCE: 'Insurance', SUBSCRIPTION: 'Subscription', RENT: 'Rent', SAVINGS: 'Savings', OTHER: 'Other',
};

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

const cleanAmount = (text) => {
  const t = text.replace(/[^\d.]/g, '');
  const dot = t.indexOf('.');
  if (dot === -1) return t.slice(0, 12);
  return `${t.slice(0, dot).slice(0, 12)}.${t.slice(dot + 1).replace(/\./g, '').slice(0, 2)}`;
};

/** Receipt-style sheet to add or edit a fixed monthly commitment. Same shell as QuickAdd. */
export default function CommitmentDialog({ initial, month, onClose, onSaved }) {
  const toast = useToast();
  const formRef = useRef(null);
  const inFlight = useRef(false);
  const opener = useRef(document.activeElement);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [form, setForm] = useState(() => ({
    name: initial?.name ?? '',
    kind: initial?.kind ?? 'EMI',
    amount: initial ? String(Number(initial.amount)) : '',
    dueDay: initial ? String(initial.dueDay) : '1',
    startMonth: initial?.startMonth ?? (month && month > thisMonth() ? month : thisMonth()),
    endMonth: initial?.endMonth ?? '',
  }));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const requestClose = useCallback(() => { if (!inFlight.current) closeRef.current(); }, []);

  useEffect(() => {
    formRef.current?.querySelector('input')?.focus();
    const from = opener.current;
    return () => { if (from && document.contains(from)) from.focus?.(); };
  }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') requestClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose]);

  const trap = (e) => {
    if (e.key !== 'Tab') return;
    const items = [...formRef.current.querySelectorAll(FOCUSABLE)];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !formRef.current.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const set = (key) => (e) => { setError(null); setForm((f) => ({ ...f, [key]: e.target.value })); };

  const submit = async (e) => {
    e.preventDefault();
    if (inFlight.current) return;
    const name = form.name.trim();
    const amount = Number(form.amount);
    const dueDay = Number(form.dueDay);
    if (!name) { setError('Give it a name, e.g. Bajaj EMI.'); return; }
    if (!/^\d{1,12}(\.\d{1,2})?$/.test(form.amount) || !(amount > 0)) { setError('Enter the monthly amount, above zero.'); return; }
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) { setError('Due day is a date from 1 to 31.'); return; }
    if (!MONTH_RE.test(form.startMonth)) { setError('Start month: use YYYY-MM, e.g. 2027-03.'); return; }
    if (form.endMonth && !MONTH_RE.test(form.endMonth)) { setError('End month: use YYYY-MM, e.g. 2027-03.'); return; }
    if (form.endMonth && form.endMonth < form.startMonth) { setError('The end month can’t be before the start month.'); return; }
    const body = { name, kind: form.kind, amount, dueDay, startMonth: form.startMonth, endMonth: form.endMonth || null };
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      if (initial) await Plan.updateCommitment(initial.id, body);
      else await Plan.createCommitment(body);
      onSaved(!initial && body.startMonth > (month || thisMonth()) ? `Added. It counts from ${monthName(body.startMonth)}.` : initial ? 'Commitment updated.' : 'Commitment added.');
      closeRef.current();
    } catch (err) {
      inFlight.current = false;
      setBusy(false);
      toast(err.message);
    }
  };

  const remove = async () => {
    if (inFlight.current || !window.confirm(`Delete ${initial.name}? It will leave every month, past ones too.`)) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await Plan.removeCommitment(initial.id);
      onSaved('Commitment deleted.');
      closeRef.current();
    } catch (err) {
      inFlight.current = false;
      setBusy(false);
      toast(err.message);
    }
  };

  return createPortal(
    <div className="scrim expense-scope" onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose(); }}>
      <form ref={formRef} onKeyDown={trap} className="slip receipt-form cm-form" onSubmit={submit}
        role="dialog" aria-modal="true" aria-labelledby="cm-title" noValidate>
        <div className="receipt-form__head">
          <h2 id="cm-title" className="display">{initial ? 'Edit commitment' : 'Add commitment'}</h2>
        </div>

        <Field label="Name" placeholder="e.g. Bajaj EMI" maxLength={60} value={form.name} onChange={set('name')} />

        <div>
          <span id="cm-kind" className="field__label">Kind</span>
          <div className="chips chips--compact" role="radiogroup" aria-labelledby="cm-kind">
            {Object.entries(KIND_LABELS).map(([k, label]) => (
              <button type="button" key={k} role="radio" aria-checked={form.kind === k}
                className={`chip${form.kind === k ? ' chip--on' : ''}`}
                onClick={() => { setError(null); setForm((f) => ({ ...f, kind: k })); }}>{label}</button>
            ))}
          </div>
        </div>

        <label>
          <span className="field__label">Amount each month (rupees)</span>
          <span className="receipt-form__amount">
            <span className="mono" aria-hidden="true">₹</span>
            <input inputMode="decimal" placeholder="0" value={form.amount}
              onChange={(e) => { setError(null); setForm((f) => ({ ...f, amount: cleanAmount(e.target.value) })); }} />
          </span>
        </label>

        <div className="cm-form__two">
          <Field label="Due day" type="number" inputMode="numeric" min={1} max={31} mono value={form.dueDay} onChange={set('dueDay')} />
          <Field label="Starts" type="month" placeholder="YYYY-MM" mono value={form.startMonth} onChange={set('startMonth')} />
        </div>
        <Field label="Ends (optional)" type="month" placeholder="YYYY-MM" mono value={form.endMonth} onChange={set('endMonth')} />

        {error && <p className="field__error" role="alert">✕ {error}</p>}

        <div className="receipt-form__actions">
          {initial
            ? <button type="button" className="btn btn--link cm-form__del" onClick={remove} disabled={busy}>Delete</button>
            : <button type="button" className="btn btn--link" onClick={requestClose}>Cancel</button>}
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {initial && <button type="button" className="btn btn--link" onClick={requestClose}>Cancel</button>}
            <button className="btn btn--primary btn--lg" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save' : 'Add'}</button>
          </span>
        </div>
      </form>
    </div>,
    document.body,
  );
}
