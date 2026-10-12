import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Expenses } from '../../api/client';
import { todayIso } from '../../format';
import { Field, useToast } from '../../ui';

// Mirrors the backend PaymentMode enum (UPI, CASH, CARD, NETBANKING, OTHER).
export const MODE_LABELS = { UPI: 'UPI', CASH: 'Cash', CARD: 'Card', NETBANKING: 'Net banking', OTHER: 'Other' };

const MODE_KEY = 'im.lastPaymentMode';
const lastMode = () => {
  try {
    const m = localStorage.getItem(MODE_KEY);
    return m && MODE_LABELS[m] ? m : 'UPI';
  } catch { return 'UPI'; }
};
const rememberMode = (m) => { try { localStorage.setItem(MODE_KEY, m); } catch { /* storage blocked */ } };

/** Tidies typed or pasted text: no commas or stray characters, at most 12 whole digits and 2 decimals. */
const cleanAmount = (text) => {
  const t = text.replace(/[^\d.]/g, '');
  const dot = t.indexOf('.');
  if (dot === -1) return t.slice(0, 12);
  return `${t.slice(0, dot).slice(0, 12)}.${t.slice(dot + 1).replace(/\./g, '').slice(0, 2)}`;
};

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

/**
 * Receipt-style sheet to add or edit an expense (amount, category, date, optional note; payment mode is an optional 'Paid by' chip row defaulting to the last one used). Amount is focused on open; categories are one-tap chips,
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
    paymentMode: initial?.paymentMode ?? lastMode(),
    note: initial?.note ?? '',
  }));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [printed, setPrinted] = useState(false);
  const formRef = useRef(null);
  const inFlight = useRef(false);
  const printedRef = useRef(false);
  const opener = useRef(document.activeElement);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Once the expense is saved the print animation runs; closing then would skip the refresh.
  const requestClose = useCallback(() => { if (!printedRef.current) closeRef.current(); }, []);

  useEffect(() => {
    amountRef.current?.focus();
    const from = opener.current;
    return () => { if (from && document.contains(from)) from.focus?.(); };
  }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') requestClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose]);

  // Tab stays inside the dialog.
  const trap = (e) => {
    if (e.key !== 'Tab') return;
    const items = [...formRef.current.querySelectorAll(FOCUSABLE)];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !formRef.current.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setAmount = (e) => { setError(null); setForm((f) => ({ ...f, amount: cleanAmount(e.target.value) })); };

  const submit = async (e) => {
    e.preventDefault();
    if (inFlight.current || printedRef.current) return;
    const text = form.amount.trim();
    if (!/\d/.test(text)) { setError(text === '' ? 'Enter an amount.' : 'Enter the amount as a number, e.g. 249.50'); return; }
    if (!/^\d{0,12}(\.\d{0,2})?$/.test(text)) { setError('Use up to 12 digits and 2 paise digits, e.g. 249.50'); return; }
    const amount = Number(text);
    if (!(amount > 0)) { setError('The amount must be above zero.'); return; }
    if (!form.categoryId) { setError('Pick a category.'); return; }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    const body = { ...form, amount, note: form.note.trim() || null };
    try {
      if (initial) await Expenses.update(initial.id, body);
      else await Expenses.create(body);
      printedRef.current = true;
      rememberMode(form.paymentMode);
      setPrinted(true);
      setTimeout(() => { onSaved(); closeRef.current(); }, 650);
    } catch (err) {
      inFlight.current = false;
      setBusy(false);
      toast(err.message);
    }
  };

  // Portalled to <body>: the page wrapper animates with a transform, which would trap a fixed overlay.
  return createPortal(
    <div className="scrim expense-scope" onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose(); }}>
      <form ref={formRef} onKeyDown={trap} className={`slip receipt-form${printed ? ' receipt-form--printed' : ''}`} onSubmit={submit}
        role="dialog" aria-modal="true" aria-labelledby="qa-title">
        <div className="receipt-form__head">
          <h2 id="qa-title" className="display">{initial ? 'Edit expense' : 'Add expense'}</h2>
        </div>

        <label>
          <span className="field__label">Amount (rupees)</span>
          <span className="receipt-form__amount">
            <span className="mono" aria-hidden="true">₹</span>
            <input ref={amountRef} inputMode="decimal" placeholder="0" value={form.amount} onChange={setAmount}
              aria-invalid={error ? true : undefined} />
          </span>
        </label>

        <div>
          <span id="qa-cat" className="field__label">Category</span>
          <div className="chips" role="radiogroup" aria-labelledby="qa-cat">
          {ordered.map((c) => (
            <button type="button" key={c.id} role="radio" aria-checked={form.categoryId === c.id}
              className={`chip${form.categoryId === c.id ? ' chip--on' : ''}`}
              onClick={() => setForm((f) => ({ ...f, categoryId: c.id }))}>
              <span aria-hidden="true">{c.icon}</span> {c.name}
            </button>
          ))}
          </div>
        </div>

        <div>
          <span id="qa-pay" className="field__label">Paid by (optional)</span>
          <div className="chips chips--compact" role="radiogroup" aria-labelledby="qa-pay">
            {Object.entries(MODE_LABELS).map(([m, label]) => (
              <button type="button" key={m} role="radio" aria-checked={form.paymentMode === m}
                className={`chip${form.paymentMode === m ? ' chip--on' : ''}`}
                onClick={() => setForm((f) => ({ ...f, paymentMode: m }))}>{label}</button>
            ))}
          </div>
        </div>

        <Field label="Date" type="date" mono value={form.spentOn} max={todayIso()} onChange={set('spentOn')} />
        <Field label="Note (optional)" placeholder="e.g. Lunch" maxLength={200} value={form.note} onChange={set('note')} />

        {error && <p className="field__error" role="alert">✕ {error}</p>}

        <div className="receipt-form__actions">
          <button type="button" className="btn btn--link" onClick={requestClose} disabled={printed}>Cancel</button>
          <button className="btn btn--primary btn--lg" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save' : 'Add expense'}</button>
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
