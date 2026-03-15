
import React, { useState, Suspense, lazy } from 'react';
import { FinanceProvider, useFinance } from './store/FinanceContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import { TransactionType } from './types';

// Eager load main components for instant navigation
import Accounts from './components/Accounts';
import Statements from './components/Statements';
import Profile from './components/Profile';
import Transactions from './components/Transactions';
import Rewards from './components/Rewards';
import BudgetPlanner from './components/BudgetPlanner';
import FiscalSentinel from './components/FiscalSentinel';
import Ranking from './components/Ranking';
import StaffManager from './components/StaffManager';
import RentalManager from './components/RentalManager';
import TaxManager from './components/TaxManager';

// Lazy load Onboarding as it's only used once
const Onboarding = lazy(() => import('./components/Onboarding'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full min-h-[50vh]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading</p>
    </div>
  </div>
);

const MainApp: React.FC = () => {
  const { state, isAuthenticated } = useFinance();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [initialTxType, setInitialTxType] = useState<TransactionType>('Expense');
  const [initialAccountId, setInitialAccountId] = useState<string | null>(null);

  const handleNavigate = (tab: string, txType?: TransactionType, accountId?: string) => {
    setActiveTab(tab);
    if (txType) setInitialTxType(txType);
    if (accountId) setInitialAccountId(accountId);
  };

  if (!isAuthenticated || !state.profile.isBoarded) {
    return (
      <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-slate-50"><LoadingFallback /></div>}>
        <Onboarding />
      </Suspense>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <Suspense fallback={<LoadingFallback />}>
        {activeTab === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
        {activeTab === 'rankings' && <Ranking />}
        {activeTab === 'transactions' && <Transactions initialType={initialTxType} initialAccountId={initialAccountId} />}
        {activeTab === 'accounts' && <Accounts onNavigate={handleNavigate} />}
        {activeTab === 'statements' && <Statements onNavigate={handleNavigate} />}
        {activeTab === 'profile' && <Profile />}
        {activeTab === 'rewards' && <Rewards />}
        {activeTab === 'budget' && <BudgetPlanner />}
        {activeTab === 'calendar' && <FiscalSentinel />}
        {activeTab === 'staff' && <StaffManager />}
        {activeTab === 'rentals' && <RentalManager />}
        {activeTab === 'taxes' && <TaxManager />}
      </Suspense>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <FinanceProvider>
      <MainApp />
    </FinanceProvider>
  );
};

export default App;
