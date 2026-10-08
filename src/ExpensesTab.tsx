import { FormEvent, useMemo, useState } from 'react';
import { CATEGORIES, categoryName } from './categories';
import { LastAdded } from './ChartsTab';
import { Budgets, effectiveBudget, Expense, money, monthLabel, PaidBy, Partners, today } from './store';

interface Props {
  month: string;
  expenses: Expense[];
  setExpenses: (fn: (prev: Expense[]) => Expense[]) => void;
  budgets: Budgets;
  partners: Partners;
  goToBudgets: () => void;
  onAdded: (added: LastAdded) => void;
}

export default function ExpensesTab({ month, expenses, setExpenses, budgets, partners, goToBudgets, onAdded }: Props) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0].id);
  const [paidBy, setPaidBy] = useState<PaidBy>('joint');
  const [date, setDate] = useState(today());
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

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
      paidBy,
    };
    setExpenses((prev) => [...prev, expense]);

    setAmount('');
    setDescription('');
    onAdded({ amount: value, category, month: date.slice(0, 7) });
  }

  function remove(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    setPendingDelete(null);
  }

  const payerName = (p: PaidBy) => (p === 'joint' ? 'Joint' : partners[p]);

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
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
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
            Paid by
            <select value={paidBy} onChange={(e) => setPaidBy(e.target.value as PaidBy)}>
              <option value="joint">Joint</option>
              <option value="partner1">{partners.partner1}</option>
              <option value="partner2">{partners.partner2}</option>
            </select>
          </label>
          <label>
            Date
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
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
        <h2>Expenses in {monthLabel(month)}</h2>
        {monthExpenses.length === 0 ? (
          <p className="muted">Nothing recorded for this month yet.</p>
        ) : (
          <ul className="expense-list">
            {monthExpenses.map((e) => (
              <li key={e.id}>
                <div>
                  <strong>{money(e.amount)}</strong> · {categoryName(e.category)}
                  <div className="muted small">
                    {e.date} · {payerName(e.paidBy)}
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
