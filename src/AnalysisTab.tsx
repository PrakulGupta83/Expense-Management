import { useMemo } from 'react';
import { CATEGORIES, categoryName } from './categories';
import SettleCard from './SettleCard';
import { AppData, Budgets, effectiveBudget, Expense, money, monthLabel, Transfer } from './store';

export interface LastAdded {
  amount: number;
  category: string;
  month: string;
}

interface Props {
  month: string;
  expenses: Expense[];
  budgets: Budgets;
  category: string;
  setCategory: (id: string) => void;
  lastAdded: LastAdded | null;
  goToExpenses: () => void;
  goToBudgets: () => void;
  data: AppData;
  setTransfers: (fn: (prev: Transfer[]) => Transfer[]) => void;
}

export default function AnalysisTab(props: Props) {
  const { month, expenses, budgets, category, setCategory, lastAdded, goToExpenses, goToBudgets, data, setTransfers } = props;
  const { budget } = effectiveBudget(budgets, month);

  const spentByCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const e of expenses) if (e.date.startsWith(month)) totals[e.category] = (totals[e.category] ?? 0) + e.amount;
    return totals;
  }, [expenses, month]);

  const totalBudget = Object.values(budget).reduce((a, b) => a + b, 0);
  const totalSpent = Object.values(spentByCategory).reduce((a, b) => a + b, 0);
  const others = CATEGORIES.filter(
    (c) => c.id !== category && ((budget[c.id] ?? 0) > 0 || (spentByCategory[c.id] ?? 0) > 0),
  );

  function pick(id: string) {
    setCategory(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="stack">
      {lastAdded && (
        <div className="added-banner">
          <span>
            Added <strong>{money(lastAdded.amount)}</strong> to {categoryName(lastAdded.category)}.
          </span>
          <button onClick={goToExpenses}>+ Add another</button>
        </div>
      )}

      {totalBudget === 0 && (
        <p className="card muted">
          No budget set for {monthLabel(month)} yet, so there is nothing to compare against.{' '}
          <button className="link" onClick={goToBudgets}>
            Set your monthly budget
          </button>
        </p>
      )}

      <div className="chart-grid">
        <section className="card">
          <div className="card-head">
            <h2>{categoryName(category)}</h2>
            {others.length > 0 && (
              <a className="link small" href="#other-categories">
                Other categories ↓
              </a>
            )}
          </div>
          <BudgetDonut label={categoryName(category)} spent={spentByCategory[category] ?? 0} budget={budget[category] ?? 0} />
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Overall budget</h2>
            <span className="muted small">{monthLabel(month)}</span>
          </div>
          <BudgetDonut label="Overall" spent={totalSpent} budget={totalBudget} />
        </section>
      </div>

      <SettleCard month={month} data={data} setTransfers={setTransfers} goToBudgets={goToBudgets} />

      <section className="card" id="other-categories">
        <h2>Other categories</h2>
        {others.length === 0 ? (
          <p className="muted">No other category has a budget or spending this month.</p>
        ) : (
          <ul className="category-links">
            {others.map((c) => {
              const b = budget[c.id] ?? 0;
              const s = spentByCategory[c.id] ?? 0;
              const pct = b > 0 ? (s / b) * 100 : null;
              return (
                <li key={c.id}>
                  <button onClick={() => pick(c.id)}>
                    <span>{c.name}</span>
                    <span className="muted small">
                      {pct === null ? money(s) : `${pct.toFixed(0)}% used`} ›
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function BudgetDonut({ label, spent, budget }: { label: string; spent: number; budget: number }) {
  const R = 60;
  const C = 2 * Math.PI * R;
  const pct = budget > 0 ? (spent / budget) * 100 : null;
  const over = pct !== null && pct > 100;
  const level = pct === null ? 'none' : pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';
  const frac = pct === null ? 0 : Math.min(pct, 100) / 100;
  const remaining = Math.max(budget - spent, 0);
  // 2px gap between the spent and remaining slices when both are visible.
  const gap = frac > 0 && frac < 1 ? 2 : 0;
  const spentLen = Math.max(frac * C - gap, 0);
  const restLen = Math.max((1 - frac) * C - gap, 0);

  const summary =
    pct === null
      ? `${label}: ${money(spent)} spent, no budget set`
      : `${label}: ${money(spent)} spent of ${money(budget)} (${pct.toFixed(1)}%)`;

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 160 160" className="donut" role="img" aria-label={summary}>
        <g transform="rotate(-90 80 80)">
          <circle cx="80" cy="80" r={R} className="donut-rest" strokeDasharray={`${restLen} ${C}`} strokeDashoffset={-(frac * C + gap / 2)}>
            <title>{pct === null ? 'No budget set' : `Remaining: ${money(remaining)}`}</title>
          </circle>
          {spentLen > 0 && (
            <circle cx="80" cy="80" r={R} className={`donut-spent ${level}`} strokeDasharray={`${spentLen} ${C}`} strokeDashoffset={-gap / 2}>
              <title>{`Spent: ${money(spent)}`}</title>
            </circle>
          )}
        </g>
        <text x="80" y="78" textAnchor="middle" className="donut-pct">
          {pct === null ? '—' : `${pct.toFixed(pct < 10 ? 1 : 0)}%`}
        </text>
        <text x="80" y="98" textAnchor="middle" className="donut-sub">
          {over ? 'over budget' : 'used'}
        </text>
      </svg>
      <dl className="donut-legend">
        <div>
          <dt>
            <i className={`swatch ${level}`} /> Spent
          </dt>
          <dd>{money(spent)}</dd>
        </div>
        <div>
          <dt>
            <i className="swatch rest" /> {over ? 'Over by' : 'Remaining'}
          </dt>
          <dd>{budget > 0 ? money(over ? spent - budget : remaining) : '—'}</dd>
        </div>
        <div>
          <dt>Budget</dt>
          <dd>{budget > 0 ? money(budget) : 'Not set'}</dd>
        </div>
      </dl>
    </div>
  );
}
