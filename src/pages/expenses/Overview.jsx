import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Expenses, Plan } from '../../api/client';
import { monthName, nextMonth, rupees, shortMonth, thisMonth } from '../../format';
import useRemote from '../../lib/useRemote';
import { MonthPicker, Shimmer, Stamp, StateBlock } from '../../ui';
import MoneyRing from './MoneyRing';
import QuickAdd from './QuickAdd';
import WishCard from './WishCard';
import './expense.css';
import './WishCard.css';
import './simple-expenses.css';
import './plan.css';

/** ExpenseMitra front page: month headline, spend by category against budgets, could-have-bought cards. */
export default function Overview() {
  const [month, setMonth] = useState(thisMonth());
  const [adding, setAdding] = useState(false);
  // The payload is tagged with the month it belongs to, so a previous month's numbers are never shown under a new month.
  const summary = useRemote(() => Expenses.summary(month).then((res) => ({ ...res, data: { month, body: res.data } })), [month]);
  const categories = useRemote(() => Expenses.categories(), []);
  // The plan is optional for the page: if it fails, the rest of the Ledger still shows.
  const planReq = useRemote(() => Plan.get(month).then((res) => ({ ...res, data: { month, body: res.data } })), [month]);
  const plan = !planReq.error && planReq.data?.month === month ? planReq.data.body : null;
  const s = !summary.error && summary.data?.month === month ? summary.data.body : null;

  const reload = () => { summary.reload(); planReq.reload(); };
  const topIds = s ? s.byCategory.filter((c) => c.count > 0).map((c) => c.categoryId) : [];
  const spent = s ? s.byCategory.filter((c) => Number(c.spent) > 0) : [];
  const max = Math.max(1, ...spent.map((c) => Math.max(Number(c.spent), Number(c.budget || 0))));
  const change = s && Number(s.lastMonthTotal) > 0
    ? ((Number(s.total) - Number(s.lastMonthTotal)) * 100) / Number(s.lastMonthTotal) : null;
  const overall = s?.overallBudget ? Number(s.overallBudget) : null;
  const usedPct = overall ? (Number(s.total) * 100) / overall : null;

  return (
    <>
      <div className="page-head">
        <h1>Ledger</h1>
        <p>
          {s ? `${rupees(s.total)} spent${month === thisMonth() ? ' so far' : ''} in ${monthName(month)}.` : 'What you spent this month.'}
          {s && change !== null && ` ${Math.round(change) === 0 ? 'About the same as last month.'
            : change > 0 ? `${Math.round(change)}% more than last month.` : `${Math.round(-change)}% less than last month.`}`}
        </p>
        <div className="ledger-toolbar">
          <MonthPicker value={month} max={thisMonth()} onChange={setMonth} />
          <button className="btn btn--primary" onClick={() => setAdding(true)} disabled={!categories.data}>+ Log expense</button>
        </div>
      </div>

      {!s && !summary.error && <Shimmer rows={5} />}
      {summary.error && (
        <StateBlock error stamp="Press jam" title="Can't print your ledger right now."
          action={<button className="btn" onClick={summary.reload}>Try again</button>}>
          {summary.error.message}
        </StateBlock>
      )}

      {plan ? <FreeToSpend plan={plan} month={month} /> : !planReq.error && <div className="ring-wrap ring-wrap--loading" aria-hidden="true" />}

      {s && (
        <>
          {overall && (
            <div className={`budget-meter${usedPct >= 100 ? ' budget-meter--over' : usedPct >= 80 ? ' budget-meter--warn' : ''}`}>
              <div className="budget-meter__label">
                <span>Monthly limit</span>
                <span className="mono">{rupees(s.total)} of {rupees(overall)}</span>
              </div>
              <div className="bar"><span style={{ width: `${Math.min(100, usedPct)}%` }} /></div>
              {usedPct >= 100 && <Stamp tone="loss" size="lg" tilt={-4}>Over budget</Stamp>}
            </div>
          )}

          {s.couldHaveBought.length > 0 && (
            <section style={{ marginTop: 28 }}>
              <div className="section-head">
                <h2>Could have bought</h2>
                <span className="muted">What your “want” spends in {month.slice(0, 4)} could have bought.</span>
              </div>
              <div className="wish-grid">
                {s.couldHaveBought.map((card, i) => <WishCard key={card.categoryId} card={card} index={i} year={month.slice(0, 4)} />)}
              </div>
            </section>
          )}

          <section style={{ marginTop: 32 }}>
            <div className="section-head">
              <h2>By category</h2>
              <Link to="/app/expenses/budgets" className="btn btn--link">Set budgets</Link>
            </div>
            {spent.length === 0 ? (
              <StateBlock plain title="A blank page."
                action={<button className="btn btn--ink" onClick={() => setAdding(true)} disabled={!categories.data}>Log your first spend</button>}>
                Nothing logged for {monthName(month)} yet. Chai counts too.
              </StateBlock>
            ) : (
              <ul className="spend-list">
                {spent.map((c) => {
                  const value = Number(c.spent);
                  const budget = c.budget ? Number(c.budget) : null;
                  const over = budget && value > budget;
                  const warn = budget && !over && value >= budget * 0.8;
                  return (
                    <li key={c.categoryId}>
                      <div className="spend-list__head">
                        <span><span aria-hidden="true">{c.icon}</span> {c.name}{c.want && <span className="tag">want</span>}</span>
                        <span className="mono">
                          {rupees(value)}{budget ? <span className="muted"> / {rupees(budget)}</span> : null}
                        </span>
                      </div>
                      <div className={`bar${over ? ' bar--over' : warn ? ' bar--warn' : ''}`}>
                        <span style={{ width: `${(value * 100) / max}%` }} />
                        {budget && <i style={{ left: `min(${(budget * 100) / max}%, calc(100% - 2px))` }} title="Budget" />}
                      </div>
                      <div className="spend-list__meta mono">
                        {c.count} {c.count === 1 ? 'entry' : 'entries'}
                        {over && <Stamp tone="loss" size="sm">Over</Stamp>}
                        {warn && <Stamp size="sm">{value >= budget ? 'At limit' : '80%+'}</Stamp>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      <button className="fab" onClick={() => setAdding(true)} disabled={!categories.data} aria-label="Log expense">+</button>

      {adding && categories.data && (
        <QuickAdd categories={categories.data} topIds={topIds} onClose={() => setAdding(false)} onSaved={reload} />
      )}
    </>
  );
}

const cleanAmount = (text) => {
  const t = text.replace(/[^\d.]/g, '');
  const dot = t.indexOf('.');
  if (dot === -1) return t.slice(0, 12);
  return `${t.slice(0, dot).slice(0, 12)}.${t.slice(dot + 1).replace(/\./g, '').slice(0, 2)}`;
};

/** Top of the Ledger: the money ring and a few plain lines about it, or a nudge to set a salary. */
function FreeToSpend({ plan, month }) {
  if (plan.salary === null || plan.salary === undefined) {
    if (month < thisMonth()) return <p className="plan-note ring-wrap">No salary set for {monthName(month)}.</p>;
    return (
      <div className="plan-card">
        <p>Add your monthly salary to see what's free to spend.</p>
        <Link to="/app/expenses/plan" className="btn btn--ink">Add salary</Link>
      </div>
    );
  }
  const daily = plan.dailyAllowance !== null && plan.dailyAllowance !== undefined ? Number(plan.dailyAllowance) : null;
  const percent = plan.committedPercent;
  const over = Number(plan.remaining) < 0;
  return (
    <section className="ring-wrap" aria-label="Free to spend">
      <MoneyRing plan={plan} />
      <ul className="plan-lines">
        {Number(plan.freeToSpend) < 0 && <li className="is-loss">Your commitments are more than your income this month.</li>}
        {over && <li className="is-loss">You're {rupees(-Number(plan.remaining))} past what was free this month. It resets next month.</li>}
        {daily !== null && plan.daysLeft > 0 && (
          <li>{rupees(daily)} a day for the next {plan.daysLeft} {plan.daysLeft === 1 ? 'day' : 'days'}</li>
        )}
        {percent !== null && percent !== undefined && Number(plan.committedTotal) > 0 && (
          <li className={percent >= 50 ? 'is-loss' : percent >= 40 ? 'is-amber' : ''}>{percent}% of your income is committed</li>
        )}
        {(plan.endingSoon || []).map((e) => (
          <li key={e.id} className="is-gain">
            {e.name} ends in {shortMonth(e.endMonth)}: +{rupees(e.amount)} free from {shortMonth(nextMonth(e.endMonth))}
          </li>
        ))}
      </ul>
      {plan.daysLeft > 0 && <Afford plan={plan} />}
    </section>
  );
}

/** "Can I afford it?" Pure maths on the plan already loaded; nothing is sent anywhere. */
function Afford({ plan }) {
  const [text, setText] = useState('');
  const amount = Number(text);
  const remaining = Number(plan.remaining);
  let result = null;
  if (text !== '' && amount > 0) {
    const after = remaining - amount;
    if (after < 0) {
      result = `Doesn't fit this month: it's ${rupees(Math.max(1, Math.ceil(amount - Math.max(remaining, 0))))} more than what's free.`;
    } else {
      const daily = Math.floor(after / plan.daysLeft);
      result = `Fits. You'd have ${rupees(after)} left${daily > 0 ? `, about ${rupees(daily)} a day` : ''}.`;
    }
  }
  return (
    <div className="afford">
      <label className="field">
        <span className="field__label">Can I afford it?</span>
        <input className="field__input field__input--mono" inputMode="decimal" placeholder="Amount in rupees" value={text}
          onChange={(e) => setText(cleanAmount(e.target.value))} />
      </label>
      <p className="afford__result" aria-live="polite">{result}</p>
    </div>
  );
}
