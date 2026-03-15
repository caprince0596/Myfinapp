import React, { useState, useMemo } from 'react';
import { useFinance } from '../store/FinanceContext';
import { Tenant, Transaction, TransactionType } from '../types';
import { formatCurrency } from '../utils/formatters';

const RentalManager: React.FC = () => {
  const { state, addTenant, updateTenant, deleteTenant, addTransaction, updateTransaction, addNotification } = useFinance();
  const [showModal, setShowModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [activeTab, setActiveTab] = useState<'tenants' | 'rent-roll'>('tenants');
  
  const currency = state.profile.currency;

  const initialTenantState: Tenant = {
    id: '',
    name: '',
    idProofType: 'Aadhar',
    idProofNumber: '',
    startDate: '',
    endDate: '',
    rentAmount: 0,
    rentDueDate: 1,
    propertyAddress: '',
    propertyType: 'Flat',
    propertyNumber: '',
    squareFeet: 0,
    incrementRate: 0,
    securityDeposit: 0,
    depositReceiptMode: 'Bank Transfer',
    securityDepositLiabilityAccountId: '',
    receivableAccountId: '',
    status: 'Active'
  };

  const [formData, setFormData] = useState<Tenant>(initialTenantState);
  const [txFormData, setTxFormData] = useState<Partial<Transaction>>({});

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData(tenant);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to remove this tenant?')) {
      deleteTenant(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = editingTenant ? editingTenant.id : `tenant_${Math.random().toString(36).substr(2, 9)}`;
    const securityDepositLiabilityAccountId = editingTenant ? editingTenant.securityDepositLiabilityAccountId : `liab_${Math.random().toString(36).substr(2, 9)}`;
    const receivableAccountId = editingTenant ? editingTenant.receivableAccountId : `asset_${Math.random().toString(36).substr(2, 9)}`;

    const tenantData: Tenant = {
      ...formData,
      id,
      securityDepositLiabilityAccountId,
      receivableAccountId
    };

    if (editingTenant) {
      updateTenant(tenantData);
    } else {
      addTenant(tenantData);
    }
    setShowModal(false);
    setFormData(initialTenantState);
    setEditingTenant(null);
  };

  const generateRentForMonth = React.useCallback((tenant: Tenant, date: Date) => {
    const monthStr = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    const txId = `rent_${tenant.id}_${date.getMonth()}_${date.getFullYear()}`;
    
    // Check if rent already exists
    const exists = state.transactions.some(t => t.description === `Rent - ${monthStr} - ${tenant.name}`);
    if (exists) {
      addNotification({
        id: `err_${Date.now()}`,
        title: 'Rent Generation Skip',
        message: `Rent for ${monthStr} already generated for ${tenant.name}`,
        timestamp: new Date().toISOString(),
        type: 'reminder',
        isRead: false
      });
      return;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dateStr = `${year}-${month}-01`;

    const transaction: Transaction = {
      id: txId,
      type: 'Income', 
      amount: tenant.rentAmount,
      nature: 'Rental Income',
      description: `Rent - ${monthStr} - ${tenant.name}`,
      accountId: tenant.receivableAccountId,
      accountType: 'asset',
      date: dateStr,
      status: 'active'
    };

    addTransaction(transaction);
    addNotification({
      id: `rent_${Date.now()}`,
      title: 'Rent Generated',
      message: `Successfully generated rent for ${tenant.name} (${monthStr})`,
      timestamp: new Date().toISOString(),
      type: 'reminder',
      isRead: false
    });
  }, [state.transactions, addNotification, addTransaction]);

  const handleEditTx = (tx: Transaction) => {
    setEditingTx(tx);
    setTxFormData({
      date: tx.date,
      amount: tx.amount,
      description: tx.description
    });
    setShowTxModal(true);
  };

  const handleTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTx && txFormData.date && txFormData.amount && txFormData.description) {
      updateTransaction({
        ...editingTx,
        date: txFormData.date,
        amount: Number(txFormData.amount),
        description: txFormData.description
      });
      setShowTxModal(false);
      setEditingTx(null);
    }
  };

  // Rent Roll Logic
  const rentRoll = useMemo(() => {
    return (state.transactions || []).filter(t => t.nature === 'Rental Income' || (t.description && t.description.startsWith('Rent - ')));
  }, [state.transactions]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center px-4 md:px-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight uppercase">Rental Manager</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Tenant & Lease Administration</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200">
           <button onClick={() => setActiveTab('tenants')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'tenants' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>Tenants</button>
           <button onClick={() => setActiveTab('rent-roll')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'rent-roll' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>Rent Roll</button>
        </div>
      </div>

      {activeTab === 'tenants' && (
        <div className="space-y-6">
           <button onClick={() => { setEditingTenant(null); setFormData(initialTenantState); setShowModal(true); }} className="w-full md:w-auto px-6 py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all active:scale-95">
             + Onboard New Tenant
           </button>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {(state.tenants || []).map(tenant => (
               <div key={tenant.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative group">
                 <div className="flex justify-between items-start mb-4">
                   <div>
                     <span className={`inline-block px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest mb-2 ${tenant.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>{tenant.status}</span>
                     <h3 className="text-lg font-black text-slate-800">{tenant.name}</h3>
                     <p className="text-[10px] font-bold text-slate-400 uppercase">{tenant.propertyType} {tenant.propertyNumber} • {tenant.propertyAddress}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-2xl font-black text-indigo-600 tracking-tighter">{formatCurrency(tenant.rentAmount, currency)}</p>
                     <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Monthly Rent</p>
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-2xl">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lease Period</p>
                      <p className="text-[10px] font-bold text-slate-700">{tenant.startDate} to {tenant.endDate}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Security Deposit</p>
                      <p className="text-[10px] font-bold text-slate-700">{formatCurrency(tenant.securityDeposit, currency)}</p>
                    </div>
                    <div>
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Last Rent Recorded</p>
                       <p className="text-[10px] font-bold text-slate-700">
                         {(() => {
                           const rentTxs = state.transactions.filter(t => t.accountId === tenant.receivableAccountId && t.nature === 'Rental Income');
                           if (rentTxs.length === 0) return 'None';
                           const lastTx = rentTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                           return new Date(lastTx.date).toLocaleString('default', { month: 'long', year: 'numeric' });
                         })()}
                       </p>
                    </div>
                    <div>
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Receivable Balance</p>
                       <p className={`text-[10px] font-bold ${((state.assets.find(a => a.id === tenant.receivableAccountId)?.value || 0) > 0) ? 'text-rose-500' : 'text-emerald-600'}`}>
                         {formatCurrency(state.assets.find(a => a.id === tenant.receivableAccountId)?.value || 0, currency)}
                       </p>
                    </div>
                 </div>

                 <div className="flex gap-2">
                   <button onClick={() => generateRentForMonth(tenant, new Date())} className="flex-1 py-3 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors">Generate Rent</button>
                   <button onClick={() => handleEdit(tenant)} className="px-4 py-3 bg-slate-50 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors">Edit</button>
                   <button onClick={() => handleDelete(tenant.id)} className="px-4 py-3 bg-rose-50 text-rose-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors">Remove</button>
                 </div>
               </div>
             ))}
             {(state.tenants || []).length === 0 && (
               <div className="col-span-full py-20 text-center text-slate-300">
                 <p className="text-4xl mb-4">🏠</p>
                 <p className="text-[10px] font-black uppercase tracking-widest">No Tenants Onboarded</p>
               </div>
             )}
           </div>
        </div>
      )}

      {activeTab === 'rent-roll' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
           <div className="p-6 border-b border-slate-100 bg-slate-50/50">
             <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Rent Roll Ledger</h3>
           </div>
           <div className="divide-y divide-slate-50">
             {rentRoll.map(tx => (
               <div key={tx.id} onClick={() => handleEditTx(tx)} className="p-6 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer group">
                 <div>
                   <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{tx.description}</p>
                   <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{tx.date} • {tx.status}</p>
                 </div>
                 <span className="text-sm font-black text-emerald-600">{formatCurrency(tx.amount, currency)}</span>
               </div>
             ))}
             {rentRoll.length === 0 && (
               <div className="p-12 text-center text-slate-300 text-[10px] font-black uppercase tracking-widest">No Rent Entries Generated</div>
             )}
           </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white w-full max-w-2xl rounded-[3rem] border border-slate-200 shadow-2xl animate-in zoom-in duration-200 flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">
                {editingTenant ? 'Edit Tenant Profile' : 'Onboard New Tenant'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-slate-800 text-2xl font-black">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tenant Name</label>
                <input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Full Name" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">ID Proof Type</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none" value={formData.idProofType} onChange={e => setFormData({...formData, idProofType: e.target.value as any})}>
                    <option>Aadhar</option><option>Driving License</option><option>Voter ID</option><option>Passport</option><option>Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">ID Number</label>
                  <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" value={formData.idProofNumber} onChange={e => setFormData({...formData, idProofNumber: e.target.value})} placeholder="XXXX-XXXX-XXXX" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Lease Start</label>
                  <input required type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Lease End</label>
                  <input required type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Monthly Rent</label>
                  <input required type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-lg outline-none" value={formData.rentAmount} onChange={e => setFormData({...formData, rentAmount: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Due Day (1-31)</label>
                  <input required type="number" min="1" max="31" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-lg outline-none" value={formData.rentDueDate} onChange={e => setFormData({...formData, rentDueDate: Number(e.target.value)})} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Property Address</label>
                <textarea required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" rows={2} value={formData.propertyAddress} onChange={e => setFormData({...formData, propertyAddress: e.target.value})} placeholder="Full Address" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Property Type</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none" value={formData.propertyType} onChange={e => setFormData({...formData, propertyType: e.target.value as any})}>
                    <option>Flat</option><option>Shop</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit Number</label>
                  <input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" value={formData.propertyNumber} onChange={e => setFormData({...formData, propertyNumber: e.target.value})} placeholder="e.g. A-101" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Area (Sq. Ft)</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" value={formData.squareFeet} onChange={e => setFormData({...formData, squareFeet: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Increment Rate (%)</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" value={formData.incrementRate} onChange={e => setFormData({...formData, incrementRate: Number(e.target.value)})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Security Deposit</label>
                  <input required type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-lg outline-none" value={formData.securityDeposit} onChange={e => setFormData({...formData, securityDeposit: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Receipt Mode</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none" value={formData.depositReceiptMode} onChange={e => setFormData({...formData, depositReceiptMode: e.target.value})}>
                    <option>Bank Transfer</option><option>Cash</option><option>Cheque</option><option>UPI</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full py-5 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all active:scale-95">
                {editingTenant ? 'Update Tenant Profile' : 'Onboard Tenant'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showTxModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setShowTxModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-[3rem] border border-slate-200 shadow-2xl animate-in zoom-in duration-200 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Edit Rent Entry</h3>
              <button onClick={() => setShowTxModal(false)} className="text-slate-300 hover:text-slate-800 text-2xl font-black">✕</button>
            </div>
            <form onSubmit={handleTxSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                <input required type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none" value={txFormData.date} onChange={e => setTxFormData({...txFormData, date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount</label>
                <input required type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-lg outline-none" value={txFormData.amount} onChange={e => setTxFormData({...txFormData, amount: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                <input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" value={txFormData.description} onChange={e => setTxFormData({...txFormData, description: e.target.value})} />
              </div>
              <button type="submit" className="w-full py-5 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all active:scale-95">
                Update Entry
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RentalManager;
