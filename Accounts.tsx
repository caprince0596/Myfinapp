
import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../store/FinanceContext';
import { formatCurrency } from '../utils/formatters';
import { Transaction, CreditCard, AccountClassification, TransactionType } from '../types';
import { MoreVertical } from 'lucide-react';

export const CLASSIFICATIONS: AccountClassification[] = [
  'Current Asset',
  'Non-Current Asset',
  'Current Liability',
  'Non-Current Liability',
  'Equity'
];

const getDynamicDueDateLabel = (dueDateStr: string | undefined) => {
  if (!dueDateStr) return null;
  const refDate = new Date(dueDateStr);
  if (isNaN(refDate.getTime())) return null;

  const day = refDate.getDate();
  const now = new Date();
  let targetDate = new Date(now.getFullYear(), now.getMonth(), day);

  if (targetDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    targetDate = new Date(now.getFullYear(), now.getMonth() + 1, day);
  }

  const isVerySoon = (targetDate.getTime() - now.getTime()) / (1000 * 3600 * 24) <= 3;

  return {
    label: targetDate.toLocaleDateString('default', { day: 'numeric', month: 'short' }),
    isUrgent: isVerySoon,
    date: targetDate
  };
};

const Accounts: React.FC<{ onNavigate?: (tab: string, type?: TransactionType, accountId?: string) => void }> = ({ onNavigate }) => {
  const { filteredState, state, deleteBank, deleteCard, deleteWallet, deleteAsset, deleteLiability, addTransactionNature, deleteTransactionNature, addAsset, addLiability, setIsNavHidden } = useFinance();
  const [showModal, setShowModal] = useState<'bank' | 'card' | 'wallet' | 'asset' | 'liability' | 'nature' | null>(null);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [viewingHistory, setViewingHistory] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, type: 'bank' | 'card' | 'wallet' | 'asset' | 'liability' | 'nature', name: string } | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  const [newNature, setNewNature] = useState({ 
    name: '', 
    type: 'Expense' as TransactionType,
    classification: '' as AccountClassification,
    amount: ''
  });
  
  const currency = filteredState.profile.currency;

  useEffect(() => {
    setIsNavHidden(showModal !== null || viewingHistory !== null || confirmDelete !== null);
    return () => setIsNavHidden(false);
  }, [showModal, viewingHistory, confirmDelete, setIsNavHidden]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const handleEdit = (type: 'bank' | 'card' | 'wallet' | 'asset' | 'liability', account: any) => {
    setEditingAccount(account);
    setShowModal(type);
  };

  const handleDelete = (type: 'bank' | 'card' | 'wallet' | 'asset' | 'liability' | 'nature', id: string, name: string) => {
    setConfirmDelete({ id, type, name });
  };

  const executeDelete = () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'bank') deleteBank(confirmDelete.id);
    else if (confirmDelete.type === 'card') deleteCard(confirmDelete.id);
    else if (confirmDelete.type === 'wallet') deleteWallet(confirmDelete.id);
    else if (confirmDelete.type === 'asset') deleteAsset(confirmDelete.id);
    else if (confirmDelete.type === 'liability') deleteLiability(confirmDelete.id);
    else if (confirmDelete.type === 'nature') deleteTransactionNature(confirmDelete.name);
    setConfirmDelete(null);
  };

  const handleAddNature = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNature.name.trim()) {
      addTransactionNature(newNature.name.trim());
      
      // Handle Asset/Liability creation if selected
      if (newNature.type === 'Asset' || newNature.type === 'Liability') {
         const amountVal = newNature.amount ? Number(newNature.amount) : 0;
         const classification = newNature.classification || (newNature.type === 'Asset' ? 'Non-Current Asset' : 'Current Liability');
         
         if (newNature.type === 'Asset') {
            addAsset({
               id: `asset_${Date.now()}`,
               name: newNature.name.trim(),
               value: amountVal,
               classification: classification,
               type: 'Physical'
            });
         } else {
            addLiability({
               id: `liab_${Date.now()}`,
               name: newNature.name.trim(),
               amount: amountVal,
               classification: classification,
               type: 'Payable'
            });
         }
      }

      setNewNature({ name: '', type: 'Expense', classification: '' as any, amount: '' });
      setShowModal(null);
      setSuccessMsg('Account created successfully');
    }
  };

  const natureAnalysis = useMemo(() => {
    const spending: Record<string, number> = {};
    (filteredState.transactions || []).forEach(t => {
      spending[t.nature] = (spending[t.nature] || 0) + t.amount;
    });

    const categorizedNatures: Record<TransactionType, string[]> = {
      'Income': [],
      'Expense': [],
      'Asset': [],
      'Liability': [],
      'Receipt': [],
      'Payment': [],
      'Adjustment': []
    };

    (state.transactionNatures || []).forEach(nature => {
      const budget = state.budgets.find(b => b.category === nature);
      if (budget && budget.type) {
        categorizedNatures[budget.type].push(nature);
        return;
      }
      const tx = state.transactions.find(t => t.nature === nature);
      if (tx && tx.type) {
        categorizedNatures[tx.type].push(nature);
        return;
      }
      categorizedNatures['Expense'].push(nature);
    });

    return { spending, categorizedNatures };
  }, [filteredState.transactions, state.transactionNatures, state.budgets, state.transactions]);

  const isBudgetLinked = (nature: string) => {
    return state.budgets.some(b => b.category === nature);
  };

  return (
    <div className="space-y-12 md:space-y-16 animate-in fade-in duration-500 relative">
      {successMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[2000] bg-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl font-black text-xs uppercase tracking-widest animate-in slide-in-from-top-4 fade-in duration-300">
          {successMsg}
        </div>
      )}

      {/* Depository Assets */}
      <section>
        <div className="flex justify-between items-end mb-8 px-4 md:px-0">
          <div className="flex flex-col">
            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Cash, Bank and Credit Cards</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">List of accounts</p>
          </div>
          <button onClick={() => { setEditingAccount(null); setShowModal('bank'); }} className="px-5 py-3 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/20 transition-all active:scale-95">+ Bank</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(filteredState.banks || []).map(bank => (
            <div key={bank.id} className="glass-card p-6 rounded-3xl relative group border-l-4 border-l-brand-purple">
              <div className="absolute top-6 right-6 flex items-center gap-2">
                <span className="text-[8px] font-black uppercase text-brand-purple bg-purple-50 px-2.5 py-1 rounded-full">Bank</span>
                <div className="relative">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === bank.id ? null : bank.id); }}
                    className="p-1 hover:bg-slate-100 rounded transition-colors"
                  >
                    <MoreVertical size={12} className="text-slate-400" />
                  </button>
                  {activeDropdown === bank.id && (
                    <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <button onClick={() => { onNavigate?.('transactions', 'Receipt', bank.id); setActiveDropdown(null); }} className="w-full text-left px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50">Receipt</button>
                      <button onClick={() => { onNavigate?.('transactions', 'Payment', bank.id); setActiveDropdown(null); }} className="w-full text-left px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50">Payment</button>
                      <button onClick={() => { onNavigate?.('transactions', 'Adjustment', bank.id); setActiveDropdown(null); }} className="w-full text-left px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50">Adjustment</button>
                    </div>
                  )}
                </div>
              </div>
              <h4 className="text-sm font-black text-slate-800 mb-1">{bank.name}</h4>
              <p className="text-[10px] text-slate-400 font-bold mb-4">{bank.accountNumber || '**** **** ****'}</p>
              <p className="text-2xl font-black text-slate-800 tracking-tight">{formatCurrency(bank.balance, currency)}</p>
              <div className="flex gap-4 pt-6 border-t border-purple-50/50 mt-6">
                <button onClick={() => handleEdit('bank', bank)} className="text-[9px] font-black uppercase text-brand-purple">Edit</button>
                <button onClick={() => handleDelete('bank', bank.id, bank.name)} className="text-[9px] font-black uppercase text-rose-400 ml-auto">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Nature of Accounts Section */}
      <section className="space-y-10">
        <div className="flex justify-between items-end px-4 md:px-0">
          <div className="flex flex-col">
            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Nature of Accounts</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Categorized Expenditure & Revenue Heads</p>
          </div>
          <button onClick={() => setShowModal('nature')} className="px-5 py-3 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95">+ New Nature</button>
        </div>

        {(['Income', 'Expense', 'Asset', 'Liability'] as TransactionType[]).map(type => {
          const natures = natureAnalysis.categorizedNatures[type];
          if (natures.length === 0) return null;

          const isCompactList = type === 'Income' || type === 'Expense';
          const headingLabel = type === 'Income' ? 'Incomes' : type === 'Expense' ? 'Expenses' : `${type} Hierarchy`;

          return (
            <div key={type} className="space-y-6">
              <div className="flex items-center gap-3 px-4 md:px-0">
                <div className={`w-2 h-2 rounded-full ${type === 'Income' ? 'bg-emerald-500' : type === 'Expense' ? 'bg-rose-500' : type === 'Asset' ? 'bg-indigo-500' : 'bg-amber-500'}`}></div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{headingLabel}</h4>
                <div className="h-px flex-1 bg-slate-100"></div>
                <span className="text-[9px] font-black text-slate-300 uppercase">{natures.length} Heads</span>
              </div>
              
              {isCompactList ? (
                <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm mx-4 md:mx-0">
                  <div className="divide-y divide-slate-50">
                    {natures.map(nature => {
                      const linked = isBudgetLinked(nature);
                      // Feature trigger: any nature ending in "daily help"
                      const isStaffManaged = nature.toLowerCase().endsWith('daily help');
                      return (
                        <div key={nature} className="group p-4 md:px-8 hover:bg-slate-50 transition-all flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${type === 'Income' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                               {type === 'Income' ? '💰' : '💸'}
                             </div>
                             <div>
                               <div className="flex items-center gap-2">
                                  <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{nature}</p>
                                  {linked && <span className="text-[7px] font-black px-1.5 py-0.5 bg-indigo-50 text-indigo-500 rounded uppercase">Budgeted</span>}
                                  {isStaffManaged && <span className="text-[7px] font-black px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded uppercase">Staff Enabled</span>}
                               </div>
                               <p className="text-[9px] font-bold text-slate-300 uppercase mt-0.5">Audit: {formatCurrency(natureAnalysis.spending[nature] || 0, currency)}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-6">
                             {isStaffManaged && (
                               <button 
                                 onClick={() => onNavigate?.('staff')}
                                 className="px-3 py-1.5 bg-black text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all"
                               >
                                 Manage Staff
                               </button>
                             )}
                             <p className={`text-sm font-black tracking-tight ${type === 'Income' ? 'text-emerald-600' : 'text-slate-800'}`}>
                                {formatCurrency(natureAnalysis.spending[nature] || 0, currency)}
                             </p>
                             {!linked && (
                               <button 
                                 onClick={() => handleDelete('nature', 'nature', nature)} 
                                 className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-300 hover:text-rose-500 text-xs"
                               >
                                 ✕
                               </button>
                             )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-4 md:px-0">
                  {natures.map(nature => {
                    const linked = isBudgetLinked(nature);
                    return (
                      <div key={nature} className="glass-card p-6 rounded-[2rem] relative group hover:border-brand-purple/30 transition-all cursor-default">
                        <div className="absolute top-4 right-4 flex items-center gap-2">
                          {linked && (
                            <div className="flex items-center group/info">
                               <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center text-[10px] font-black cursor-help">i</div>
                               <div className="absolute bottom-full right-0 mb-2 w-40 bg-slate-900 text-white text-[7px] p-3 rounded-xl font-black uppercase tracking-widest opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl leading-relaxed">
                                 Managed via Budget Architect.
                               </div>
                            </div>
                          )}
                          <div className="relative">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === nature ? null : nature); }}
                              className="p-1 hover:bg-slate-100 rounded transition-colors"
                            >
                              <MoreVertical size={12} className="text-slate-400" />
                            </button>
                            {activeDropdown === nature && (
                              <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <button onClick={() => { onNavigate?.('transactions', 'Receipt', nature); setActiveDropdown(null); }} className="w-full text-left px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50">Receipt</button>
                                <button onClick={() => { onNavigate?.('transactions', 'Payment', nature); setActiveDropdown(null); }} className="w-full text-left px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50">Payment</button>
                                <button onClick={() => { onNavigate?.('transactions', 'Adjustment', nature); setActiveDropdown(null); }} className="w-full text-left px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50">Adjustment</button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                           <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${type === 'Asset' ? 'bg-indigo-50' : 'bg-amber-50'}`}>
                             {type === 'Asset' ? '💎' : '💳'}
                           </div>
                           <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest truncate">{nature}</h4>
                        </div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Audit</p>
                        <p className="text-xl font-black tracking-tighter text-slate-800">
                          {formatCurrency(natureAnalysis.spending[nature] || 0, currency)}
                        </p>
                        <div className={`absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity ${linked ? 'hidden' : ''}`}>
                          <button onClick={() => handleDelete('nature', 'nature', nature)} className="text-[8px] font-black uppercase text-rose-400 bg-rose-50 px-2 py-1 rounded-md">Purge</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Credit Cards Section */}
      <section>
        <div className="flex justify-between items-end mb-8 px-4 md:px-0">
          <div className="flex flex-col">
            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Credit Lines</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Debt Obligations & Liability Tracking</p>
          </div>
          <button onClick={() => { setEditingAccount(null); setShowModal('card'); }} className="px-5 py-3 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/20 transition-all active:scale-95">+ New Card</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {(filteredState.cards || []).map(card => {
            const isReceivable = card.balance < 0;
            const dueInfo = getDynamicDueDateLabel(card.dueDate);
            return (
              <div key={card.id} className={`bg-gradient-to-br ${isReceivable ? 'from-emerald-600 to-emerald-800' : 'from-slate-800 to-slate-900'} p-8 rounded-[2.5rem] text-white shadow-xl relative group overflow-hidden`}>
                <div className="absolute top-0 right-0 p-8 text-7xl font-black text-white/5 pointer-events-none uppercase">VISA</div>
                
                <div className="absolute top-6 right-6 z-20">
                  <div className="relative">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === card.id ? null : card.id); }}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <MoreVertical size={14} className="text-white/40" />
                    </button>
                    {activeDropdown === card.id && (
                      <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <button onClick={() => { onNavigate?.('transactions', 'Receipt', card.id); setActiveDropdown(null); }} className="w-full text-left px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50">Receipt</button>
                        <button onClick={() => { onNavigate?.('transactions', 'Payment', card.id); setActiveDropdown(null); }} className="w-full text-left px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50">Payment</button>
                        <button onClick={() => { onNavigate?.('transactions', 'Adjustment', card.id); setActiveDropdown(null); }} className="w-full text-left px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50">Adjustment</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative z-10">
                  <h4 className="text-xl font-black mb-1">{card.lenderName}</h4>
                  <div className="flex justify-between items-center mb-10">
                    <p className="text-xs font-mono text-white/40 tracking-[0.3em]">•••• {card.last4}</p>
                    {dueInfo && (
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${dueInfo.isUrgent ? 'bg-rose-500/20 border-rose-500/30 text-rose-300' : 'bg-white/5 border-white/10 text-white/60'} animate-in fade-in duration-300`}>
                        <span className="text-[8px] font-black uppercase tracking-widest">Next Due:</span>
                        <span className="text-[10px] font-black">{dueInfo.label}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Outstanding Balance</p>
                      <p className="text-4xl font-black tracking-tighter">{formatCurrency(Math.abs(card.balance), currency)}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-8 border-t border-white/10 mt-8">
                    <button onClick={() => handleEdit('card', card)} className="text-[9px] font-black uppercase text-white/60 hover:text-white transition-colors">Configure</button>
                    <button onClick={() => setViewingHistory(card)} className="text-[9px] font-black uppercase text-brand-neon hover:text-white transition-colors">History</button>
                    <button onClick={() => handleDelete('card', card.id, card.lenderName)} className="text-[9px] font-black uppercase text-rose-400/60 hover:text-rose-400 ml-auto transition-colors">Purge</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Modal Systems */}
      {showModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => { setShowModal(null); setEditingAccount(null); }}>
          <div className="bg-white w-full max-w-2xl rounded-[3rem] border border-slate-200 shadow-2xl animate-in zoom-in duration-200 flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">
                {showModal === 'nature' ? 'Create a new account' : (showModal === 'bank' ? 'Create a Bank Account' : `Configure ${showModal}`)}
              </h3>
              <button onClick={() => { setShowModal(null); setEditingAccount(null); }} className="text-slate-300 hover:text-slate-800 text-2xl font-black">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {showModal === 'nature' ? (
                <form onSubmit={handleAddNature} className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Account Nature Name</label>
                      <input 
                        required 
                        autoFocus
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none focus:ring-4 focus:ring-brand-deep/5 transition-all uppercase" 
                        placeholder="e.g. Entertainment, Pets, Charity" 
                        value={newNature.name} 
                        onChange={e => setNewNature({...newNature, name: e.target.value})} 
                      />
                   </div>

                   {/* Information block explaining special naming */}
                   <div className="flex items-start gap-4 p-5 bg-indigo-50 border border-indigo-100 rounded-2xl group">
                      <div className="w-8 h-8 rounded-full bg-white text-indigo-600 flex items-center justify-center font-black text-xs shadow-sm shrink-0">i</div>
                      <div className="space-y-1">
                         <p className="text-[10px] font-black text-indigo-900 uppercase tracking-tight">Pro-Tip: Staff Automation</p>
                         <p className="text-[9px] font-medium text-indigo-700/80 leading-relaxed uppercase">
                           If you append <span className="font-black text-indigo-900 underline">"DAILY HELP"</span> to the name (e.g. "Maid Daily Help"), the Staff Management engine will automatically unlock for this head, allowing you to log daily wages and attendance.
                         </p>
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Account Classification Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['Income', 'Expense', 'Asset', 'Liability'] as TransactionType[]).map(t => (
                          <button 
                            key={t}
                            type="button"
                            onClick={() => setNewNature({...newNature, type: t})}
                            className={`py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${newNature.type === t ? 'bg-black text-white border-black' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                   </div>

                   {(newNature.type === 'Asset' || newNature.type === 'Liability') && (
                     <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Classification</label>
                           <select 
                             className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none h-[54px]"
                             value={newNature.classification}
                             onChange={e => setNewNature({...newNature, classification: e.target.value as AccountClassification})}
                           >
                             <option value="">Select Classification</option>
                             {CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Opening Value (Optional)</label>
                           <input 
                             type="number"
                             className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none h-[54px]"
                             placeholder="0.00"
                             value={newNature.amount}
                             onChange={e => setNewNature({...newNature, amount: e.target.value})}
                           />
                        </div>
                     </div>
                   )}

                   <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed italic">
                     Account heads created here appear in the ledger and reports. Linking a budget to this head in the 'Goals' tab will provide performance tracking.
                   </p>
                   <button type="submit" className="w-full py-5 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95">Add Account Head</button>
                </form>
              ) : (
                <AccountForm type={showModal} account={editingAccount} onCancel={() => { setShowModal(null); setEditingAccount(null); }} onSuccess={() => setSuccessMsg('Account created successfully')} />
              )}
            </div>
          </div>
        </div>
      )}
      {viewingHistory && <TransactionHistoryModal account={viewingHistory} currency={currency} onClose={() => setViewingHistory(null)} />}
      {confirmDelete && <DeleteConfirmationModal accountName={confirmDelete.name} onCancel={() => setConfirmDelete(null)} onConfirm={executeDelete} />}
    </div>
  );
};

export const TransactionHistoryModal: React.FC<{ account: any, currency: string, onClose: () => void }> = ({ account, currency, onClose }) => {
  const { filteredState } = useFinance();
  const transactions = (filteredState.transactions || []).filter(t => t.accountId === account.id);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] p-8 border border-slate-200 shadow-2xl animate-in zoom-in duration-200 flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Audit Log: {account.name || account.lenderName}</h3>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-800 text-2xl font-black">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
          {transactions.map(t => (
            <div key={t.id} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl flex justify-between items-center">
              <div><p className="text-sm font-black text-slate-800">{t.description || t.nature}</p><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{t.date}</p></div>
              <p className={`text-lg font-black ${['Income', 'Receipt'].includes(t.type) ? 'text-emerald-600' : 'text-rose-500'}`}>{formatCurrency(t.amount, currency)}</p>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="py-24 text-center text-slate-300 uppercase text-[10px] font-black tracking-widest">No activity found</div>
          )}
        </div>
      </div>
    </div>
  );
};

const DeleteConfirmationModal: React.FC<{ accountName: string, onCancel: () => void, onConfirm: () => void }> = ({ accountName, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4" onClick={onCancel}>
     <div className="bg-white w-full max-w-sm p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl animate-in zoom-in duration-200 text-center" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-8">⚠️</div>
        <h4 className="text-lg font-black text-slate-800 mb-2 uppercase tracking-tighter">Confirm Deletion</h4>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10">{accountName}</p>
        <div className="flex flex-col gap-3">
           <button onClick={onConfirm} className="w-full py-4 bg-black text-white font-black text-[10px] uppercase rounded-2xl shadow-xl shadow-slate-900/20">Purge Permanently</button>
           <button onClick={onCancel} className="w-full py-4 bg-slate-100 text-slate-500 font-black text-[10px] uppercase rounded-2xl">Abort</button>
        </div>
     </div>
  </div>
);

export const AccountForm: React.FC<{ type: 'bank' | 'card' | 'wallet' | 'asset' | 'liability', account?: any, onCancel: () => void, onSuccess?: () => void }> = ({ type, account, onCancel, onSuccess }) => {
  const { addBank, updateBank, addCard, updateCard, addWallet, updateWallet, addAsset, updateAsset, addLiability, updateLiability, state } = useFinance();
  const [formData, setFormData] = useState<any>(() => account ? {
    ownerId: account.ownerId || '',
    name: account.name || account.lenderName || '',
    accNum: account.accountNumber || '',
    ifsc: account.ifsc || '',
    balance: Math.abs(account.balance || account.value || account.amount || 0),
    balanceType: (account.balance < 0 && type === 'card') ? 'receivable' : 'outstanding',
    classification: (type === 'bank' || type === 'wallet') ? 'Current Asset' : (account.classification || 'Current Liability'),
    last4: account.last4 || '',
    billingDay: account.billingDay || 1,
    dueDate: account.dueDate || '',
    anniversaryDate: account.anniversaryDate || '',
    annualLimit: account.annualLimit || '',
    offers: account.offers || { movie: false, dining: false, concierge: false, lounge: false },
    accountType: account.accountType || 'Savings'
  } : {
    ownerId: '',
    name: '',
    balance: '',
    balanceType: 'outstanding',
    classification: (type === 'bank' || type === 'wallet') ? 'Current Asset' : 'Current Liability',
    accNum: '',
    ifsc: '',
    accountType: 'Savings',
    billingDay: 1,
    dueDate: '',
    anniversaryDate: '',
    annualLimit: '',
    offers: { movie: false, dining: false, concierge: false, lounge: false }
  });

  const [ifscError, setIfscError] = useState('');
  const familyMembers = state.profile?.familyMembers || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (type === 'bank' && formData.ifsc) {
       const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
       if (!ifscRegex.test(formData.ifsc)) {
          setIfscError('Invalid IFSC Code');
          return;
       }
    }

    const id = account?.id || Math.random().toString(36).substr(2, 9);
    const commonProps = { id, ownerId: formData.ownerId, classification: formData.classification };
    
    if (type === 'bank') {
      const bankData = { 
        ...commonProps, 
        name: formData.name, 
        accountNumber: formData.accNum, 
        ifsc: formData.ifsc,
        balance: Number(formData.balance), 
        accountType: formData.accountType 
      };
      if (account) {
        updateBank(bankData);
      } else {
        addBank(bankData);
      }
    } else if (type === 'card') {
      const finalBalance = formData.balanceType === 'receivable' ? -Math.abs(Number(formData.balance)) : Math.abs(Number(formData.balance));
      const cardData = { 
        ...commonProps, 
        lenderName: formData.name, 
        balance: finalBalance, 
        last4: formData.last4, 
        billingDay: Number(formData.billingDay), 
        dueDate: formData.dueDate,
        anniversaryDate: formData.anniversaryDate,
        annualLimit: Number(formData.annualLimit),
        offers: formData.offers 
      };
      if (account) {
        updateCard(cardData);
      } else {
        addCard(cardData);
      }
    } else if (type === 'wallet') {
      const walletData = { ...commonProps, name: formData.name, balance: Number(formData.balance) };
      if (account) {
        updateWallet(walletData);
      } else {
        addWallet(walletData);
      }
    } else if (type === 'asset') {
      const assetData = { ...commonProps, name: formData.name, value: Number(formData.balance) };
      if (account) {
        updateAsset(assetData);
      } else {
        addAsset(assetData);
      }
    } else if (type === 'liability') {
      const liabilityData = { ...commonProps, name: formData.name, amount: Number(formData.balance) };
      if (account) {
        updateLiability(liabilityData);
      } else {
        addLiability(liabilityData);
      }
    }
    onSuccess?.();
    onCancel();
  };

  const getOwnerLabel = () => type === 'bank' ? 'Bank account holder' : 'Entity Owner';
  const getNameLabel = () => type === 'bank' ? 'Nickname of account' : 'Account Identifier';
  const getBalanceLabel = () => type === 'bank' ? 'Opening Balance' : 'Balance';
  const getButtonLabel = () => type === 'bank' ? 'Create Bank Account' : 'Commit Record';

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">{getOwnerLabel()}</label>
          <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none cursor-pointer" value={formData.ownerId} onChange={e => setFormData({...formData, ownerId: e.target.value})}><option value="">Me (Primary)</option>{familyMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
          {type === 'bank' && <p className="text-[8px] font-bold text-slate-300 uppercase tracking-tight">Note: You can create accounts for other members (add via profile)</p>}
        </div>
        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Classification</label>
          <select disabled={type === 'bank' || type === 'wallet'} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none disabled:opacity-50" value={formData.classification} onChange={e => setFormData({...formData, classification: e.target.value as AccountClassification})}>
            {CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      
      <div className="space-y-2">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">{getNameLabel()}</label>
        <input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none focus:ring-4 focus:ring-purple-500/10 transition-all" placeholder={type === 'bank' ? "e.g. HDFC Salary Account" : "e.g. HDFC Infinity"} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
      </div>

      {type === 'bank' && (
        <div className="grid grid-cols-2 gap-4">
           <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Account Number</label>
              <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none focus:ring-4 focus:ring-purple-500/10 transition-all" placeholder="Optional" value={formData.accNum} onChange={e => setFormData({...formData, accNum: e.target.value})} />
           </div>
           <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">IFSC Code</label>
              <input className={`w-full p-4 bg-slate-50 border ${ifscError ? 'border-rose-300' : 'border-slate-200'} rounded-2xl font-black text-sm outline-none focus:ring-4 focus:ring-purple-500/10 transition-all uppercase`} placeholder="Optional" value={formData.ifsc} onChange={e => { setFormData({...formData, ifsc: e.target.value.toUpperCase()}); setIfscError(''); }} />
              {ifscError && <p className="text-[8px] font-black text-rose-500 uppercase">{ifscError}</p>}
           </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">{getBalanceLabel()}</label>
          <input required type="number" step="any" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-lg outline-none focus:ring-4 focus:ring-purple-500/10 transition-all" value={formData.balance} onChange={e => setFormData({...formData, balance: e.target.value})} />
        </div>
        {type === 'bank' && (
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Type</label>
            <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none cursor-pointer" value={formData.accountType} onChange={e => setFormData({...formData, accountType: e.target.value})}><option>Savings</option><option>Current</option><option>Salary</option></select>
          </div>
        )}
        {type === 'card' && (
          <div className="space-y-4 col-span-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Payment Due Date</label>
                <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none focus:ring-4 focus:ring-purple-500/10 transition-all" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Annual Billing Cycle</label>
                <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none focus:ring-4 focus:ring-purple-500/10 transition-all" value={formData.anniversaryDate} onChange={e => setFormData({...formData, anniversaryDate: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Annual Spend Limit (Optional)</label>
               <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none focus:ring-4 focus:ring-purple-500/10 transition-all" placeholder="For progress tracking" value={formData.annualLimit} onChange={e => setFormData({...formData, annualLimit: e.target.value})} />
            </div>
          </div>
        )}
      </div>
      <button type="submit" className="w-full py-5 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/20 transition-all hover:bg-slate-900 active:scale-95">{getButtonLabel()}</button>
    </form>
  );
};

export default Accounts;
