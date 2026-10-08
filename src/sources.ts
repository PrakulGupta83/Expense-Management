// Edit this list to add, remove or rename payment sources.
// `id` is stored with expenses and budgets, so keep it stable once you have data.
export const SOURCES = [
  { id: 'idfc-home', name: 'IDFC Bank – Home expense' },
  { id: 'bob-card', name: 'BoB Card' },
  { id: 'icici', name: 'ICICI' },
  { id: 'pnb', name: 'PnB' },
  { id: 'auto-debit', name: 'Auto debit' },
] as const;

export function sourceName(id: string | undefined): string {
  if (!id) return 'Not recorded';
  return SOURCES.find((s) => s.id === id)?.name ?? id;
}
