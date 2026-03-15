
// Budget Planner component
import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../store/FinanceContext';
import { formatCurrency } from '../utils/formatters';
import { Periodicity, Budget, TransactionType } from '../types';
import { ANNUAL_MULTIPLIERS } from '../utils/calculations';

const FREQUENCIES: Periodicity[] = [
  'Daily', 'Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'Half-Yearly', 'Annually'
];

interface TemplateItem {
  name: string;
  type: TransactionType;
  frequency: Periodicity;
}

const BUDGET_TEMPLATE: TemplateItem[] = [
  { name: 'Salary', type: 'Income', frequency: 'Monthly' },
  { name: 'House Rent', type: 'Income', frequency: 'Monthly' },
  { name: 'Rent', type: 'Expense', frequency: 'Monthly' },
  { name: 'Term Insurance Premium', type: 'Expense', frequency: 'Monthly' },
  { name: 'Bike Insurance Premium', type: 'Expense', frequency: 'Annually' },
  { name: 'Car Insurance Premium', type: 'Expense', frequency: 'Annually' },
  { name: 'Internet Recharge', type: 'Expense', frequency: 'Monthly' },
  { name: 'Maintenance bill', type: 'Expense', frequency: 'Monthly' },
  { name: 'Electricity Bill', type: 'Expense', frequency: 'Monthly' },
  { name: 'Health Insurance Premium', type: 'Expense', frequency: 'Monthly' },
  { name: 'Phone Recharge', type: 'Expense', frequency: 'Annually' },
  { name: 'AMC Charges', type: 'Expense', frequency: 'Quarterly' },
  { name: 'Health and Fitness', type: 'Expense', frequency: 'Monthly' },
  { name: 'Conveyance', type: 'Expense', frequency: 'Monthly' },
  { name: 'Donation', type: 'Expense', frequency: 'Monthly' },
  { name: 'Entertainment Expenses', type: 'Expense', frequency: 'Monthly' },
  { name: 'Food', type: 'Expense', frequency: 'Monthly' },
  { name: 'Groceries', type: 'Expense', frequency: 'Monthly' },
  { name: 'Fuel Expenses', type: 'Expense', frequency: 'Monthly' },
  { name: 'Medical Expenses', type: 'Expense', frequency: 'Monthly' },
  { name: 'Miscellaneous Expenses', type: 'Expense', frequency: 'Monthly' },
  { name: 'Repairs and Maintenance', type: 'Expense', frequency: 'Monthly' },
  { name: 'Shopping Expenses', type: 'Expense', frequency: 'Monthly' },
  { name: 'Personal Care/ Grooming', type: 'Expense', frequency: 'Monthly' },
  { name: 'Social Expenses', type: 'Expense', frequency: 'Monthly' },
  { name: 'Travelling', type: 'Expense', frequency: 'Monthly' },
  { name: 'Gifting', type: 'Expense', frequency: 'Monthly' },
  { name: 'Education Expenses', type: 'Expense', frequency: 'Monthly' },
  { name: 'Daily House Help', type: 'Expense', frequency: 'Monthly' },
];

type ViewWindow = 'This Month' | 'This Quarter' | 'This Half Year' | 'This Financial Year' | 'This Calendar Year' | 'Custom';

