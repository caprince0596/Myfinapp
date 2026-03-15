import React, { useState, useMemo } from 'react';
import { useFinance } from '../store/FinanceContext';
import { formatCurrency } from '../utils/formatters';
import { Transaction } from '../types';

interface BulkAuditModalProps {
  onClose: () => void;
}

type GroupBy = 'day' | 'month' | 'category' | 'posted_by';

const BulkAuditModal: React.FC<BulkAuditModalProps> = ({ onClose }) => {
  const { state, approveTransactions, rejectTransactions } = useFinance();
  const [grouping, setGrouping] = useState<GroupBy>('day');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const currency = state.profile.currency;

  const pendingTransactions = useMemo(() => {
    return state.transactions.filter(t => t.status === 'pending_approval');
  }, [state.transactions]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    
    pendingTransactions.forEach(t => {
      let key = '';
      if (grouping === 'day') {
        key = t.date; // e.g., 2024-03-15
      } else if (grouping === 'month') {
        const d = new Date(t.date);
        key = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      } else if (grouping === 'category') {
        key = t.nature || 'Uncategorized';
      } else if (grouping === 'posted_by') {
        key = t.createdBy || 'System';
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });

    return groups;
  }, [pendingTransactions, grouping]);

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleGroup = (key: string) => {
    const items = groupedTransactions[key];
    const allSelected = items.every(t => selectedIds.has(t.id));
    const next = new Set(selectedIds);
    
    items.forEach(t => {
      if (allSelected) next.delete(t.id);
      else next.add(t.id);
    });
    setSelectedIds(next);
  };

  const handleBulkApprove = () => {
    if (selectedIds.size === 0) return;
    approveTransactions(Array.from(selectedIds));
    setSelectedIds(new Set()); // Reset selection
    if (pendingTransactions.length === selectedIds.size) onClose(); // Close if all handled
  };

  const handleBulkReject = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Reject ${selectedIds.size} transactions? This cannot be undone.`)) {
      rejectTransactions(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const getGroupLabel = (key: string) => {
     if (grouping === 'day') {
        return new Date(key).toLocaleDateString('default', { weekday: 'short', day: 'numeric', month: 'short' });
     }
     return key;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] p-8 md:p-10 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Bulk Audit Protocol</h3>
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1">Pending Approval Queue ({pendingTransactions.length})</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-800 text-2xl font-black">✕</button>
        </div>

        {pendingTransactions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
             <div className="text-4xl mb-4">✨</div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">All caught up. No pending audits.</p>
          </div>
        ) : (
          <>
            {/* Filter Tabs */}
            <div className="flex gap-2 bg-slate-50 p-1.5 rounded-xl mb-6 overflow-x-auto no-scrollbar shrink-0">
               {(['day', 'month', 'category', 'posted_by'] as GroupBy[]).map(g => (
                 <button 
                   key={g} 
                   onClick={() => setGrouping(g)}
                   className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${grouping === g ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-200'}`}
                 >
                   By {g.replace('_', ' ')}
                 </button>
               ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
               {Object.entries(groupedTransactions).map(([key, items]: [string, Transaction[]]) => {
                 const isGroupSelected = items.every(t => selectedIds.has(t.id));
                 const groupTotal = items.reduce((acc, t) => acc + t.amount, 0);

                 return (
                   <div key={key} className="space-y-3">
                      <div className="flex items-center justify-between sticky top-0 bg-white py-2 z-10 border-b border-slate-100">
                         <div className="flex items-center gap-3">
                            <button 
                              onClick={() => toggleGroup(key)}
                              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isGroupSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}
                            >
                              {isGroupSelected && <span className="text-white text-[10px]">✔</span>}
                            </button>
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{getGroupLabel(key)}</span>
                            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[8px] font-bold">{items.length}</span>
                         </div>
                         <span className="text-[10px] font-black text-indigo-600">{formatCurrency(groupTotal, currency)}</span>
                      </div>

                      <div className="grid gap-2">
                         {items.map(t => (
                           <div key={t.id} 
                                onClick={() => toggleSelection(t.id)}
                                className={`p-4 rounded-2xl border flex justify-between items-center cursor-pointer transition-all ${selectedIds.has(t.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}
                           >
                              <div className="flex items-center gap-4">
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedIds.has(t.id) ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                                   {selectedIds.has(t.id) && <span className="text-[8px] text-white">✓</span>}
                                </div>
                                <div>
                                   <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{t.description || t.nature}</p>
                                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                      {grouping !== 'posted_by' && <span className="mr-2">By: {t.createdBy || 'System'}</span>}
                                      {grouping !== 'day' && <span className="mr-2">{t.date}</span>}
                                      {grouping !== 'category' && <span>{t.nature}</span>}
                                   </p>
                                </div>
                              </div>
                              <span className={`text-xs font-black ${t.type === 'Income' ? 'text-emerald-600' : 'text-slate-800'}`}>
                                {formatCurrency(t.amount, currency)}
                              </span>
                           </div>
                         ))}
                      </div>
                   </div>
                 );
               })}
            </div>

            {/* Footer Actions */}
            <div className="pt-6 mt-6 border-t border-slate-100 flex gap-4">
               <button 
                 onClick={handleBulkReject}
                 disabled={selectedIds.size === 0}
                 className="flex-1 py-4 bg-slate-100 text-slate-400 font-black text-[10px] uppercase rounded-2xl disabled:opacity-50 hover:bg-rose-50 hover:text-rose-500 transition-colors"
               >
                 Reject Selected ({selectedIds.size})
               </button>
               <button 
                 onClick={handleBulkApprove}
                 disabled={selectedIds.size === 0}
                 className="flex-[2] py-4 bg-indigo-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl disabled:opacity-50 disabled:shadow-none hover:bg-indigo-700 active:scale-95 transition-all"
               >
                 Verify & Approve ({selectedIds.size})
               </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BulkAuditModal;