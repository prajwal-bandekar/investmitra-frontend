import { useCallback, useEffect, useRef, useState } from 'react';
import { Expenses } from '../../api/client';
import { monthName, rupees, thisMonth } from '../../format';
import useRemote from '../../lib/useRemote';
import { MonthPicker, Shimmer, StateBlock, useToast } from '../../ui';
import './expense.css';
import './simple-expenses.css';

const prevMonth = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};

const LIMIT_RE = /^\d{1,12}(\.\d{1,2})?$/;
const toForm = (rows) => Object.fromEntries(rows.map((b) => [b.categoryId ?? 'all', String(Number(b.limit))]));

/** Monthly limits per category plus an overall cap. Blank means no budget. */
export default function Budgets() {
  const toast = useToast();
  const [month, setMonth] = useState(thisMonth());
  const [loadedMonth, setLoadedMonth] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const categories = useRemote(() => Expenses.categories(), []);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const monthRef = useRef(month);
  monthRef.current = month;

  // Fetch budgets for `m`; a response for a month that is no longer selected is ignored.
  const load = useCallback(async (m) => {
    setLoadError(null);
    try {
      const res = await Expenses.budgets(m);
      if (monthRef.current !== m) return;
      setValues(toForm(res.data));
      setLoadedMonth(m);
    } catch (err) {
      if (monthRef.current === m) setLoadError(err);
    }
  }, []);

  useEffect(() => {
    setLoadedMonth(null);
    setValues({});
    load(month);
  }, [month, load]);

  const ready = loadedMonth !== null && loadedMonth === month && !!categories.data;
  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const save = async () => {
    if (!ready || saving) return;
    const target = loadedMonth;
    const keys = ['all', ...categories.data.map((c) => c.id)];
    const items = [];
    for (const key of keys) {
      const text = (values[key] ?? '').trim();
      if (text !== '' && !LIMIT_RE.test(text)) { toast('Budgets are rupee amounts up to 2 decimals, e.g. 3000 or 3000.50.'); return; }
      items.push({ categoryId: key === 'all' ? null : key, limit: text === '' ? null : Number(text) });
    }
    setSaving(true);
    try {
      await Expenses.saveBudgets(target, items);
      toast(`Budgets for ${monthName(target)} saved.`);
      if (monthRef.current === target) load(target);
    } catch (err) {
      toast(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Only fills the form; nothing is saved until the user presses Save.
  const copyLast = async () => {
    if (!ready || saving || copying) return;
    const target = loadedMonth;
    setCopying(true);
    try {
      const res = await Expenses.budgets(prevMonth(target));
      if (monthRef.current !== target) return;
      if (!res.data.length) { toast('No budgets last month to copy.'); return; }
      setValues(toForm(res.data));
      toast('Copied. Press Save to keep them.');
    } catch (err) {
      toast(err.message);
    } finally {
      setCopying(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Budgets</h1>
        <p>A monthly limit for each category. Leave blank for no limit.</p>
        <div className="ledger-toolbar">
          <MonthPicker value={month} onChange={setMonth} />
          <button className="btn" onClick={copyLast} disabled={!ready || saving || copying}>{copying ? 'Copying…' : 'Copy last month'}</button>
        </div>
      </div>

      {!ready && !categories.error && !loadError && <Shimmer rows={6} />}
      {(categories.error || loadError) && (
        <StateBlock error stamp="Press jam" title="Can't load budgets."
          action={<button className="btn" onClick={() => { if (categories.error) categories.reload(); load(month); }}>Try again</button>}>
          {(categories.error || loadError).message}
        </StateBlock>
      )}

      {ready && (
        <form className="budget-form" onSubmit={(e) => { e.preventDefault(); save(); }} aria-busy={saving}>
          <label className="budget-row budget-row--all">
            <span><b>Whole month</b><span className="muted"> (all categories)</span></span>
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
            <button className="btn btn--primary btn--lg" disabled={!ready || saving}>{saving ? 'Saving…' : 'Save budgets'}</button>
          </div>
          <p className="muted" style={{ fontSize: 14 }}>Total of category limits: {rupees(
            categories.data.reduce((s, c) => s + (Number(values[c.id]) || 0), 0))}</p>
        </form>
      )}
    </>
  );
}
