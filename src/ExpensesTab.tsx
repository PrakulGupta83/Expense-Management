import { FormEvent, useMemo, useState } from 'react';
import { CATEGORIES, categoryName } from './categories';
import { LastAdded } from './AnalysisTab';
import { buildMonthWorkbook, saveFile } from './export';
import { SOURCES, sourceName } from './sources';
import { AppData, effectiveBudget, effectivePlan, Expense, money, monthLabel, today } from './store';

interface Props {
  month: string;
  expenses: Expense[];
  setExpenses: (fn: (prev: Expense[]) => Expense[]) => void;
  data: AppData;
  goToBudgets: () => void;
  onAdded: (added: LastAdded) => void;
}

export default function ExpensesTab({ month, expenses, setExpenses, data, goToBudgets, onAdded }: Props) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0].id);
  const { budgets, plans } = data;
  const plan = effectivePlan(budgets, plans, month);
  const plannedSource = plan[category]?.source;
  const [paidFrom, setPaidFrom] = useState<string>(plannedSource ?? SOURCES[0].id);
  const [sourceTouched, setSourceTouched] = useState(false);

  function pickCategory(id: string) {
    setCategory(id);
    // Follow the budget's planned source until the person picks one themselves.
    const planned = plan[id]?.source;
    if (planned && !sourceTouched) setPaidFrom(planned);
  }
  const [date, setDate] = useState(today());
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [exportNote, setExportNote] = useState<string | null>(null);

  async function downloadExcel() {
    setExportNote(null);
    const file = buildMonthWorkbook(month, data);
    const result = await saveFile(`Expenses ${month}.xlsx`, file);
    if (result === 'unavailable') setExportNote('Downloads are not available in this view.');
  }

  const { budget } = effectiveBudget(budgets, month);
  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date)),
    [expenses, month],
  );
  const spentByCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const e of monthExpenses) totals[e.category] = (totals[e.category] ?? 0) + e.amount;
    return totals;
  }, [monthExpenses]);

  const totalBudget = Object.values(budget).reduce((a, b) => a + b, 0);
  const totalSpent = monthExpenses.reduce((a, e) => a + e.amount, 0);
  const hasBudget = totalBudget > 0;

  function submit(ev: FormEvent) {
    ev.preventDefault();
    const value = Number(amount);
    if (!(value > 0)) return;
    const expense: Expense = {
      id: crypto.randomUUID(),
      date,
      amount: value,
      description: description.trim(),
      category,
      paidFrom,
    };
    setExpenses((prev) => [...prev, expense]);

    setAmount('');
    setDescription('');
    setSourceTouched(false);
    onAdded({ amount: value, category, month: date.slice(0, 7) });
  }

  function remove(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    setPendingDelete(null);
  }


  // Show categories that have a budget or spending this month.
  const rows = CATEGORIES.filter((c) => (budget[c.id] ?? 0) > 0 || (spentByCategory[c.id] ?? 0) > 0);

  return (
    <div className="stack">
      <section className="card">
        <h2>Add an expense</h2>
        <form className="expense-form" onSubmit={submit}>
          <label>
            Amount (₹)
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="2500"
            />
          </label>
          <label>
            Category
            <select value={category} onChange={(e) => pickCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="wide">
            Details
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Weekly vegetables from BigBasket"
            />
          </label>
          <label>
            Paid from
            <select
              value={paidFrom}
              onChange={(e) => {
                setPaidFrom(e.target.value);
                setSourceTouched(true);
              }}
            >
              {SOURCES.map((src) => (
                <option key={src.id} value={src.id}>
                  {src.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          {plannedSource && plannedSource !== paidFrom && (
            <p className="hint wide">
              The budget plans {categoryName(category)} from <strong>{sourceName(plannedSource)}</strong>. This amount will
              show under "Money to shift" in Analysis.
            </p>
          )}
          <button type="submit" className="primary wide">
            Add expense
          </button>
        </form>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Budget used — {monthLabel(month)}</h2>
          {hasBudget && (
            <span className="muted">
              {money(totalSpent)} of {money(totalBudget)}
            </span>
          )}
        </div>
        {!hasBudget && (
          <p className="muted">
            No budget set yet.{' '}
            <button className="link" onClick={goToBudgets}>
              Set your monthly budget
            </button>{' '}
            to see how much of each category is used.
          </p>
        )}
        {hasBudget && <ProgressRow label="Overall" spent={totalSpent} budget={totalBudget} bold />}
        {rows.map((c) => (
          <ProgressRow key={c.id} label={c.name} spent={spentByCategory[c.id] ?? 0} budget={budget[c.id] ?? 0} />
        ))}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Expenses in {monthLabel(month)}</h2>
          {monthExpenses.length > 0 && <button onClick={downloadExcel}>⬇ Download Excel</button>}
        </div>
        {exportNote && <p className="muted small">{exportNote}</p>}
        {monthExpenses.length === 0 ? (
          <p className="muted">Nothing recorded for this month yet.</p>
        ) : (
          <ul className="expense-list">
            {monthExpenses.map((e) => (
              <li key={e.id}>
                <div>
                  <strong>{money(e.amount)}</strong> · {categoryName(e.category)}
                  <div className="muted small">
                    {e.date} · {sourceName(e.paidFrom)}
                    {e.description && ` · ${e.description}`}
                  </div>
                </div>
                {pendingDelete === e.id ? (
                  <span className="confirm-inline">
                    <button className="danger" onClick={() => remove(e.id)}>
                      Delete
                    </button>
                    <button onClick={() => setPendingDelete(null)}>Keep</button>
                  </span>
                ) : (
                  <button className="icon" aria-label="Delete expense" onClick={() => setPendingDelete(e.id)}>
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ProgressRow({ label, spent, budget, bold }: { label: string; spent: number; budget: number; bold?: boolean }) {
  const pct = budget > 0 ? (spent / budget) * 100 : null;
  const level = pct === null ? 'none' : pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';
  return (
    <div className={`progress-row ${bold ? 'bold' : ''}`}>
      <div className="progress-label">
        <span>{label}</span>
        <span className="muted small">
          {money(spent)} / {budget > 0 ? money(budget) : 'no budget'}
          {pct !== null && <strong className={`pct ${level}`}> {pct.toFixed(1)}%</strong>}
        </span>
      </div>
      <div className="bar">
        <div className={`fill ${level}`} style={{ width: `${Math.min(pct ?? 100, 100)}%` }} />
      </div>
    </div>
  );
}