const BudgetPlanner: React.FC = () => {
  const { filteredState, state, addBudget, updateBudget, deleteBudget, setIsNavHidden } = useFinance();
  const [showModal, setShowModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTemplateIndices, setSelectedTemplateIndices] = useState<Set<number>>(new Set());
  const currency = state.profile.currency;

  const [viewWindowType, setViewWindowType] = useState<ViewWindow>('This Month');
  const [customViewStart, setCustomViewStart] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [customViewEnd, setCustomViewEnd] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setIsNavHidden(showModal || showTemplateModal);
    return () => setIsNavHidden(false);
  }, [showModal, showTemplateModal, setIsNavHidden]);

  const [formData, setFormData] = useState<Partial<Budget> & { amountPerPeriod: number }>({
    category: '',
    type: 'Expense',
    amount: 0,
    amountPerPeriod: 0,
    frequency: 'Monthly',
    periodType: 'Financial',
    startDate: '',
    endDate: '',
    dueDate: ''
  });

  const getPeriodDates = (type: 'Financial' | 'Calendar' | 'Custom') => {
    const now = new Date();
    const currentYear = now.getFullYear();
    if (type === 'Calendar') {
      return { start: `${currentYear}-01-01`, end: `${currentYear}-12-31` };
    } else if (type === 'Financial') {
      const startYear = now.getMonth() < 3 ? currentYear - 1 : currentYear;
      return { start: `${startYear}-04-01`, end: `${startYear + 1}-03-31` };
    }
    return { start: formData.startDate || '', end: formData.endDate || '' };
  };

  /**
   * Refined to use proper union types for indexing to prevent 'unknown' index type errors.
   */
  const getWindowMultiplier = (view: ViewWindow, freq: Periodicity): number => {
    // Correctly index into ANNUAL_MULTIPLIERS using the Periodicity type
    // FIXED: Cast keys to strings for Record lookup to avoid unknown index errors
    if (view === 'This Financial Year' || view === 'This Calendar Year') return (ANNUAL_MULTIPLIERS as Record<string, number>)[freq as string] || 1;
    
    const map: Record<ViewWindow, Record<string, number>> = {
      'This Month': { 'Daily': 30, 'Weekly': 4, 'Fortnightly': 2, 'Monthly': 1, 'Quarterly': 0.33, 'Half-Yearly': 0.16, 'Annually': 0.083 },
      'This Quarter': { 'Daily': 91, 'Weekly': 13, 'Fortnightly': 6, 'Monthly': 3, 'Quarterly': 1, 'Half-Yearly': 0.5, 'Annually': 0.25 },
      'This Half Year': { 'Daily': 182, 'Weekly': 26, 'Fortnightly': 13, 'Monthly': 6, 'Quarterly': 2, 'Half-Yearly': 1, 'Annually': 0.5 },
      'This Financial Year': { 'Daily': 365, 'Weekly': 52, 'Fortnightly': 26, 'Monthly': 12, 'Quarterly': 4, 'Half-Yearly': 2, 'Annually': 1 },
      'This Calendar Year': { 'Daily': 365, 'Weekly': 52, 'Fortnightly': 26, 'Monthly': 12, 'Quarterly': 4, 'Half-Yearly': 2, 'Annually': 1 },
      'Custom': { 'Daily': 30, 'Weekly': 4, 'Fortnightly': 2, 'Monthly': 1, 'Quarterly': 0.33, 'Half-Yearly': 0.16, 'Annually': 0.083 }
    };
    
    const periodMap = map[view];
    // FIXED: Cast keys to strings for Record lookup
    return (periodMap as Record<string, number>)[freq as string] || 1;
  };

  const currentAnalysisWindow = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    if (viewWindowType === 'This Month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (viewWindowType === 'This Quarter') {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1);
      end = new Date(now.getFullYear(), (q + 1) * 3, 0, 23, 59, 59);
    } else if (viewWindowType === 'This Half Year') {
      const h = Math.floor(now.getMonth() / 6);
      start = new Date(now.getFullYear(), h * 6, 1);
      end = new Date(now.getFullYear(), (h + 1) * 6, 0, 23, 59, 59);
    } else if (viewWindowType === 'This Financial Year') {
      const startYear = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
      start = new Date(startYear, 3, 1);
      end = new Date(startYear + 1, 2, 31, 23, 59, 59);
    } else if (viewWindowType === 'This Calendar Year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    } else if (viewWindowType === 'Custom') {
      start = new Date(customViewStart);
      end = new Date(customViewEnd);
      end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  }, [viewWindowType, customViewStart, customViewEnd]);

  const budgetsWithAnalytics = useMemo(() => {
    const { start: windowStart, end: windowEnd } = currentAnalysisWindow;
    return (filteredState.budgets || []).map((b: Budget) => {
      const bStart = new Date(b.startDate);
      const bEnd = new Date(b.endDate);
      // Ensure destructured windowStart and bStart are valid for comparison
      const effectiveStart = new Date(Math.max(bStart.getTime(), windowStart.getTime()));
      const effectiveEnd = new Date(Math.min(bEnd.getTime(), windowEnd.getTime()));
      
      const hasOverlap = effectiveStart.getTime() <= effectiveEnd.getTime();
      
      const windowActual = hasOverlap 
        ? (filteredState.transactions || [])
          .filter(t => t.type === (b.type || 'Expense') && t.nature === b.category && new Date(t.date) >= effectiveStart && new Date(t.date) <= effectiveEnd)
          .reduce((sum, t) => sum + t.amount, 0)
        : 0;
        
      const multiplier = getWindowMultiplier(viewWindowType, b.frequency);
      // FIXED: Cast frequency to string and index into Record<string, number> for type safety
      const annualMult = (ANNUAL_MULTIPLIERS as Record<string, number>)[b.frequency as string] || 1;
      const amountPerFreq = b.amount / annualMult;
      const dynamicTarget = amountPerFreq * multiplier;
      return { ...b, windowActual, dynamicTarget, amountPerFreq, hasOverlap };
    });
  }, [filteredState.budgets, filteredState.transactions, currentAnalysisWindow, viewWindowType]);

  const calculateTotal = (amountPerPeriod: number, frequency: string) => {
    const multiplier = (ANNUAL_MULTIPLIERS as Record<string, number>)[frequency] || 1;
    return amountPerPeriod * multiplier;
  };

  const handleOpenModal = (b?: Budget) => {
    if (b) {
      setEditingId(b.id);
      // FIXED: Cast frequency to string and index into Record<string, number>
      const annualMult = (ANNUAL_MULTIPLIERS as Record<string, number>)[b.frequency as string] || 1;
      setFormData({ ...b, amountPerPeriod: b.amount / annualMult, type: b.type || 'Expense' });
    } else {
      setEditingId(null);
      const dates = getPeriodDates('Financial');
      setFormData({ category: '', type: 'Expense', amount: 0, amountPerPeriod: 0, frequency: 'Monthly', periodType: 'Financial', startDate: dates.start, endDate: dates.end, dueDate: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dates = getPeriodDates(formData.periodType as any);
    const budgetData: Budget = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      category: formData.category || 'General',
      type: formData.type as TransactionType,
      amount: Number(formData.amount),
      frequency: formData.frequency as Periodicity,
      startDate: dates.start,
      endDate: dates.end,
      dueDate: formData.dueDate,
      periodType: formData.periodType as any,
      ownerId: ''
    };
    if (editingId) updateBudget(budgetData);
    else addBudget(budgetData);
    setShowModal(false);
  };

  const handleImportTemplate = () => {
    const dates = getPeriodDates('Financial');
    const selectedTemplates = Array.from(selectedTemplateIndices).map(idx => BUDGET_TEMPLATE[idx]);
    
    selectedTemplates.forEach(t => {
      const exists = filteredState.budgets.some(b => b.category === t.name && b.type === t.type);
      if (!exists) {
        const budgetData: Budget = {
          id: Math.random().toString(36).substr(2, 9),
          category: t.name,
          type: t.type,
          amount: 0,
          frequency: t.frequency,
          startDate: dates.start,
          endDate: dates.end,
          periodType: 'Financial',
          ownerId: ''
        };
        addBudget(budgetData);
      }
    });
    
    setShowTemplateModal(false);
    setSelectedTemplateIndices(new Set());
  };

  const toggleTemplateSelection = (idx: number) => {
    const next = new Set(selectedTemplateIndices);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedTemplateIndices(next);
  };

  const incomeBudgets = budgetsWithAnalytics.filter(b => b.type === 'Income');
  const expenseBudgets = budgetsWithAnalytics.filter(b => b.type === 'Expense');

  const renderBudgetTable = (budgets: typeof budgetsWithAnalytics, title: string) => (
    <div className="mb-8 last:mb-0">
       <h3 className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/50 border-y border-slate-100">{title}</h3>
       <table className="w-full text-left border-collapse table-fixed">
          <thead className="bg-white text-slate-400 text-[8px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
            <tr>
              <th className="px-4 py-4 w-[28%] md:w-[30%]">Particulars</th>
              <th className="px-3 py-4 w-[15%] hidden md:table-cell">Recurrence</th>
              <th className="px-3 py-4 text-right w-[20%]">Performance</th>
              <th className="px-4 py-4 text-center w-[25%]">Efficiency Health</th>
              <th className="px-3 py-4 text-center w-[12%]">Tools</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {budgets.map(b => {
              const efficiency = b.dynamicTarget > 0 ? Math.min(100, (b.windowActual / b.dynamicTarget) * 100) : (b.windowActual > 0 ? 100 : 0);
              const isOver = b.windowActual > b.dynamicTarget;
              const isIncome = b.type === 'Income';

              return (
                <tr key={b.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight truncate">{b.category}</p>
                          <span className={`text-[6px] font-black px-1 py-0.5 rounded uppercase ${isIncome ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-500 border border-rose-100'}`}>{b.type?.charAt(0)}</span>
                      </div>
                      <p className="text-[7px] font-bold text-slate-300 uppercase mt-0.5">{b.frequency} Recurrence</p>
                    </div>
                  </td>
                  <td className="px-3 py-4 hidden md:table-cell">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{b.frequency}</span>
                  </td>
                  <td className="px-3 py-4 text-right">
                    <div className="flex flex-col">
                        <p className={`text-[10px] font-black ${isOver && !isIncome ? 'text-rose-500' : isIncome && b.windowActual >= b.dynamicTarget ? 'text-emerald-500' : 'text-slate-800'}`}>
                          {formatCurrency(b.windowActual, currency).replace('.00', '')}
                        </p>
                        <p className="text-[8px] font-bold text-slate-300 uppercase">Target: {formatCurrency(b.dynamicTarget, currency).replace('.00', '')}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                      {!b.hasOverlap ? <div className="text-center text-[7px] font-black text-slate-300 uppercase italic">Out of Range</div> : (
                        <div className="flex flex-col items-center">
                          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden max-w-[80px] mb-1">
                            <div className={`h-full transition-all duration-700 ${isIncome ? 'bg-emerald-500' : isOver ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${efficiency}%` }}></div>
                          </div>
                          <span className={`text-[8px] font-black uppercase tracking-widest ${isOver && !isIncome ? 'text-rose-400' : 'text-slate-400'}`}>{efficiency.toFixed(0)}%</span>
                        </div>
                      )}
                  </td>
                  <td className="px-3 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleOpenModal(b)} className="text-indigo-400 hover:text-indigo-600 transition-colors text-sm">✎</button>
                        <button onClick={() => deleteBudget(b.id)} className="text-rose-300 hover:text-rose-500 transition-colors text-sm">✕</button>
                      </div>
                  </td>
                </tr>
              );
            })}
            {budgets.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">No {title.toLowerCase()} heads found.</td>
              </tr>
            )}
          </tbody>
       </table>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 max-w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 md:px-0">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Budget Planner</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Plan your budget</p>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={() => setShowTemplateModal(true)} className="px-5 py-3.5 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95">Template Provisioning</button>
           <button onClick={() => handleOpenModal()} className="px-5 py-3.5 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">+ Add Income/Expense Head</button>
        </div>
      </div>

      <div className="bg-white p-2 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-50/50 rounded-2xl">
            {(['This Month', 'This Quarter', 'This Half Year', 'This Financial Year', 'This Calendar Year', 'Custom'] as ViewWindow[]).map(type => (
              <button 
                key={type} 
                onClick={() => setViewWindowType(type)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewWindowType === type ? 'bg-black text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {type}
              </button>
            ))}
          </div>
          
          {viewWindowType === 'Custom' && (
             <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
                <input type="date" value={customViewStart} onChange={e => setCustomViewStart(e.target.value)} className="text-[10px] font-black uppercase outline-none text-slate-600" />
                <span className="text-slate-300">-</span>
                <input type="date" value={customViewEnd} onChange={e => setCustomViewEnd(e.target.value)} className="text-[10px] font-black uppercase outline-none text-slate-600" />
             </div>
          )}

          <div className="px-6 text-[9px] font-black text-indigo-600 uppercase tracking-widest">
            {currentAnalysisWindow.start.toLocaleDateString()} — {currentAnalysisWindow.end.toLocaleDateString()}
          </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="w-full">
           {renderBudgetTable(incomeBudgets, 'Income Categories')}
           {renderBudgetTable(expenseBudgets, 'Expense Categories')}
        </div>
      </div>

      {showTemplateModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4" onClick={() => setShowTemplateModal(false)}>
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 md:p-10 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 shrink-0">
               <div>
                 <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Template Provisioning</h3>
                 <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-1">Select Vault Heads to Automatically Create Accounts</p>
               </div>
               <button onClick={() => setShowTemplateModal(false)} className="text-slate-300 hover:text-slate-800 text-2xl font-black">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
               {BUDGET_TEMPLATE.map((t, idx) => (
                 <div 
                   key={idx} 
                   onClick={() => toggleTemplateSelection(idx)}
                   className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${selectedTemplateIndices.has(idx) ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}
                 >
                    <div className="flex items-center gap-4">
                       <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedTemplateIndices.has(idx) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                          {selectedTemplateIndices.has(idx) && <span className="text-white text-[12px]">✔</span>}
                       </div>
                       <div>
                          <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{t.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                             <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-sm uppercase ${t.type === 'Income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{t.type}</span>
                             <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{t.frequency}</span>
                          </div>
                       </div>
                    </div>
                 </div>
               ))}
            </div>

            <div className="flex gap-3 pt-8 shrink-0">
               <button onClick={() => setShowTemplateModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black text-[10px] uppercase rounded-2xl">Abort</button>
               <button 
                 onClick={handleImportTemplate}
                 disabled={selectedTemplateIndices.size === 0}
                 className="flex-[2] py-4 bg-black text-white font-black text-[10px] uppercase rounded-2xl shadow-xl shadow-slate-900/20 disabled:opacity-50 transition-all active:scale-95"
               >
                 Provision {selectedTemplateIndices.size} Heads
               </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white w-full max-xl rounded-[2.5rem] p-8 md:p-10 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-8">{editingId ? 'Modify Head' : 'Add Income/Expense Head'}</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-2">Head Name</label>
                  <input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-xs uppercase" placeholder="E.G. GROCERIES" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-2">Transaction Type</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as TransactionType})}>
                     <option value="Expense">Expense</option>
                     <option value="Income">Income</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-2">Period Audit</label>
                    <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none" value={formData.periodType} onChange={e => {
                      const dates = getPeriodDates(e.target.value as any);
                      setFormData({...formData, periodType: e.target.value as any, startDate: dates.start, endDate: dates.end});
                    }}>
                      <option value="Financial">Financial Year</option>
                      <option value="Calendar">Calendar Year</option>
                      <option value="Custom">Custom Period</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-2">Recurrence</label>
                    <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none" value={formData.frequency} onChange={e => {
                      const freq = e.target.value as Periodicity;
                      setFormData({...formData, frequency: freq, amount: calculateTotal(formData.amountPerPeriod || 0, freq)});
                    }}>
                       {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                 </div>
              </div>
              
              {formData.periodType === 'Custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-2">From Date</label>
                    <input type="date" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-xs" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-2">To Date</label>
                    <input type="date" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-xs" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                  </div>
                </div>
              )}

              <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block ml-1 mb-2">Target Per Cycle ({formData.frequency})</label>
                <input required type="number" step="any" className="w-full p-4 bg-white border border-indigo-200 rounded-xl outline-none font-black text-xl text-indigo-600" value={formData.amountPerPeriod} onChange={e => {
                  const val = Number(e.target.value);
                  setFormData({...formData, amountPerPeriod: val, amount: calculateTotal(val, formData.frequency || 'Monthly')});
                }} />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black text-[10px] uppercase rounded-2xl">Abort</button>
                <button type="submit" className="flex-[2] py-4 bg-black text-white font-black text-[10px] uppercase rounded-2xl shadow-xl transition-all active:scale-95">Commit Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetPlanner;
