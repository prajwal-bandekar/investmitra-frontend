import { useMemo, useState } from 'react';
import { Expenses } from '../../api/client';
import { longDate, monthName, rupees, thisMonth } from '../../format';
import useRemote from '../../lib/useRemote';
import { Shimmer, StateBlock, useToast } from '../../ui';
import QuickAdd, { MODE_LABELS } from './QuickAdd';
import './expense.css';

/** Every logged expense for a month, grouped by day, with filters, edit and delete. */
export default function History() {
  const toast = useToast();
  const [month, setMonth] = useState(thisMonth());
  const [categoryId, setCategoryId] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [editing, setEditing] = useState(null);
  const categories = useRemote(() => Expenses.categories(), []);
  const list = useRemote(() => Expenses.list({ month, categoryId: categoryId || undefined, paymentMode: paymentMode || undefined }),
    [month, categoryId, paymentMode]);

  const days = useMemo(() => {
    const groups = new Map();
    for (const e of list.data || []) {
      if (!groups.has(e.spentOn)) groups.set(e.spentOn, []);
      groups.get(e.spentOn).push(e);
    }
    return [...groups.entries()];
  }, [list.data]);
  const total = (list.data || []).reduce((sum, e) => sum + Number(e.amount), 0);

  const remove = async (e) => {
    if (!window.confirm(`Delete ${rupees(e.amount)} on ${e.category}?`)) return;
    try {
      await Expenses.remove(e.id);
      toast('Entry torn out of the ledger.');
      list.reload();
    } catch (err) {
      toast(err.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <div className="kicker">History · {monthName(month)}</div>
        <h1>The paper trail.</h1>
        <p>{list.data ? `${list.data.length} entries, ${rupees(total)} in all.` : 'Every rupee, by the day.'}</p>
        <div className="ledger-toolbar">
          <input type="month" className="field__input field__input--mono month-input" value={month} max={thisMonth()}
            onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Month" />
          <select className="field__input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {(categories.data || []).map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <select className="field__input" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} aria-label="Paid by">
            <option value="">Any payment</option>
            {Object.entries(MODE_LABELS).map(([m, label]) => <option key={m} value={m}>{label}</option>)}
          </select>
        </div>
      </div>

      {list.loading && <Shimmer rows={6} />}
      {list.error && (
        <StateBlock error stamp="Press jam" title="Can't fetch your entries."
          action={<button className="btn" onClick={list.reload}>Try again</button>}>{list.error.message}</StateBlock>
      )}
      {!list.loading && !list.error && days.length === 0 && (
        <StateBlock plain title="No entries match.">Try another month or clear the filters.</StateBlock>
      )}

      {days.map(([day, entries]) => (
        <section key={day} className="day">
          <div className="day__head">
            <span className="kicker">{longDate(day)}</span>
            <span className="mono">{rupees(entries.reduce((s, e) => s + Number(e.amount), 0))}</span>
          </div>
          <ul className="entries">
            {entries.map((e) => (
              <li key={e.id}>
                <span className="entries__icon" aria-hidden="true">{e.icon}</span>
                <span className="entries__what">
                  <b>{e.category}</b>
                  <span className="muted">{[e.note, MODE_LABELS[e.paymentMode], e.source === 'SMS' ? 'from SMS' : null].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="mono entries__amt">{rupees(e.amount)}</span>
                <span className="entries__actions">
                  <button className="btn btn--link" onClick={() => setEditing(e)}>Edit</button>
                  <button className="btn btn--link" onClick={() => remove(e)}>Delete</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {editing && categories.data && (
        <QuickAdd categories={categories.data} initial={editing} onClose={() => setEditing(null)} onSaved={list.reload} />
      )}
    </>
  );
}
