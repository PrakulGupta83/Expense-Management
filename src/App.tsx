import { useState } from 'react';
import ExpensesTab from './ExpensesTab';
import BudgetsTab from './BudgetsTab';
import AnalysisTab, { LastAdded } from './AnalysisTab';
import AveragesTab from './AveragesTab';
import { CATEGORIES } from './categories';
import { DriveStatus, useDriveSync } from './DriveSync';
import { AppData, currentMonth, useBudgetPlans, useBudgets, useExpenses, usePartners, useTransfers } from './store';

type Tab = 'expenses' | 'analysis' | 'averages' | 'budgets';

export default function App() {
  const [tab, setTab] = useState<Tab>('expenses');
  const [month, setMonth] = useState(currentMonth());
  const [expenses, setExpenses] = useExpenses();
  const [budgets, setBudgets] = useBudgets();
  const [partners, setPartners] = usePartners();
  const [plans, setPlans] = useBudgetPlans();
  const [transfers, setTransfers] = useTransfers();
  const data: AppData = { expenses, budgets, plans, transfers, partners };
  const [chartCategory, setChartCategory] = useState<string>(CATEGORIES[0].id);
  const [lastAdded, setLastAdded] = useState<LastAdded | null>(null);
  const drive = useDriveSync(month, data);

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
        <button className={tab === 'analysis' ? 'active' : ''} onClick={() => { setLastAdded(null); go('analysis'); }}>
          Analysis
        </button>
        <button className={tab === 'averages' ? 'active' : ''} onClick={() => go('averages')}>
          Averages
        </button>
        <button className={tab === 'budgets' ? 'active' : ''} onClick={() => go('budgets')}>
          Budgets
        </button>
      </nav>
      <DriveStatus sync={drive} month={month} />

      <main>
        {tab === 'expenses' ? (
          <ExpensesTab
            month={month}
            expenses={expenses}
            setExpenses={setExpenses}
            data={data}
            goToBudgets={() => go('budgets')}
            onAdded={(added) => {
              setLastAdded(added);
              setChartCategory(added.category);
              setMonth(added.month);
              go('analysis');
            }}
          />
        ) : tab === 'analysis' ? (
          <AnalysisTab
            month={month}
            expenses={expenses}
            budgets={budgets}
            category={chartCategory}
            setCategory={setChartCategory}
            lastAdded={lastAdded}
            goToExpenses={() => go('expenses')}
            goToBudgets={() => go('budgets')}
            data={data}
            setTransfers={setTransfers}
          />
        ) : tab === 'averages' ? (
          <AveragesTab month={month} expenses={expenses} budgets={budgets} />
        ) : (
          <BudgetsTab
            month={month}
            budgets={budgets}
            setBudgets={setBudgets}
            plans={plans}
            setPlans={setPlans}
            partners={partners}
            setPartners={setPartners}
          />
        )}
      </main>
      <footer className="version muted small">Version 7 · Expenses, Analysis, Averages, Budgets</footer>
    </div>
  );
}
