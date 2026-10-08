import { useEffect, useState } from 'react';

export type PaidBy = 'partner1' | 'partner2' | 'joint';

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
  category: string;
  paidBy: PaidBy;
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

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export function money(n: number): string {
  return inr.format(n);
}
