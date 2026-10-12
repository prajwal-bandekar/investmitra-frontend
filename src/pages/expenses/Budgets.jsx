import { useEffect, useState } from 'react';
import { Expenses } from '../../api/client';
import { monthName, rupees, thisMonth } from '../../format';
import useRemote from '../../lib/useRemote';
import { Shimmer, StateBlock, useToast } from '../../ui';
import './expense.css';

const prevMonth = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};

/** Monthly limits per category plus an overall cap. Blank means no budget. */
export default function Budgets() {
  const toast = useToast();
  const [month, setMonth] = useState(thisMonth());
  const categories = useRemote(() => Expenses.categories(), []);
  const budgets = useRemote(() => Expenses.budgets(month), [month]);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (budgets.data) {
      setValues(Object.fromEntries(budgets.data.map((b) => [b.categoryId ?? 'all', String(Number(b.limit))])));
    }
  }, [budgets.data]);

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const save = async (source = values) => {
    const keys = ['all', ...(categories.data || []).map((c) => c.id)];
    const items = [];
    for (const key of keys) {
      const text = (source[key] ?? '').trim();
      if (text !== '' && !(Number(text) >= 0)) { toast('Budgets are rupee amounts, e.g. 3000.'); return; }
      items.push({ categoryId: key === 'all' ? null : key, limit: text === '' ? null : Number(text) });
    }
    setSaving(true);
    try {
      await Expenses.saveBudgets(month, items);
      toast(`Budgets for ${monthName(month)} filed.`);
      budgets.reload();
    } catch (err) {
      toast(err.message);
    } finally {
      setSaving(false);
    }
  };

  const copyLast = async () => {
    try {
      const res = await Expenses.budgets(prevMonth(month));
      if (!res.data.length) { toast('No budgets last month to copy.'); return; }
      const copied = Object.fromEntries(res.data.map((b) => [b.categoryId ?? 'all', String(Number(b.limit))]));
      setValues(copied);
      save(copied);
    } catch (err) {
      toast(err.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <div className="kicker">Budgets · {monthName(month)}</div>
        <h1>Draw the line.</h1>
        <p>Set a limit per category. We warn you at 80% and stamp it when you cross. Leave blank for no limit.</p>
        <div className="ledger-toolbar">
          <input type="month" className="field__input field__input--mono month-input" value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Month" />
          <button className="btn" onClick={copyLast}>Copy last month</button>
        </div>
      </div>

      {(categories.loading || budgets.loading) && <Shimmer rows={6} />}
      {(categories.error || budgets.error) && (
        <StateBlock error stamp="Press jam" title="Can't load budgets."
          action={<button className="btn" onClick={() => { categories.reload(); budgets.reload(); }}>Try again</button>}>
          {(categories.error || budgets.error).message}
        </StateBlock>
      )}

      {categories.data && budgets.data && (
        <form className="budget-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <label className="budget-row budget-row--all">
            <span><b>Whole month</b><span className="muted"> · overall cap</span></span>
            <span className="budget-row__input"><span className="mono">₹</span>
              <input inputMode="decimal" className="field__input field__input--mono" placeholder="no cap" value={values.all ?? ''} onChange={set('all')} />
            </span>
          </label>
          {categories.data.map((c) => (
            <label key={c.id} className="budget-row">
              <span><span aria-hidden="true">{c.icon}</span> {c.name}{c.want && <span className="tag">want</span>}</span>
              <span className="budget-row__input"><span className="mono">₹</span>
                <input inputMode="decimal" className="field__input field__input--mono" placeholder="-" value={values[c.id] ?? ''} onChange={set(c.id)} />
              </span>
            </label>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
            <button className="btn btn--primary btn--lg" disabled={saving}>{saving ? 'Filing…' : 'Save budgets'}</button>
          </div>
          <p className="muted" style={{ fontSize: 14 }}>Total of category limits: {rupees(
            categories.data.reduce((s, c) => s + (Number(values[c.id]) || 0), 0))}</p>
        </form>
      )}
    </>
  );
}
