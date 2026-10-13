import { useRef, useState } from 'react';
import { Plan as PlanApi } from '../../api/client';
import { monthName, rupees, shortMonth, thisMonth } from '../../format';
import useRemote from '../../lib/useRemote';
import { Field, MonthPicker, Shimmer, StateBlock, useToast } from '../../ui';
import CommitmentDialog, { KIND_LABELS } from './CommitmentDialog';
import './expense.css';
import './simple-expenses.css';
import './plan.css';

const AMOUNT_RE = /^\d{1,12}(\.\d{1,2})?$/;

const ordinal = (n) => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] || 'th'}`;
};
const monthYear = (ym) => `${shortMonth(ym)} ${ym.slice(0, 4)}`;

/** Salary, extra income and fixed commitments for a month; everything on the Ledger ring comes from here. */
export default function Plan() {
  const toast = useToast();
  const [month, setMonth] = useState(thisMonth());
  const [editing, setEditing] = useState(null); // null | 'new' | commitment
  const [salary, setSalary] = useState('');
  const [savingSalary, setSavingSalary] = useState(false);
  const [extra, setExtra] = useState({ label: '', amount: '' });
  const [addingExtra, setAddingExtra] = useState(false);

  // Tagged with the month so another month's numbers never show under the picker.
  const planReq = useRemote(() => PlanApi.get(month).then((res) => ({ ...res, data: { month, body: res.data } })), [month]);
  const extraReq = useRemote(() => PlanApi.extraIncome(month).then((res) => ({ ...res, data: { month, body: res.data } })), [month]);
  const p = !planReq.error && planReq.data?.month === month ? planReq.data.body : null;
  const extras = !extraReq.error && extraReq.data?.month === month ? extraReq.data.body : null;
  const allReq = useRemote(() => PlanApi.commitments(), []);
  const inactive = (allReq.data || []).filter((c) => c.startMonth > month || (c.endMonth && c.endMonth < month));
  const reload = () => { planReq.reload(); extraReq.reload(); allReq.reload(); };
  const busyExtra = useRef(false);

  const saveSalary = async (e) => {
    e.preventDefault();
    const text = salary.trim();
    if (!AMOUNT_RE.test(text) || !(Number(text) > 0)) { toast('Enter your monthly salary as an amount above zero, e.g. 60000.'); return; }
    setSavingSalary(true);
    try {
      await PlanApi.setSalary(month, Number(text));
      toast(`Salary saved from ${monthName(month)}.`);
      setSalary('');
      reload();
    } catch (err) {
      toast(err.message);
    } finally {
      setSavingSalary(false);
    }
  };

  const addExtra = async (e) => {
    e.preventDefault();
    const label = extra.label.trim();
    const text = extra.amount.trim();
    if (!label) { toast('Say what it was for, e.g. Bonus.'); return; }
    if (!AMOUNT_RE.test(text) || !(Number(text) > 0)) { toast('Enter the amount above zero, e.g. 5000.'); return; }
    if (busyExtra.current) return;
    busyExtra.current = true;
    setAddingExtra(true);
    try {
      await PlanApi.addExtraIncome({ month, amount: Number(text), label });
      setExtra({ label: '', amount: '' });
      reload();
    } catch (err) {
      toast(err.message);
    } finally {
      busyExtra.current = false;
      setAddingExtra(false);
    }
  };

  const removeExtra = async (x) => {
    if (!window.confirm(`Delete ${x.label} (${rupees(x.amount)})?`)) return;
    if (busyExtra.current) return;
    busyExtra.current = true;
    try {
      await PlanApi.removeExtraIncome(x.id);
      reload();
    } catch (err) {
      toast(err.message);
    } finally {
      busyExtra.current = false;
    }
  };

  const hasSalary = p && p.salary !== null && p.salary !== undefined;

  return (
    <>
      <div className="page-head">
        <h1>Plan</h1>
        <p>Your salary and the bills that are already spoken for. What's left is yours to spend.</p>
        <div className="ledger-toolbar">
          <MonthPicker value={month} onChange={setMonth} />
        </div>
      </div>

      {!p && !planReq.error && <Shimmer rows={5} />}
      {planReq.error && (
        <StateBlock error stamp="Press jam" title="Can't load your plan."
          action={<button className="btn" onClick={reload}>Try again</button>}>
          {planReq.error.message}
        </StateBlock>
      )}

      {p && (
        <>
          <section className="plan-sec" aria-labelledby="pl-salary">
            <div className="section-head"><h2 id="pl-salary">Salary</h2></div>
            <div className="plan-salary">
              {hasSalary ? (
                <>
                  <span className="plan-salary__amt mono">{rupees(p.salary)}</span>
                  <span className="muted">a month{p.salaryFromMonth ? `, since ${monthName(p.salaryFromMonth)}` : ''}</span>
                </>
              ) : <span className="muted">Not set yet.</span>}
            </div>
            <form className="plan-form" onSubmit={saveSalary}>
              <Field label={hasSalary ? 'New salary (rupees)' : 'Monthly salary (rupees)'} mono inputMode="decimal" placeholder="0"
                value={salary} onChange={(e) => setSalary(e.target.value.replace(/[^\d.]/g, '').slice(0, 15))} />
              <button className="btn btn--ink" disabled={savingSalary}>{savingSalary ? 'Saving…' : 'Save'}</button>
            </form>
            <p className="plan-note">Changes apply from {monthName(month)} onward.</p>
          </section>

          <section className="plan-sec" aria-labelledby="pl-extra">
            <div className="section-head">
              <h2 id="pl-extra">Extra income</h2>
              <span className="muted">Bonus, freelance, a gift. Only for {monthName(month)}.</span>
            </div>
            {extras && extras.length > 0 && (
              <ul className="plan-rows">
                {extras.map((x) => (
                  <li key={x.id} className="plan-extra">
                    <span className="plan-row__name">{x.label}</span>
                    <span className="mono">{rupees(x.amount)}</span>
                    <button className="btn btn--link" onClick={() => removeExtra(x)} aria-label={`Delete ${x.label}`}>Delete</button>
                  </li>
                ))}
              </ul>
            )}
            <form className="plan-form" onSubmit={addExtra}>
              <Field className="field--grow" label="What for" placeholder="e.g. Bonus" maxLength={60} value={extra.label}
                onChange={(e) => setExtra((v) => ({ ...v, label: e.target.value }))} />
              <Field label="Amount (rupees)" mono inputMode="decimal" placeholder="0" value={extra.amount}
                onChange={(e) => setExtra((v) => ({ ...v, amount: e.target.value.replace(/[^\d.]/g, '').slice(0, 15) }))} />
              <button className="btn btn--ink" disabled={addingExtra}>{addingExtra ? 'Adding…' : 'Add'}</button>
            </form>
          </section>

          <section className="plan-sec" aria-labelledby="pl-commit">
            <div className="section-head">
              <h2 id="pl-commit">Commitments</h2>
              <button className="btn btn--primary" onClick={() => setEditing('new')}>Add commitment</button>
            </div>
            {p.commitments.length === 0 ? (
              <StateBlock plain title="Nothing fixed yet."
                action={<button className="btn btn--ink" onClick={() => setEditing('new')}>Add your first</button>}>
                EMIs, rent, insurance, subscriptions, a monthly SIP. Add them once and they count every month.
              </StateBlock>
            ) : (
              <ul className="plan-rows">
                {p.commitments.map((c) => (
                  <li key={c.id}>
                    <button className="plan-row" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}>
                      <span className="plan-row__name">{c.name}</span>
                      <span className="plan-row__amt mono">{rupees(c.amount)}</span>
                      <span className="plan-row__meta">
                        {KIND_LABELS[c.kind] || c.kind} · due {ordinal(c.dueDay)} · {c.endMonth ? `ends ${monthYear(c.endMonth)}` : 'no end'}
                        {c.monthsLeft !== null && c.monthsLeft !== undefined && ` · ${c.monthsLeft} ${c.monthsLeft === 1 ? 'month' : 'months'} left`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {inactive.length > 0 && (
              <>
                <h3 className="plan-sub">Upcoming and ended</h3>
                <ul className="plan-rows">
                  {inactive.map((c) => (
                    <li key={c.id}>
                      <button className="plan-row" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}>
                        <span className="plan-row__name">{c.name}</span>
                        <span className="plan-row__amt mono">{rupees(c.amount)}</span>
                        <span className="plan-row__meta">
                          {KIND_LABELS[c.kind] || c.kind} · {c.startMonth > month ? `starts ${monthYear(c.startMonth)}` : `ended ${monthYear(c.endMonth)}`}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <dl className="plan-sum" aria-label={`${monthName(month)} summary`}>
            <div><dt>Income</dt><dd className="mono">{rupees(p.totalIncome)}</dd></div>
            <div><dt>Committed</dt><dd className="mono">{rupees(p.committedTotal)}</dd></div>
            <div><dt>Set aside</dt><dd className="mono">{rupees(p.savingsTotal)}</dd></div>
            <div className="plan-sum__free"><dt>Free to spend</dt><dd className={`mono${Number(p.freeToSpend) < 0 ? ' loss' : ''}`}>{rupees(p.freeToSpend)}</dd></div>
          </dl>
        </>
      )}

      {editing && (
        <CommitmentDialog initial={editing === 'new' ? null : editing} month={month}
          onClose={() => setEditing(null)} onSaved={(msg) => { toast(msg); reload(); }} />
      )}
    </>
  );
}
