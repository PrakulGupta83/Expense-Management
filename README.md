# Couple Expense Manager

A small web app for a couple to track day-to-day spending against a monthly budget.

## Tabs

- **Expenses**: add an expense with its amount, details, category, who paid (either partner or joint) and date. Each category shows a progress bar with how much of its monthly budget is used. For example, ₹2,500 of a ₹25,000 groceries budget shows 10%.
- **Averages**: daily average, average per expense, month-end projection, and each category's monthly average over the previous 3 months.
- **Budgets**: set a monthly amount for each category. Once saved, the budget is **locked** and carries forward to every later month. It changes only when you click "Change budget" and confirm. Partner names are also set here.

After you add an expense, the **Analysis** tab opens with pie charts for that category and for the overall budget, plus links to every other category.

Use the month picker at the top to look at any month.

## Categories

Edit `src/categories.ts` to add, rename or remove categories.

## Running

```bash
npm install
npm run dev      # local development
npm run build    # production build in dist/
```

Data is saved in the browser's localStorage, so it stays on the device/browser where it was entered. Use **Download Excel** on the Expenses tab to export a month (Expenses + Budget summary sheets).
