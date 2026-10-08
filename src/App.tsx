import { useState } from 'react';
import ExpensesTab from './ExpensesTab';
import BudgetsTab from './BudgetsTab';
import { currentMonth, useBudgets, useExpenses, usePartners } from './store';

type Tab = 'expenses' | 'budgets';

export default function App() {
  const [tab, setTab] = useState<Tab>('expenses');
  const [month, setMonth] = useState(currentMonth());
  const [expenses, setExpenses] = useExpenses();
  const [budgets, setBudgets] = useBudgets();
  const [partners, setPartners] = usePartners();

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
        <button className={tab === 'expenses' ? 'active' : ''} onClick={() => setTab('expenses')}>
          Expenses
        </button>
        <button className={tab === 'budgets' ? 'active' : ''} onClick={() => setTab('budgets')}>
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
            goToBudgets={() => setTab('budgets')}
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
    </div>
  );
}
