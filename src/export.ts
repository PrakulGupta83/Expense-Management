import { utils, write } from 'xlsx';
import { CATEGORIES, categoryName } from './categories';
import { Budgets, effectiveBudget, Expense, monthLabel, Partners } from './store';

type ClaudeWindow = { claude?: { use?: (name: string) => Promise<any> } };

/** Builds an .xlsx with every expense of `month` plus a budget summary sheet. */
export function buildMonthWorkbook(month: string, expenses: Expense[], budgets: Budgets, partners: Partners): ArrayBuffer {
  const payer = (p: Expense['paidBy']) => (p === 'joint' ? 'Joint' : partners[p]);
  const rows = expenses
    .filter((e) => e.date.startsWith(month))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({
      Date: e.date,
      Category: categoryName(e.category),
      Details: e.description,
      'Paid by': payer(e.paidBy),
      'Amount (₹)': e.amount,
    }));
  const total = rows.reduce((a, r) => a + r['Amount (₹)'], 0);
  const expenseSheet = utils.json_to_sheet([...rows, { Date: '', Category: '', Details: '', 'Paid by': 'Total', 'Amount (₹)': total }]);
  expenseSheet['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 40 }, { wch: 14 }, { wch: 14 }];

  const { budget } = effectiveBudget(budgets, month);
  const spent: Record<string, number> = {};
  for (const r of expenses) if (r.date.startsWith(month)) spent[r.category] = (spent[r.category] ?? 0) + r.amount;
  const summary = CATEGORIES.filter((c) => (budget[c.id] ?? 0) > 0 || (spent[c.id] ?? 0) > 0).map((c) => {
    const b = budget[c.id] ?? 0;
    const s = spent[c.id] ?? 0;
    return {
      Category: c.name,
      'Budget (₹)': b,
      'Spent (₹)': s,
      'Remaining (₹)': b - s,
      '% used': b > 0 ? Math.round((s / b) * 1000) / 10 : '',
    };
  });
  const summarySheet = utils.json_to_sheet(summary);
  summarySheet['!cols'] = [{ wch: 34 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }];

  const wb = utils.book_new();
  utils.book_append_sheet(wb, expenseSheet, 'Expenses');
  utils.book_append_sheet(wb, summarySheet, 'Budget summary');
  wb.Props = { Title: `Expenses ${monthLabel(month)}` };
  return write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
}

/**
 * Saves the file. Inside the claude.ai viewer this goes through its downloads
 * capability (the viewer confirms); anywhere else it is a normal browser download.
 */
export async function saveFile(filename: string, data: ArrayBuffer): Promise<'saved' | 'declined' | 'unavailable'> {
  const claude = (window as unknown as ClaudeWindow).claude;
  if (claude?.use) {
    const downloads = await claude.use('downloads');
    if (!downloads) return 'unavailable';
    try {
      await downloads.save({ filename, data: new Blob([data]) });
      return 'saved';
    } catch (err: any) {
      return err?.code === 'declined' ? 'declined' : 'unavailable';
    }
  }
  const url = URL.createObjectURL(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'saved';
}
