import { useMemo } from 'react';
import { CATEGORIES } from './categories';
import { Budgets, effectiveBudget, Expense, money, monthLabel } from './store';

interface Props {
  month: string;
  expenses: Expense[];
  budgets: Budgets;
}

const LOOKBACK = 3;

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export default function AveragesTab({ month, expenses, budgets }: Props) {
  const { budget } = effectiveBudget(budgets, month);

  const byMonth = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const e of expenses) {
      const m = e.date.slice(0, 7);
      map[m] ??= {};
      map[m][e.category] = (map[m][e.category] ?? 0) + e.amount;
    }
    return map;
  }, [expenses]);

  const thisMonth = byMonth[month] ?? {};
  const monthExpenses = expenses.filter((e) => e.date.startsWith(month));
  const totalThisMonth = monthExpenses.reduce((a, e) => a + e.amount, 0);
  const totalBudget = Object.values(budget).reduce((a, b) => a + b, 0);

  // Days elapsed: today for the current month, the whole month for past months.
  const now = new Date();
  const nowMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const totalDays = daysInMonth(month);
  const daysElapsed = month === nowMonth ? now.getDate() : month < nowMonth ? totalDays : 0;
  const dailyAvg = daysElapsed > 0 ? totalThisMonth / daysElapsed : 0;
  const projected = dailyAvg * totalDays;
  const dailyAllowance = totalBudget > 0 ? totalBudget / totalDays : 0;

  // Previous months that have any spending, up to LOOKBACK of them.
  const pastMonths = Array.from({ length: LOOKBACK }, (_, i) => shiftMonth(month, -(i + 1))).filter((m) => byMonth[m]);
  const avgOf = (cat: string) =>
    pastMonths.length ? pastMonths.reduce((a, m) => a + (byMonth[m][cat] ?? 0), 0) / pastMonths.length : null;
  const pastTotalAvg = pastMonths.length
    ? pastMonths.reduce((a, m) => a + Object.values(byMonth[m]).reduce((x, y) => x + y, 0), 0) / pastMonths.length
    : null;

  const rows = CATEGORIES.filter(
    (c) => (budget[c.id] ?? 0) > 0 || (thisMonth[c.id] ?? 0) > 0 || pastMonths.some((m) => byMonth[m][c.id]),
  );
  const projectedLevel = totalBudget === 0 ? '' : projected > totalBudget ? 'over' : projected > totalBudget * 0.9 ? 'warn' : 'ok';

  return (
    <div className="stack">
      <section className="card">
        <h2>{monthLabel(month)} at a glance</h2>
        <dl className="stat-list">
          <div>
            <dt>Average spend per day</dt>
            <dd>{daysElapsed > 0 ? money(dailyAvg) : '—'}</dd>
          </div>
          {totalBudget > 0 && (
            <div>
              <dt>Budget allows per day</dt>
              <dd>{money(dailyAllowance)}</dd>
            </div>
          )}
          <div>
            <dt>Average per expense</dt>
            <dd>{monthExpenses.length ? money(totalThisMonth / monthExpenses.length) : '—'}</dd>
          </div>
          <div>
            <dt>Number of expenses</dt>
            <dd>{monthExpenses.length}</dd>
          </div>
          {daysElapsed > 0 && daysElapsed < totalDays && (
            <div>
              <dt>Month-end spend at this pace</dt>
              <dd className={`pct ${projectedLevel}`}>
                {money(projected)}
                {totalBudget > 0 && <span className="muted small"> of {money(totalBudget)}</span>}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="card">
        <h2>Monthly average by category</h2>
        <p className="muted small">
          {pastMonths.length
            ? `Average of the previous ${pastMonths.length === 1 ? 'month' : `${pastMonths.length} months`} with expenses (${pastMonths
                .slice()
                .reverse()
                .map(monthLabel)
                .join(', ')}), compared with ${monthLabel(month)}.`
            : `No expenses recorded in the ${LOOKBACK} months before ${monthLabel(month)} yet. Averages appear here once you have earlier months.`}
        </p>
        {rows.length > 0 && (
          <div className="table-scroll">
            <table className="avg-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="num">Avg / month</th>
                  <th className="num">This month</th>
                  <th className="num">Budget</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const avg = avgOf(c.id);
                  return (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td className="num">{avg === null ? '—' : money(avg)}</td>
                      <td className="num">{money(thisMonth[c.id] ?? 0)}</td>
                      <td className="num">{budget[c.id] ? money(budget[c.id]) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td className="num">{pastTotalAvg === null ? '—' : money(pastTotalAvg)}</td>
                  <td className="num">{money(totalThisMonth)}</td>
                  <td className="num">{totalBudget ? money(totalBudget) : '—'}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
