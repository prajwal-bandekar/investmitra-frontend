import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Expenses } from '../../api/client';
import { todayIso } from '../../format';
import { Field, useToast } from '../../ui';

export const MODE_LABELS = { UPI: 'UPI', CASH: 'Cash', CARD: 'Card', NETBANKING: 'Net banking', OTHER: 'Other' };

/**
 * Receipt-style sheet to log or edit an expense. Amount is focused on open; categories are one-tap chips,
 * ordered by how often the user spends in them (`topIds`).
 */
export default function QuickAdd({ categories, topIds = [], initial, onClose, onSaved }) {
  const toast = useToast();
  const amountRef = useRef(null);
  const ordered = [...categories].sort((a, b) => rank(a.id, topIds) - rank(b.id, topIds));
  const [form, setForm] = useState(() => ({
    amount: initial ? String(Number(initial.amount)) : '',
    categoryId: initial?.categoryId ?? ordered[0]?.id ?? null,
    spentOn: initial?.spentOn ?? todayIso(),
    paymentMode: initial?.paymentMode ?? 'UPI',
    note: initial?.note ?? '',
  }));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [printed, setPrinted] = useState(false);

  useEffect(() => { amountRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!(amount > 0)) { setError('Enter an amount above zero.'); return; }
    if (!/^\d+(\.\d{1,2})?$/.test(form.amount.trim())) { setError('Rupees and up to two paise digits, e.g. 249.50'); return; }
    if (!form.categoryId) { setError('Pick a category.'); return; }
    setBusy(true);
    setError(null);
    const body = { ...form, amount: form.amount.trim(), note: form.note.trim() || null };
    try {
      if (initial) await Expenses.update(initial.id, body);
      else await Expenses.create(body);
      setPrinted(true);
      setTimeout(() => { onSaved(); onClose(); }, 650);
    } catch (err) {
      setBusy(false);
      toast(err.message);
    }
  };

  // Portalled to <body>: the page wrapper animates with a transform, which would trap a fixed overlay.
  return createPortal(
    <div className="scrim expense-scope" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className={`slip receipt-form${printed ? ' receipt-form--printed' : ''}`} onSubmit={submit}
        role="dialog" aria-modal="true" aria-labelledby="qa-title">
        <div className="receipt-form__head">
          <div className="kicker">ExpenseMitra · {initial ? 'Correction slip' : 'New entry'}</div>
          <h2 id="qa-title" className="display">{initial ? 'Fix this entry' : 'Where did it go?'}</h2>
        </div>

        <label className="receipt-form__amount">
          <span className="mono">₹</span>
          <input ref={amountRef} inputMode="decimal" placeholder="0" value={form.amount} onChange={set('amount')}
            aria-label="Amount in rupees" aria-invalid={error ? true : undefined} />
        </label>

        <div className="chips" role="radiogroup" aria-label="Category">
          {ordered.map((c) => (
            <button type="button" key={c.id} role="radio" aria-checked={form.categoryId === c.id}
              className={`chip${form.categoryId === c.id ? ' chip--on' : ''}`}
              onClick={() => setForm((f) => ({ ...f, categoryId: c.id }))}>
              <span aria-hidden="true">{c.icon}</span> {c.name}
            </button>
          ))}
        </div>

        <div className="receipt-form__row">
          <Field label="Date" type="date" mono value={form.spentOn} max={todayIso()} onChange={set('spentOn')} />
          <Field label="Paid by" as="select" value={form.paymentMode} onChange={set('paymentMode')}>
            {Object.entries(MODE_LABELS).map(([m, label]) => <option key={m} value={m}>{label}</option>)}
          </Field>
        </div>
        <Field label="Note (optional)" placeholder="Swiggy, late-night biryani" maxLength={200} value={form.note} onChange={set('note')} />

        {error && <p className="field__error" role="alert">✕ {error}</p>}

        <div className="receipt-form__actions">
          <button type="button" className="btn btn--link" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary btn--lg" disabled={busy}>{busy ? 'Printing…' : initial ? 'Save' : 'Log it'}</button>
        </div>
        {printed && <div className="receipt-form__stamp"><span className="stamp stamp--slam">Logged</span></div>}
      </form>
    </div>,
    document.body,
  );
}

const rank = (id, topIds) => {
  const i = topIds.indexOf(id);
  return i === -1 ? 999 : i;
};
