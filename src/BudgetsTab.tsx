import { useState } from 'react';
import { CATEGORIES } from './categories';
import { Budgets, effectiveBudget, money, monthLabel, Partners } from './store';

interface Props {
  month: string;
  budgets: Budgets;
  setBudgets: (fn: (prev: Budgets) => Budgets) => void;
  partners: Partners;
  setPartners: (p: Partners) => void;
}

export default function BudgetsTab({ month, budgets, setBudgets, partners, setPartners }: Props) {
  const { budget, from } = effectiveBudget(budgets, month);
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const editing = draft !== null;

  function startEditing() {
    if (from && !confirm(`The budget is locked. Do you both agree to change it from ${monthLabel(month)} onwards?`)) return;
    setDraft(Object.fromEntries(CATEGORIES.map((c) => [c.id, budget[c.id] ? String(budget[c.id]) : ''])));
  }

  function save() {
    if (!draft) return;
    const next: Record<string, number> = {};
    for (const [id, v] of Object.entries(draft)) {
      const n = Number(v);
      if (n > 0) next[id] = n;
    }
    setBudgets((prev) => ({ ...prev, [month]: next }));
    setDraft(null);
  }

  const draftTotal = draft ? Object.values(draft).reduce((a, v) => a + (Number(v) || 0), 0) : 0;
  const total = Object.values(budget).reduce((a, b) => a + b, 0);
  const laterOverrides = Object.keys(budgets).filter((m) => m > month);

  return (
    <div className="stack">
      <section className="card">
        <div className="card-head">
          <h2>Monthly budget — {monthLabel(month)}</h2>
          {!editing && (
            <button className="primary" onClick={startEditing}>
              {from ? '🔒 Change budget' : 'Set budget'}
            </button>
          )}
        </div>

        {!editing && (
          <p className="muted">
            {from === null
              ? 'No budget yet. Set one amount per category; it applies to this month and every month after it until you change it.'
              : from === month
                ? 'Locked. This budget was set for this month and carries forward to later months.'
                : `Locked. Carried forward from ${monthLabel(from)}.`}
          </p>
        )}

        {editing && (
          <p className="muted">
            Enter the monthly amount for each category (leave blank for none). Saving applies from {monthLabel(month)}{' '}
            onwards
            {laterOverrides.length > 0 && `, until ${monthLabel(laterOverrides[0])} which has its own budget`}.
          </p>
        )}

        <table className="budget-table">
          <tbody>
            {CATEGORIES.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="num">
                  {editing ? (
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="1"
                      value={draft[c.id]}
                      onChange={(e) => setDraft({ ...draft, [c.id]: e.target.value })}
                      placeholder="0"
                    />
                  ) : budget[c.id] ? (
                    money(budget[c.id])
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td className="num">{money(editing ? draftTotal : total)}</td>
            </tr>
          </tfoot>
        </table>

        {editing && (
          <div className="actions">
            <button onClick={() => setDraft(null)}>Cancel</button>
            <button className="primary" onClick={save}>
              Save &amp; lock
            </button>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Who's who</h2>
        <div className="expense-form">
          <label>
            Partner 1
            <input value={partners.partner1} onChange={(e) => setPartners({ ...partners, partner1: e.target.value })} />
          </label>
          <label>
            Partner 2
            <input value={partners.partner2} onChange={(e) => setPartners({ ...partners, partner2: e.target.value })} />
          </label>
        </div>
      </section>
    </div>
  );
}
