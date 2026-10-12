import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Expenses } from '../../api/client';
import { monthName, rupees, thisMonth } from '../../format';
import useRemote from '../../lib/useRemote';
import { Shimmer, Stamp, StateBlock } from '../../ui';
import QuickAdd from './QuickAdd';
import WishCard from './WishCard';
import './expense.css';
import './WishCard.css';

/** ExpenseMitra front page: month headline, spend by category against budgets, could-have-bought cards. */
export default function Overview() {
  const [month, setMonth] = useState(thisMonth());
  const [adding, setAdding] = useState(false);
  const summary = useRemote(() => Expenses.summary(month), [month]);
  const categories = useRemote(() => Expenses.categories(), []);
  const s = summary.data;

  const reload = () => { summary.reload(); };
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
        <div className="kicker">The Daily Ledger · {monthName(month)}</div>
        {s ? (
          <h1>{rupees(s.total)} spent{month === thisMonth() ? ' so far' : ''}.</h1>
        ) : <h1>Your money, in print.</h1>}
        <p>
          {change === null ? 'Log every spend for a month and the paper starts talking back.'
            : Math.round(change) === 0 ? `About the same as last month (${rupees(s.lastMonthTotal)}).`
              : change > 0 ? `That's ${Math.round(change)}% more than last month (${rupees(s.lastMonthTotal)}).`
                : `That's ${Math.round(-change)}% less than last month (${rupees(s.lastMonthTotal)}). Nice.`}
        </p>
        <div className="ledger-toolbar">
          <input type="month" className="field__input field__input--mono month-input" value={month} max={thisMonth()}
            onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Month" />
          <button className="btn btn--primary" onClick={() => setAdding(true)} disabled={!categories.data}>+ Log expense</button>
        </div>
      </div>

      {summary.loading && <Shimmer rows={5} />}
      {summary.error && (
        <StateBlock error stamp="Press jam" title="Can't print your ledger right now."
          action={<button className="btn" onClick={summary.reload}>Try again</button>}>
          {summary.error.message}
        </StateBlock>
      )}

      {s && (
        <>
          {overall && (
            <div className={`budget-meter${usedPct >= 100 ? ' budget-meter--over' : usedPct >= 80 ? ' budget-meter--warn' : ''}`}>
              <div className="budget-meter__label">
                <span className="kicker">Monthly cap</span>
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
                <span className="muted">From your “want, not need” spends in {month.slice(0, 4)}.</span>
              </div>
              <div className="wish-grid">
                {s.couldHaveBought.map((card, i) => <WishCard key={card.categoryId} card={card} index={i} year={month.slice(0, 4)} />)}
              </div>
            </section>
          )}

          <section style={{ marginTop: 32 }}>
            <div className="section-head">
              <h2>Where it went</h2>
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
                        {budget && <i style={{ left: `${(budget * 100) / max}%` }} title="Budget" />}
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
