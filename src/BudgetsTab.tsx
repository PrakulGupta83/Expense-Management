import { useState } from 'react';
import { CATEGORIES } from './categories';
import { SOURCES, sourceName } from './sources';
import { BudgetPlans, Budgets, effectiveBudget, effectivePlan, money, monthLabel, PaidBy, Partners, payerName } from './store';

interface DraftLine {
  amount: string;
  source: string;
  payer: string;
}

interface Props {
  month: string;
  budgets: Budgets;
  setBudgets: (fn: (prev: Budgets) => Budgets) => void;
  plans: BudgetPlans;
  setPlans: (fn: (prev: BudgetPlans) => BudgetPlans) => void;
  partners: Partners;
  setPartners: (p: Partners) => void;
}

export default function BudgetsTab({ month, budgets, setBudgets, plans, setPlans, partners, setPartners }: Props) {
  const { budget, from } = effectiveBudget(budgets, month);
  const plan = effectivePlan(budgets, plans, month);
  const [draft, setDraft] = useState<Record<string, DraftLine> | null>(null);
  const [confirming, setConfirming] = useState(false);
  const editing = draft !== null;

  function startEditing() {
    setConfirming(false);
    setDraft(
      Object.fromEntries(
        CATEGORIES.map((c) => [
          c.id,
          { amount: budget[c.id] ? String(budget[c.id]) : '', source: plan[c.id]?.source ?? '', payer: plan[c.id]?.payer ?? '' },
        ]),
      ),
    );
  }

  function save() {
    if (!draft) return;
    const next: Record<string, number> = {};
    const nextPlan: BudgetPlans[string] = {};
    for (const [id, line] of Object.entries(draft)) {
      const n = Number(line.amount);
      if (n > 0) next[id] = n;
      if (line.source || line.payer)
        nextPlan[id] = { source: line.source || undefined, payer: (line.payer || undefined) as PaidBy | undefined };
    }
    setBudgets((prev) => ({ ...prev, [month]: next }));
    setPlans((prev) => ({ ...prev, [month]: nextPlan }));
    setDraft(null);
  }

  const draftTotal = draft ? Object.values(draft).reduce((a, v) => a + (Number(v.amount) || 0), 0) : 0;
  const total = Object.values(budget).reduce((a, b) => a + b, 0);
  const laterOverrides = Object.keys(budgets).filter((m) => m > month);

  return (
    <div className="stack">
      <section className="card">
        <div className="card-head">
          <h2>Monthly budget — {monthLabel(month)}</h2>
          {!editing && !confirming && (
            <button className="primary" onClick={from ? () => setConfirming(true) : startEditing}>
              {from ? '🔒 Change budget' : 'Set budget'}
            </button>
          )}
        </div>

        {confirming && (
          <div className="confirm-box">
            <p>The budget is locked. Do you both agree to change it from {monthLabel(month)} onwards?</p>
            <div className="actions">
              <button onClick={() => setConfirming(false)}>Keep current budget</button>
              <button className="primary" onClick={startEditing}>
                Yes, change it
              </button>
            </div>
          </div>
        )}

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
            Enter the monthly amount for each category (leave blank for none), the source it should be paid from and who pays it. Saving applies from {monthLabel(month)}{' '}
            onwards
            {laterOverrides.length > 0 && `, until ${monthLabel(laterOverrides[0])} which has its own budget`}.
          </p>
        )}

        <ul className="budget-list">
          {CATEGORIES.map((c) => {
            const line = draft?.[c.id];
            return (
              <li key={c.id}>
                <div className="budget-row">
                  <span>{c.name}</span>
                  {line ? (
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="1"
                      aria-label={`${c.name} budget`}
                      value={line.amount}
                      onChange={(e) => setDraft({ ...draft!, [c.id]: { ...line, amount: e.target.value } })}
                      placeholder="0"
                    />
                  ) : budget[c.id] ? (
                    <strong className="num">{money(budget[c.id])}</strong>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </div>
                {line ? (
                  <div className="budget-plan">
                    <select
                      aria-label={`${c.name} source`}
                      value={line.source}
                      onChange={(e) => setDraft({ ...draft!, [c.id]: { ...line, source: e.target.value } })}
                    >
                      <option value="">Source…</option>
                      {SOURCES.map((src) => (
                        <option key={src.id} value={src.id}>
                          {src.name}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label={`${c.name} who pays`}
                      value={line.payer}
                      onChange={(e) => setDraft({ ...draft!, [c.id]: { ...line, payer: e.target.value } })}
                    >
                      <option value="">Who pays…</option>
                      <option value="joint">Joint</option>
                      <option value="partner1">{partners.partner1}</option>
                      <option value="partner2">{partners.partner2}</option>
                    </select>
                  </div>
                ) : (
                  (plan[c.id]?.source || plan[c.id]?.payer) && (
                    <div className="muted small">
                      {[plan[c.id]?.source && sourceName(plan[c.id]?.source), plan[c.id]?.payer && payerName(plan[c.id]?.payer, partners)]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  )
                )}
              </li>
            );
          })}
          <li className="budget-row total">
            <span>Total</span>
            <strong className="num">{money(editing ? draftTotal : total)}</strong>
          </li>
        </ul>

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
