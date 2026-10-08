import { useEffect, useState } from 'react';

export type PaidBy = 'partner1' | 'partner2' | 'joint';

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
  category: string;
  /** Source (bank account / card) the money actually came from. */
  paidFrom?: string;
  /** Older entries recorded who paid instead of the source. */
  paidBy?: PaidBy;
}

/** Planned source and responsible person for a category, set in the budget. */
export interface PlanLine {
  source?: string;
  payer?: PaidBy;
}
export type MonthPlan = Record<string, PlanLine>;
/** Stored under the same month keys as Budgets, saved together with them. */
export type BudgetPlans = Record<string, MonthPlan>;

/** A shift of money between sources that the couple has already made. */
export interface Transfer {
  id: string;
  month: string; // YYYY-MM the shift settles
  from: string;
  to: string;
  amount: number;
  date: string;
}

// Budgets are stored per month ("YYYY-MM" -> category -> amount).
// A month without its own budget uses the most recent earlier month's budget,
// so the couple sets it once and it carries forward until they change it.
export type MonthBudget = Record<string, number>;
export type Budgets = Record<string, MonthBudget>;

export interface Partners {
  partner1: string;
  partner2: string;
}

/** Everything the app stores, passed around for exports and summaries. */
export interface AppData {
  expenses: Expense[];
  budgets: Budgets;
  plans: BudgetPlans;
  transfers: Transfer[];
  partners: Partners;
}

function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage unavailable (private window, blocked site data); keep working in memory.
    }
  }, [key, value]);
  return [value, setValue] as const;
}

export function useExpenses() {
  return usePersistentState<Expense[]>('cem.expenses', []);
}

export function useBudgets() {
  return usePersistentState<Budgets>('cem.budgets', {});
}

export function useBudgetPlans() {
  return usePersistentState<BudgetPlans>('cem.budgetPlans', {});
}

export function useTransfers() {
  return usePersistentState<Transfer[]>('cem.transfers', []);
}

export function usePartners() {
  return usePersistentState<Partners>('cem.partners', { partner1: 'Partner 1', partner2: 'Partner 2' });
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function today(): string {
  const d = new Date();
  return `${currentMonth()}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Budget in effect for `month`, plus the month it was defined in (null if none yet). */
export function effectiveBudget(budgets: Budgets, month: string): { budget: MonthBudget; from: string | null } {
  const from = Object.keys(budgets)
    .filter((m) => m <= month)
    .sort()
    .pop();
  return from ? { budget: budgets[from], from } : { budget: {}, from: null };
}

/** Plan (source + payer) in effect for `month`; it follows the same month as the budget amounts. */
export function effectivePlan(budgets: Budgets, plans: BudgetPlans, month: string): MonthPlan {
  const { from } = effectiveBudget(budgets, month);
  return from ? (plans[from] ?? {}) : {};
}

export function payerName(p: PaidBy | undefined, partners: Partners): string {
  if (!p) return '—';
  return p === 'joint' ? 'Joint' : partners[p];
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export function money(n: number): string {
  return inr.format(n);
}
