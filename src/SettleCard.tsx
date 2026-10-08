import { useState } from 'react';
import { categoryName } from './categories';
import { computeShifts } from './settle';
import { sourceName } from './sources';
import { AppData, effectivePlan, money, monthLabel, payerName, today, Transfer } from './store';

interface Props {
  month: string;
  data: AppData;
  setTransfers: (fn: (prev: Transfer[]) => Transfer[]) => void;
  goToBudgets: () => void;
}

/** Shows how much has to move between sources this month, and records shifts once they are made. */
export default function SettleCard({ month, data, setTransfers, goToBudgets }: Props) {
  const { expenses, budgets, plans, transfers, partners } = data;
  const plan = effectivePlan(budgets, plans, month);
  const shifts = computeShifts(month, expenses, plan, transfers);
  const done = transfers.filter((t) => t.month === month);
  const [pendingUndo, setPendingUndo] = useState<string | null>(null);
  const hasPlan = Object.values(plan).some((p) => p.source);

  function markDone(from: string, to: string, amount: number) {
    setTransfers((prev) => [...prev, { id: crypto.randomUUID(), month, from, to, amount, date: today() }]);
  }

  return (
    <section className="card" id="money-to-shift">
      <div className="card-head">
        <h2>Money to shift</h2>
        <span className="muted small">{monthLabel(month)}</span>
      </div>

      {!hasPlan ? (
        <p className="muted">
          Set a source for each category in{' '}
          <button className="link" onClick={goToBudgets}>
            Budgets
          </button>{' '}
          to see what needs to move when something is paid from a different source.
        </p>
      ) : shifts.length === 0 ? (
        <p className="settled">✓ All sources are settled. Everything was paid from its planned source, or has been shifted.</p>
      ) : (
        <ul className="shift-list">
          {shifts.map((s) => (
            <li key={`${s.from}|${s.to}`}>
              <div className="shift-main">
                <dl className="shift-route">
                  <div>
                    <dt>From</dt>
                    <dd>{sourceName(s.from)}</dd>
                  </div>
                  <div>
                    <dt>To</dt>
                    <dd>{sourceName(s.to)}</dd>
                  </div>
                </dl>
                <strong className="num">{money(s.amount)}</strong>
              </div>
              {s.items.length > 0 && (
                <div className="muted small">
                  For{' '}
                  {s.items
                    .map((i) => `${categoryName(i.category)} ${money(i.amount)}${i.payer ? ` (${payerName(i.payer, partners)} pays)` : ''}`)
                    .join(', ')}
                </div>
              )}
              <button className="primary shift-done" onClick={() => markDone(s.from, s.to, s.amount)}>
                Mark {money(s.amount)} as shifted
              </button>
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <details className="done-transfers">
          <summary>Shifts already made ({done.length})</summary>
          <ul>
            {done.map((t) => (
              <li key={t.id}>
                <span>
                  {t.date} · {sourceName(t.from)} → {sourceName(t.to)} · <strong>{money(t.amount)}</strong>
                </span>
                {pendingUndo === t.id ? (
                  <span className="confirm-inline">
                    <button
                      className="danger"
                      onClick={() => {
                        setTransfers((prev) => prev.filter((x) => x.id !== t.id));
                        setPendingUndo(null);
                      }}
                    >
                      Undo
                    </button>
                    <button onClick={() => setPendingUndo(null)}>Keep</button>
                  </span>
                ) : (
                  <button className="icon" aria-label="Undo this shift" onClick={() => setPendingUndo(t.id)}>
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
