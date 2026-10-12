import { useEffect, useRef, useState } from 'react';
import { Expenses } from '../../api/client';
import { rupees, shortDate, thisMonth } from '../../format';
import useRemote from '../../lib/useRemote';
import { Field, MonthPicker, Shimmer, StateBlock, useToast } from '../../ui';
import QuickAdd, { MODE_LABELS } from './QuickAdd';
import './expense.css';
import './simple-expenses.css';

/** Every logged expense for a month as simple rows (date, category, amount) that expand for details, edit and delete. */
export default function History() {
  const toast = useToast();
  const [month, setMonth] = useState(thisMonth());
  const [categoryId, setCategoryId] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [editing, setEditing] = useState(null);
  const categories = useRemote(() => Expenses.categories(), []);
  const key = `${month}|${categoryId}|${paymentMode}`;
  // The payload is tagged with the filter key it belongs to, so rows from another month or filter never show under this one.
  const list = useRemote(() => Expenses.list({ month, categoryId: categoryId || undefined, paymentMode: paymentMode || undefined })
    .then((res) => ({ ...res, data: { key, rows: res.data } })), [key]);

  const ready = !list.error && list.data?.key === key;
  const items = ready ? list.data.rows : [];
  const headingRef = useRef(null);
  const rowRefs = useRef({});
  const pendingFocus = useRef(null);
  const [open, setOpen] = useState(null);
  // Collapse the open row if its entry is gone after a reload or filter change.
  useEffect(() => {
    if (!ready) return;
    setOpen((o) => (o != null && !list.data.rows.some((e) => e.id === o) ? null : o));
  }, [ready, list.data]);

  // After a delete, keyboard focus moves to the next row (or the heading) rather than being lost with the removed button.
  useEffect(() => {
    if (!ready || pendingFocus.current === null) return;
    const id = pendingFocus.current;
    pendingFocus.current = null;
    (rowRefs.current[id] || headingRef.current)?.focus();
  }, [ready, list.data]);

  const total = items.reduce((sum, e) => sum + Number(e.amount), 0);

  const remove = async (e) => {
    if (!window.confirm(`Delete ${rupees(e.amount)} on ${e.category}?`)) return;
    try {
      await Expenses.remove(e.id);
      toast('Entry deleted.');
      const i = items.findIndex((x) => x.id === e.id);
      pendingFocus.current = (items[i + 1] || items[i - 1])?.id ?? 'heading';
      setOpen(null);
      list.reload();
    } catch (err) {
      toast(err.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <h1 ref={headingRef} tabIndex={-1}>History</h1>
        <p>{ready ? `${items.length} ${items.length === 1 ? 'entry' : 'entries'}, ${rupees(total)} in total.` : 'Everything you have logged.'}</p>
        <div className="ledger-toolbar">
          <MonthPicker value={month} max={thisMonth()} onChange={setMonth} />
          <Field label="Category" as="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {(categories.data || []).map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </Field>
          <Field label="Paid by" as="select" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
            <option value="">Any payment</option>
            {Object.entries(MODE_LABELS).map(([m, label]) => <option key={m} value={m}>{label}</option>)}
          </Field>
        </div>
      </div>

      {!ready && !list.error && <Shimmer rows={6} />}
      {list.error && (
        <StateBlock error stamp="Press jam" title="Can't fetch your entries."
          action={<button className="btn" onClick={list.reload}>Try again</button>}>{list.error.message}</StateBlock>
      )}
      {ready && items.length === 0 && (
        <StateBlock plain title="No entries match.">Try another month or clear the filters.</StateBlock>
      )}

      {items.length > 0 && (
        <ul className="xrows">
          {items.map((e) => {
            const isOpen = open === e.id;
            return (
              <li key={e.id} className="xrow">
                <button type="button" className="xrow__head" ref={(el) => { if (el) rowRefs.current[e.id] = el; else delete rowRefs.current[e.id]; }} aria-expanded={isOpen} aria-controls={isOpen ? `e-${e.id}` : undefined}
                  onClick={() => setOpen(isOpen ? null : e.id)}>
                  <span className="mono xrow__date"><span className="xrow__chev" aria-hidden="true">▸</span>{shortDate(e.spentOn)}</span>
                  <span className="xrow__what"><span aria-hidden="true">{e.icon}</span> {e.category}</span>
                  <span className="mono xrow__amt">{rupees(e.amount)}</span>
                </button>
                {isOpen && (
                  <div className="xrow__body" id={`e-${e.id}`}>
                    <dl className="xrow__fact"><dt>Note</dt><dd>{e.note || 'None'}</dd></dl>
                    <dl className="xrow__fact"><dt>Paid by</dt><dd>{MODE_LABELS[e.paymentMode] || e.paymentMode}{e.source === 'SMS' ? ' (from SMS)' : ''}</dd></dl>
                    <div className="xrow__acts">
                      <button className="btn btn--ink" onClick={() => setEditing(e)}>Edit</button>
                      <button className="btn btn--link" onClick={() => remove(e)}>Delete</button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {editing && categories.data && (
        <QuickAdd categories={categories.data} initial={editing} onClose={() => setEditing(null)} onSaved={list.reload} />
      )}
    </>
  );
}
