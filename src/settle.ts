import { Expense, MonthPlan, PaidBy, Transfer } from './store';

export interface ShiftItem {
  category: string;
  payer?: PaidBy;
  amount: number;
}

export interface Shift {
  from: string; // source that should have paid (planned)
  to: string; // source that actually paid
  amount: number; // still to move, after transfers already made
  items: ShiftItem[]; // expenses behind it, grouped by category
}

/**
 * Works out how much money has to move between sources for `month`.
 * An expense paid from a source other than its category's planned source means
 * the planned source owes the actual one. Opposite directions are netted, and
 * transfers already recorded are subtracted.
 */
export function computeShifts(month: string, expenses: Expense[], plan: MonthPlan, transfers: Transfer[]): Shift[] {
  const gross = new Map<string, Map<string, number>>(); // "from|to" -> category -> amount
  const key = (a: string, b: string) => `${a}|${b}`;
  for (const e of expenses) {
    if (!e.date.startsWith(month) || !e.paidFrom) continue;
    const planned = plan[e.category]?.source;
    if (!planned || planned === e.paidFrom) continue;
    const k = key(planned, e.paidFrom);
    const byCat = gross.get(k) ?? new Map<string, number>();
    byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
    gross.set(k, byCat);
  }
  const done = new Map<string, number>();
  for (const t of transfers) if (t.month === month) done.set(key(t.from, t.to), (done.get(key(t.from, t.to)) ?? 0) + t.amount);

  const sum = (m?: Map<string, number>) => [...(m?.values() ?? [])].reduce((a, b) => a + b, 0);
  const pairs = new Set<string>();
  for (const k of [...gross.keys(), ...done.keys()]) {
    const [a, b] = k.split('|');
    pairs.add(a < b ? key(a, b) : key(b, a));
  }

  const shifts: Shift[] = [];
  for (const p of pairs) {
    const [a, b] = p.split('|');
    const net = sum(gross.get(key(a, b))) - sum(gross.get(key(b, a))) - (done.get(key(a, b)) ?? 0) + (done.get(key(b, a)) ?? 0);
    if (Math.abs(net) < 0.5) continue;
    const [from, to] = net > 0 ? [a, b] : [b, a];
    const items = [...(gross.get(key(from, to)) ?? new Map()).entries()].map(([category, amount]) => ({
      category,
      payer: plan[category]?.payer,
      amount,
    }));
    shifts.push({ from, to, amount: Math.round(Math.abs(net) * 100) / 100, items });
  }
  return shifts.sort((x, y) => y.amount - x.amount);
}
