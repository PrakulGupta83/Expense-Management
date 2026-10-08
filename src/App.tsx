import { useState } from 'react';
import ExpensesTab from './ExpensesTab';
import BudgetsTab from './BudgetsTab';
import ChartsTab, { LastAdded } from './ChartsTab';
import { CATEGORIES } from './categories';
import { currentMonth, useBudgets, useExpenses, usePartners } from './store';

type Tab = 'expenses' | 'charts' | 'budgets';

export default function App() {
  const [tab, setTab] = useState<Tab>('expenses');
  const [month, setMonth] = useState(currentMonth());
  const [expenses, setExpenses] = useExpenses();
  const [budgets, setBudgets] = useBudgets();
  const [partners, setPartners] = usePartners();
  const [chartCategory, setChartCategory] = useState<string>(CATEGORIES[0].id);
  const [lastAdded, setLastAdded] = useState<LastAdded | null>(null);

  function go(next: Tab) {
    setTab(next);
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Our Expenses</h1>
        <label className="month-picker">
          Month
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </label>
      </header>

      <nav className="tabs">
        <button className={tab === 'expenses' ? 'active' : ''} onClick={() => go('expenses')}>
          Expenses
        </button>
        <button className={tab === 'charts' ? 'active' : ''} onClick={() => { setLastAdded(null); go('charts'); }}>
          Charts
        </button>
        <button className={tab === 'budgets' ? 'active' : ''} onClick={() => go('budgets')}>
          Budgets
        </button>
      </nav>

      <main>
        {tab === 'expenses' ? (
          <ExpensesTab
            month={month}
            expenses={expenses}
            setExpenses={setExpenses}
            budgets={budgets}
            partners={partners}
            goToBudgets={() => go('budgets')}
            onAdded={(added) => {
              setLastAdded(added);
              setChartCategory(added.category);
              setMonth(added.month);
              go('charts');
            }}
          />
        ) : tab === 'charts' ? (
          <ChartsTab
            month={month}
            expenses={expenses}
            budgets={budgets}
            category={chartCategory}
            setCategory={setChartCategory}
            lastAdded={lastAdded}
            goToExpenses={() => go('expenses')}
            goToBudgets={() => go('budgets')}
          />
        ) : (
          <BudgetsTab
            month={month}
            budgets={budgets}
            setBudgets={setBudgets}
            partners={partners}
            setPartners={setPartners}
          />
        )}
      </main>
      <footer className="version muted small">Version 4 · Expenses, Charts, Budgets</footer>
    </div>
  );
}
