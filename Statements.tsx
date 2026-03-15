
import React, { useState, useMemo } from 'react';
import { useFinance } from '../store/FinanceContext';
import { calculateNetWorth, calculateAllocatedExpenseBreakdown } from '../utils/calculations';
import { formatCurrency } from '../utils/formatters';
import { AccountClassification, TransactionType } from '../types';
import { MoreVertical } from 'lucide-react';

type Period = 'current_month' | 'last_90_days' | 'ytd' | 'all_time' | 'custom';

const Statements: React.FC<{ onNavigate?: (tab: string, type?: TransactionType, accountId?: string) => void }> = ({ onNavigate }) => {
  const { state, filteredState, activeMemberIds } = useFinance();
  const [activePeriod, setActivePeriod] = useState<Period>('all_time');
  const [customStart, setCustomStart] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);
  const [expandedHeads, setExpandedHeads] = useState<string[]>(['Current Asset', 'Non-Current Asset', 'Current Liability', 'Non-Current Liability', 'Equity', 'P_L_Income', 'P_L_Expense']);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const currency = filteredState.profile.currency;

  const { start, end, periodLabel } = useMemo(() => {
    const now = new Date();
    let s = new Date(0);
    let e = new Date();
    let label = '';

    if (activePeriod === 'current_month') {
      s = new Date(now.getFullYear(), now.getMonth(), 1);
      e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      label = s.toLocaleString('default', { month: 'long', year: 'numeric' });
    } else if (activePeriod === 'last_90_days') {
      s = new Date(); s.setDate(now.getDate() - 90);
      label = 'Last 90 Days';
    } else if (activePeriod === 'ytd') {
      s = new Date(now.getFullYear(), 0, 1);
      label = `YTD ${now.getFullYear()}`;
    } else if (activePeriod === 'custom') {
      s = new Date(customStart);
      e = new Date(customEnd);
      e.setHours(23, 59, 59, 999);
      label = `${s.toLocaleDateString()} - ${e.toLocaleDateString()}`;
    } else {
        label = 'All Time';
    }
    return { start: s, end: e, periodLabel: label };
  }, [activePeriod, customStart, customEnd]);

  // P&L Breakdown Logic
  const incomeBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    (filteredState.transactions || [])
      .filter(t => t.type === 'Income' && new Date(t.date) >= start && new Date(t.date) <= end)
      .forEach(t => {
        const nature = t.nature || 'General Income';
        breakdown[nature] = (breakdown[nature] || 0) + t.amount;
      });
    return breakdown;
  }, [filteredState.transactions, start, end]);

  const expenseBreakdown = useMemo(() => {
    return calculateAllocatedExpenseBreakdown(filteredState.transactions || [], start, end);
  }, [filteredState.transactions, start, end]);

  const totalIncome = (Object.values(incomeBreakdown) as number[]).reduce((a, b) => a + b, 0);
  const totalExpense = (Object.values(expenseBreakdown) as number[]).reduce((a, b) => a + b, 0);
  const netSurplus = totalIncome - totalExpense;

  // Balance Sheet Logic
  const { netWorth } = calculateNetWorth(filteredState);
  const isAllView = activeMemberIds.includes('all');
  const isMeView = activeMemberIds.length === 0;
  const capitalDisplay = isAllView ? state.capital : (isMeView ? state.capital : 0);
  const retainedEarnings = netWorth - capitalDisplay;

  const heads = useMemo(() => {
    const data: Record<AccountClassification, { total: number, items: any[] }> = {
      'Current Asset': { total: 0, items: [] },
      'Non-Current Asset': { total: 0, items: [] },
      'Current Liability': { total: 0, items: [] },
      'Non-Current Liability': { total: 0, items: [] },
      'Equity': { total: 0, items: [] }
    };

    const processAccount = (id: string, name: string, balance: number, classification: AccountClassification, source: string) => {
      let cls = classification;
      let val = balance;
      if (source === 'Bank' || source === 'Wallet') cls = 'Current Asset';
      if (val < 0 && (cls === 'Current Asset' || cls === 'Non-Current Asset')) { cls = 'Current Liability'; val = Math.abs(val); }
      
      data[cls].total += val;
      data[cls].items.push({ id, name, value: val, source });
    };

    // Identify Security Deposit Liabilities
    const securityDepositIds = new Set((filteredState.tenants || []).map(t => t.securityDepositLiabilityAccountId));

    filteredState.banks.forEach(b => processAccount(b.id, b.name, b.balance, b.classification || 'Current Asset', 'Bank'));
    filteredState.wallets.forEach(w => processAccount(w.id, w.name, w.balance, w.classification || 'Current Asset', 'Wallet'));
    filteredState.cards.forEach(c => processAccount(c.id, c.lenderName, c.balance, c.classification || 'Current Liability', 'Credit'));
    filteredState.assets.forEach(a => processAccount(a.id, a.name, a.value, a.classification || 'Non-Current Asset', 'Manual Asset'));
    
    // Process Income Tax Receivable
    const taxTransactions = (filteredState.transactions || []).filter(t => t.nature.toLowerCase().includes('tax'));
    const totalTaxPaid = taxTransactions.reduce((sum, t) => sum + t.amount, 0);
    if (totalTaxPaid > 0) {
      processAccount('tax_receivable', 'Income Tax Receivable', totalTaxPaid, 'Current Asset', 'Tax');
    }

    // Process Liabilities (excluding Security Deposits which are handled separately)
    filteredState.liabilities.forEach(l => {
        if (!securityDepositIds.has(l.id)) {
            processAccount(l.id, l.name, l.amount, l.classification || 'Current Liability', 'Manual Debt');
        }
    });

    // Process Security Deposits with Time-Based Classification
    (filteredState.tenants || []).forEach(t => {
        const liability = filteredState.liabilities.find(l => l.id === t.securityDepositLiabilityAccountId);
        if (liability) {
            const leaseEnd = new Date(t.endDate);
            const reportEnd = new Date(end);
            const oneYearFromNow = new Date(reportEnd);
            oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

            let classification: AccountClassification = 'Non-Current Liability';
            // If lease ends within 12 months of report date, it's Current
            if (leaseEnd <= oneYearFromNow) {
                classification = 'Current Liability';
            }
            
            processAccount(liability.id, liability.name, liability.amount, classification, 'Security Deposit');
        }
    });

    data['Equity'].total = capitalDisplay + retainedEarnings;
    data['Equity'].items.push({ id: 'owner_cap', name: 'Owner Capital Account', value: capitalDisplay, source: 'Equity' });
    data['Equity'].items.push({ id: 'retained_earning', name: 'Retained Earnings', value: retainedEarnings, source: 'Equity' });
    return data;
  }, [filteredState, capitalDisplay, retainedEarnings, end]);

  const toggleHead = (head: string) => setExpandedHeads(prev => prev.includes(head) ? prev.filter(h => h !== head) : [...prev, head]);

  const totalAssets = heads['Non-Current Asset'].total + heads['Current Asset'].total;
  const totalEquityLiabilities = heads['Equity'].total + heads['Non-Current Liability'].total + heads['Current Liability'].total;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 px-4 md:px-0">
        <div>
          <h2 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight uppercase">Reports</h2>
        </div>
        <div className="flex flex-wrap items-center gap-1 bg-white p-1 border border-slate-200 rounded-full shadow-sm">
          {(['current_month', 'all_time', 'custom'] as Period[]).map(p => (
            <button key={p} onClick={() => setActivePeriod(p)} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase transition-all ${activePeriod === p ? 'bg-black text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
              {p.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {activePeriod === 'custom' && (
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center animate-in slide-in-from-top-4">
           <div className="flex-1 space-y-1 w-full">
             <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Range Start</label>
             <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black outline-none" value={customStart} onChange={e => setCustomStart(e.target.value)} />
           </div>
           <div className="flex-1 space-y-1 w-full">
             <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Range End</label>
             <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black outline-none" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
           </div>
        </div>
      )}

      {/* Summary P&L Card */}
      <section className="bg-slate-900 md:rounded-[2.5rem] p-10 md:p-12 text-white shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 text-8xl font-black text-white/5 pointer-events-none uppercase">AUDIT</div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
          <div className="text-center md:text-left">
            <h3 className="text-[10px] font-black tracking-[0.3em] text-indigo-400 uppercase mb-2">Profit & Loss Summary</h3>
            <p className={`text-4xl md:text-6xl font-black tracking-tighter ${netSurplus >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(netSurplus, currency)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-center md:text-right border-l border-white/10 pl-8">
            <div><p className="text-[9px] font-black text-slate-500 uppercase mb-1">Total Income</p><p className="text-xl font-black text-emerald-400">{formatCurrency(totalIncome, currency)}</p></div>
            <div><p className="text-[9px] font-black text-slate-500 uppercase mb-1">Amortized Expense</p><p className="text-xl font-black text-rose-400">{formatCurrency(totalExpense, currency)}</p></div>
          </div>
        </div>
      </section>

      {/* Income Statement */}
      <section className="bg-white border md:rounded-[2.5rem] border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-slate-50/80 p-6 md:p-10 border-b border-slate-200">
           <h3 className="text-sm font-black tracking-[0.2em] text-slate-800 uppercase">Income Statement for {periodLabel}</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {/* Income Drilldown */}
          <div className="overflow-hidden">
             <button onClick={() => toggleHead('P_L_Income')} className="w-full flex justify-between items-center p-6 md:p-8 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                   <div className="w-2 h-2 rounded-full bg-emerald-500" />
                   <div className="text-left">
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Gross Income Items</span>
                   </div>
                </div>
                <span className="text-lg font-black text-emerald-600">{formatCurrency(totalIncome, currency)}</span>
             </button>
             {expandedHeads.includes('P_L_Income') && (
               <div className="px-8 md:px-12 pb-8 space-y-3 animate-in slide-in-from-top-2">
                  {Object.entries(incomeBreakdown).map(([nature, amount]) => (
                    <div key={nature} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                       <span className="text-[11px] font-black text-slate-500 uppercase tracking-tight">{nature}</span>
                       <span className="text-[11px] font-black text-slate-700">{formatCurrency(amount as number, currency)}</span>
                    </div>
                  ))}
                  {Object.keys(incomeBreakdown).length === 0 && <p className="text-[9px] font-black text-slate-300 uppercase italic py-4">No income records in range</p>}
               </div>
             )}
          </div>

          {/* Expense Drilldown */}
          <div className="overflow-hidden">
             <button onClick={() => toggleHead('P_L_Expense')} className="w-full flex justify-between items-center p-6 md:p-8 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                   <div className="w-2 h-2 rounded-full bg-rose-500" />
                   <div className="text-left">
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Amortized Expenses</span>
                   </div>
                </div>
                <span className="text-lg font-black text-rose-500">{formatCurrency(totalExpense, currency)}</span>
             </button>
             {expandedHeads.includes('P_L_Expense') && (
               <div className="px-8 md:px-12 pb-8 space-y-3 animate-in slide-in-from-top-2">
                  {Object.entries(expenseBreakdown).map(([nature, amount]) => (
                    <div key={nature} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                       <span className="text-[11px] font-black text-slate-500 uppercase tracking-tight">{nature}</span>
                       <span className="text-[11px] font-black text-slate-700">{formatCurrency(amount as number, currency)}</span>
                    </div>
                  ))}
                  {Object.keys(expenseBreakdown).length === 0 && <p className="text-[9px] font-black text-slate-300 uppercase italic py-4">No expense records in range</p>}
               </div>
             )}
          </div>

          {/* Surplus/Deficit */}
          <div className={`p-6 md:p-10 flex justify-between items-center ${netSurplus >= 0 ? 'bg-emerald-50/30' : 'bg-rose-50/30'}`}>
             <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${netSurplus >= 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                  {netSurplus >= 0 ? '📈' : '📉'}
                </div>
                <div className="text-left">
                   <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Net Surplus / (Deficit)</span>
                </div>
             </div>
             <span className={`text-2xl font-black ${netSurplus >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(netSurplus, currency)}
             </span>
          </div>
        </div>
      </section>

      {/* Balance Sheet */}
      <section className="bg-white border md:rounded-[2.5rem] border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-slate-50 p-10 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
             <h3 className="text-sm font-black tracking-widest uppercase mb-1">Balance Sheet as on {end.toLocaleDateString()}</h3>
             <p className="text-4xl font-black tracking-tighter text-indigo-600">{formatCurrency(netWorth, currency)}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
           {/* ASSETS */}
           <div className="p-8 space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">ASSETS</h4>
              {['Non-Current Asset', 'Current Asset'].map(head => (
                <div key={head} className="border border-slate-100 rounded-2xl overflow-hidden">
                  <button onClick={() => toggleHead(head)} className="w-full flex justify-between items-center p-5 bg-slate-50/50 hover:bg-white transition-colors">
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{head}</span>
                    <span className="text-xs font-black">{formatCurrency(heads[head as AccountClassification].total, currency)}</span>
                  </button>
                  {expandedHeads.includes(head) && (
                    <div className="p-4 space-y-2 bg-white animate-in slide-in-from-top-2">
                       {heads[head as AccountClassification].items.map(item => (
                         <div key={item.id} className="flex justify-between items-center text-[11px] font-bold text-slate-500 py-1 group relative">
                           <span className="uppercase flex-1 truncate">{item.name}</span>
                           <div className="flex items-center gap-3">
                              <span>{formatCurrency(item.value, currency)}</span>
                              {item.id !== 'owner_cap' && item.id !== 'retained_earning' && (
                                <div className="relative">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === item.id ? null : item.id); }}
                                    className="p-1 hover:bg-slate-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <MoreVertical size={12} className="text-slate-400" />
                                  </button>
                                  {activeDropdown === item.id && (
                                    <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                      <button onClick={() => { onNavigate?.('transactions', 'Receipt', item.id); setActiveDropdown(null); }} className="w-full text-left px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50">Receipt</button>
                                      <button onClick={() => { onNavigate?.('transactions', 'Payment', item.id); setActiveDropdown(null); }} className="w-full text-left px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50">Payment</button>
                                      <button onClick={() => { onNavigate?.('transactions', 'Adjustment', item.id); setActiveDropdown(null); }} className="w-full text-left px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50">Adjustment</button>
                                    </div>
                                  )}
                                </div>
                              )}
                           </div>
                         </div>
                       ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="flex justify-between items-center p-5 bg-slate-100 rounded-2xl mt-4">
                 <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Total Assets</span>
                 <span className="text-sm font-black text-indigo-600">{formatCurrency(totalAssets, currency)}</span>
              </div>
           </div>
           
           {/* EQUITY AND LIABILITIES */}
           <div className="p-8 space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">EQUITY AND LIABILITIES</h4>
              {['Equity', 'Non-Current Liability', 'Current Liability'].map(head => (
                <div key={head} className="border border-slate-100 rounded-2xl overflow-hidden">
                  <button onClick={() => toggleHead(head)} className="w-full flex justify-between items-center p-5 bg-slate-50/50 hover:bg-white transition-colors">
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{head}</span>
                    <span className="text-xs font-black">{formatCurrency(heads[head as AccountClassification].total, currency)}</span>
                  </button>
                  {expandedHeads.includes(head) && (
                    <div className="p-4 space-y-2 bg-white animate-in slide-in-from-top-2">
                       {heads[head as AccountClassification].items.map(item => (
                         <div key={item.id} className="flex justify-between items-center text-[11px] font-bold text-slate-500 py-1 group relative">
                           <span className="uppercase flex-1 truncate">{item.name}</span>
                           <div className="flex items-center gap-3">
                              <span>{formatCurrency(item.value, currency)}</span>
                              {item.id !== 'owner_cap' && item.id !== 'retained_earning' && (
                                <div className="relative">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === item.id ? null : item.id); }}
                                    className="p-1 hover:bg-slate-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <MoreVertical size={12} className="text-slate-400" />
                                  </button>
                                  {activeDropdown === item.id && (
                                    <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                      <button onClick={() => { onNavigate?.('transactions', 'Receipt', item.id); setActiveDropdown(null); }} className="w-full text-left px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50">Receipt</button>
                                      <button onClick={() => { onNavigate?.('transactions', 'Payment', item.id); setActiveDropdown(null); }} className="w-full text-left px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50">Payment</button>
                                      <button onClick={() => { onNavigate?.('transactions', 'Adjustment', item.id); setActiveDropdown(null); }} className="w-full text-left px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50">Adjustment</button>
                                    </div>
                                  )}
                                </div>
                              )}
                           </div>
                         </div>
                       ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="flex justify-between items-center p-5 bg-slate-100 rounded-2xl mt-4">
                 <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Total Equity and Liabilities</span>
                 <span className="text-sm font-black text-indigo-600">{formatCurrency(totalEquityLiabilities, currency)}</span>
              </div>
           </div>
        </div>
      </section>
    </div>
  );
};

export default Statements;
