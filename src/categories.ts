// Edit this list to add, remove or rename categories.
// `id` is what gets stored with each expense/budget, so keep it stable once you have data.
export const CATEGORIES = [
  { id: 'groceries', name: 'Groceries' },
  { id: 'rent', name: 'Rent' },
  { id: 'house-loan', name: 'House Loan EMI' },
  { id: 'car-loan', name: 'Car Loan EMI' },
  { id: 'utilities', name: 'Utilities (Electricity, Water, Gas)' },
  { id: 'internet-phone', name: 'Internet & Phone' },
  { id: 'fuel-transport', name: 'Fuel & Transport' },
  { id: 'dining-out', name: 'Dining Out & Food Delivery' },
  { id: 'household-help', name: 'Household Help' },
  { id: 'medical', name: 'Medical & Health' },
  { id: 'insurance', name: 'Insurance' },
  { id: 'shopping', name: 'Shopping & Clothing' },
  { id: 'entertainment', name: 'Entertainment & Subscriptions' },
  { id: 'travel', name: 'Travel' },
  { id: 'personal-care', name: 'Personal Care' },
  { id: 'gifts', name: 'Gifts & Donations' },
  { id: 'education', name: 'Education' },
  { id: 'investments', name: 'Savings & Investments' },
  { id: 'misc', name: 'Miscellaneous' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

export function categoryName(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.name ?? id;
}
