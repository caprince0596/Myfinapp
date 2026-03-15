
import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../store/FinanceContext';
import { formatCurrency } from '../utils/formatters';
import { Staff, StaffAttendance, WageType, Transaction } from '../types';

const StaffManager: React.FC = () => {
  const { state, addStaff, updateStaff, deleteStaff, logStaffAttendance, addTransaction } = useFinance();
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [showSettleModal, setShowSettleModal] = useState<Staff | null>(null);
  const [swapOverride, setSwapOverride] = useState<{ day: number, dateStr: string } | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  
  const [settlementMode, setSettlementMode] = useState<{ id: string, name: string, type: 'bank' | 'card' | 'wallet' | 'liability' } | null>(null);
  const [isRecordingSuccess, setIsRecordingSuccess] = useState(false);

  const [staffFormData, setStaffFormData] = useState({ 
    name: '', role: 'Maid', baseRate: '500', wageType: 'Daily' as WageType,
    joiningDate: new Date().toISOString().split('T')[0]
  });

  const [swapType, setSwapType] = useState<'OWN' | 'PROXY' | 'BOTH' | 'REMOVE'>('OWN');
  const [proxyRate, setProxyRate] = useState<string>('0');

  const currency = state.profile.currency;
  const staffList = useMemo(() => state.staff || [], [state.staff]);
  const selectedStaff = staffList.find(s => s.id === selectedStaffId);

  useEffect(() => {
    if (!selectedStaffId && staffList.length > 0) {
      const firstId = staffList[0].id;
      const timer = setTimeout(() => setSelectedStaffId(firstId), 0);
      return () => clearTimeout(timer);
    }
  }, [staffList, selectedStaffId]);

  const daysInMonth = useMemo(() => {
    return new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  }, [viewDate]);

  const availableAccounts = useMemo(() => {
    const list: { id: string, name: string, type: 'bank' | 'card' | 'wallet' | 'liability' }[] = [];
    state.banks.forEach(b => list.push({ id: b.id, name: b.name, type: 'bank' }));
    state.wallets.forEach(w => list.push({ id: w.id, name: w.name, type: 'wallet' }));
    state.cards.forEach(c => list.push({ id: c.id, name: c.lenderName, type: 'card' }));
    return list;
  }, [state]);

  const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const resetForm = () => {
    setStaffFormData({
      name: '', role: 'Maid', baseRate: '500', wageType: 'Daily',
      joiningDate: new Date().toISOString().split('T')[0]
    });
    setEditingStaffId(null);
  };

  const getAttendanceStatusForDay = (staff: Staff, dateStr: string) => {
    const manualLog = staff.attendance?.find(a => a.date === dateStr);
    if (manualLog) return manualLog;
    const today = new Date().toISOString().split('T')[0];
    if (dateStr >= staff.joiningDate && (!staff.exitDate || dateStr <= staff.exitDate) && dateStr <= today) {
       let rate = staff.baseRate;
       if (staff.wageType === 'Monthly') {
          rate = staff.baseRate / new Date(new Date(dateStr).getFullYear(), new Date(dateStr).getMonth() + 1, 0).getDate();
       }
       return { status: 'Present' as const, rate: rate, isSubstitute: false, isDefault: true };
    }
    return { status: 'None' as const, rate: 0, isSubstitute: false, isDefault: true };
  };

  const currentMonthStats = useMemo(() => {
    if (!selectedStaff) return { present: 0, absent: 0, swap: 0, total: 0 };
    let present = 0, absent = 0, swap = 0, total = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const log = getAttendanceStatusForDay(selectedStaff, dateStr);
      if (log.status === 'Present') {
        present++;
        total += log.rate;
        if (log.isSubstitute) swap++;
      } else if (log.status === 'Absent') {
        absent++;
      }
    }
    return { present, absent, swap, total };
  }, [selectedStaff, viewDate, daysInMonth]);

  const handleSettle = (staff: Staff) => {
    if (!settlementMode) return alert("Select target account first.");
    const amount = currentMonthStats.total;
    if (amount <= 0) return alert("No dues to settle.");
    const tx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'Expense',
      amount: amount,
      nature: staff.name,
      description: `Wages payout for ${monthName}`,
      accountId: settlementMode.id,
      accountType: settlementMode.type,
      date: new Date().toISOString().split('T')[0],
      status: 'active'
    };
    addTransaction(tx);
    setIsRecordingSuccess(true);
    setSettlementMode(null);
  };

  const handleAttendanceToggle = (targetStatus: 'Present' | 'Absent') => {
    if (!selectedStaff) return;
    const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    const currentLog = getAttendanceStatusForDay(selectedStaff, dateStr);
    if (!(currentLog as any).isDefault && currentLog.status === targetStatus) {
      logStaffAttendance(selectedStaff.id, { date: dateStr, status: 'None' });
      return;
    }
    let rate = targetStatus === 'Present' ? selectedStaff.baseRate : 0;
    if (targetStatus === 'Present' && selectedStaff.wageType === 'Monthly') {
      rate = selectedStaff.baseRate / new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    }
    logStaffAttendance(selectedStaff.id, { date: dateStr, status: targetStatus, rate: rate, isSubstitute: false });
  };

  const handleCommitSwap = () => {
    if (!selectedStaff || !swapOverride) return;
    const { dateStr } = swapOverride;
    if (swapType === 'REMOVE') {
      logStaffAttendance(selectedStaff.id, { date: dateStr, status: 'None' });
    } else {
      let finalRate = 0, isSub = false;
      if (swapType === 'OWN') {
        finalRate = selectedStaff.baseRate;
        if (selectedStaff.wageType === 'Monthly') {
          finalRate = selectedStaff.baseRate / new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
        }
      } else if (swapType === 'PROXY') {
        finalRate = Number(proxyRate); isSub = true;
      } else if (swapType === 'BOTH') {
        let ownRate = selectedStaff.baseRate;
        if (selectedStaff.wageType === 'Monthly') ownRate = selectedStaff.baseRate / new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
        finalRate = ownRate + Number(proxyRate); isSub = true;
      }
      logStaffAttendance(selectedStaff.id, { date: dateStr, status: 'Present', rate: finalRate, isSubstitute: isSub });
    }
    setSwapOverride(null);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 animate-in fade-in duration-500 font-sans p-2 pb-24 max-w-full overflow-x-hidden">
      
      {/* Registry Panel */}
      <div className="w-full md:w-80 flex flex-col bg-slate-50 border border-slate-200 rounded-[2.5rem] shadow-sm shrink-0">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-[2.5rem]">
          <div>
            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Personnel</h3>
            <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest">Registry Audit</p>
          </div>
          <button 
            onClick={() => { resetForm(); setShowAddStaff(true); }} 
            className="w-10 h-10 flex items-center justify-center bg-black text-white rounded-2xl text-xl shadow-lg active:scale-90 transition-transform"
          >
            +
          </button>
        </div>
        <div className="flex md:flex-col overflow-x-auto md:overflow-y-visible no-scrollbar p-4 gap-3">
          {staffList.map(s => (
            <div 
              key={s.id} 
              onClick={() => setSelectedStaffId(s.id)} 
              className={`flex-none md:flex-1 p-4 rounded-3xl cursor-pointer transition-all border flex items-center gap-4 min-w-[160px] md:min-w-0 ${selectedStaffId === s.id ? 'bg-indigo-600 border-indigo-700 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-800'}`}
            >
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg shrink-0 font-black ${selectedStaffId === s.id ? 'bg-white/20' : 'bg-slate-100 text-slate-400'}`}>
                {s.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase truncate leading-none mb-1">{s.name}</p>
                <p className={`text-[8px] font-black uppercase tracking-widest ${selectedStaffId === s.id ? 'text-white/60' : 'text-slate-400'}`}>{s.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-[3rem] shadow-sm relative min-h-0">
        {selectedStaff ? (
          <>
            <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-5 w-full sm:w-auto">
                <div className="w-16 h-16 bg-slate-900 text-white rounded-[1.5rem] flex items-center justify-center text-2xl font-black shadow-xl">
                  {selectedStaff.name.charAt(0).toLowerCase()}
                </div>
                <div className="flex-1">
                   <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{selectedStaff.name}</h2>
                      <button onClick={() => { 
                        setEditingStaffId(selectedStaff.id); 
                        setStaffFormData({ name: selectedStaff.name, role: selectedStaff.role, baseRate: String(selectedStaff.baseRate), wageType: selectedStaff.wageType, joiningDate: selectedStaff.joiningDate }); 
                        setShowAddStaff(true); 
                      }} className="text-slate-300 hover:text-indigo-600">✎</button>
                   </div>
                   <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{selectedStaff.role} • {selectedStaff.wageType} Basis</p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-full border border-slate-100 shrink-0">
                 <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-full transition-all">←</button>
                 <span className="px-4 text-[9px] font-black uppercase tracking-[0.2em]">{monthName}</span>
                 <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-full transition-all">→</button>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-8">
              <div className="grid grid-cols-7 border border-slate-100 rounded-[2.5rem] overflow-hidden bg-white shadow-xl">
                {['S','M','T','W','T','F','S'].map((d, i) => (
                  <div key={i} className="py-4 text-center text-[9px] font-black text-slate-300 uppercase bg-slate-50/50 border-b border-slate-50">{d}</div>
                ))}
                {Array.from({ length: new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square bg-slate-50/10"></div>
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const log = getAttendanceStatusForDay(selectedStaff, dateStr);
                  const isActive = selectedDay === day;
                  return (
                    <div 
                      key={day} 
                      onClick={() => setSelectedDay(day)}
                      className={`group flex flex-col items-center justify-center aspect-square cursor-pointer transition-all relative border-t border-l border-slate-50 ${isActive ? 'bg-indigo-600 text-white z-10 rounded-xl shadow-2xl scale-105' : 'bg-white hover:bg-slate-50'}`}
                    >
                      <span className={`text-xs font-black ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'}`}>{day}</span>
                      <div className="mt-1 h-1">
                        {log.status === 'Present' && <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-white' : (log.isSubstitute ? 'bg-amber-400' : 'bg-emerald-500')}`}></div>}
                        {log.status === 'Absent' && <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-white/50' : 'bg-rose-400'}`}></div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-6">
                <div className="flex-1 flex gap-2">
                  <button onClick={() => handleAttendanceToggle('Present')} className={`flex-1 py-5 rounded-2xl border-2 flex flex-col items-center gap-2 ${getAttendanceStatusForDay(selectedStaff, `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`).status === 'Present' ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                    <span className="text-xl">✅</span>
                    <span className="text-[8px] font-black uppercase tracking-widest">Present</span>
                  </button>
                  <button onClick={() => handleAttendanceToggle('Absent')} className={`flex-1 py-5 rounded-2xl border-2 flex flex-col items-center gap-2 ${getAttendanceStatusForDay(selectedStaff, `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`).status === 'Absent' ? 'bg-rose-500 border-rose-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                    <span className="text-xl">❌</span>
                    <span className="text-[8px] font-black uppercase tracking-widest">Absent</span>
                  </button>
                  <button onClick={() => setSwapOverride({ day: selectedDay, dateStr: `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}` })} className="flex-1 py-5 rounded-2xl border-2 border-slate-100 bg-slate-50 flex flex-col items-center gap-2 text-slate-400 active:scale-95 transition-all">
                    <span className="text-xl">🔄</span>
                    <span className="text-[8px] font-black uppercase tracking-widest">Swap</span>
                  </button>
                </div>
                <div className="lg:w-64 p-6 bg-slate-900 rounded-[2rem] text-white flex items-center justify-between gap-4 shadow-xl">
                   <div><p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Dues</p><p className="text-xl font-black tracking-tighter">{formatCurrency(currentMonthStats.total, currency).split('.')[0]}</p></div>
                   <button onClick={() => setShowSettleModal(selectedStaff)} className="px-4 py-2.5 bg-black text-white rounded-xl text-[8px] font-black uppercase tracking-widest active:scale-95 transition-transform">Settle</button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center text-slate-300">
             <span className="text-4xl mb-4">👥</span>
             <p className="text-[10px] font-black uppercase tracking-widest">Select Personnel to Audit</p>
          </div>
        )}
      </div>

      {/* SWAP PROTOCOL MODAL */}
      {swapOverride && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/90 backdrop-blur-xl p-6" onClick={() => setSwapOverride(null)}>
           <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 border border-slate-200" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Duty Protocol</h3>
                 <button onClick={() => setSwapOverride(null)} className="text-slate-300 hover:text-slate-800 text-2xl font-black">✕</button>
              </div>
              <div className="space-y-3">
                 {[
                   { id: 'OWN', label: 'Self Entry (Standard)', icon: '👤' },
                   { id: 'PROXY', label: 'Proxy Personnel', icon: '🔄' },
                   { id: 'BOTH', label: 'Double Shift (Full Pay)', icon: '⭐' },
                   { id: 'REMOVE', label: 'Clear Day Entry', icon: '🧹' }
                 ].map(t => (
                   <button key={t.id} onClick={() => setSwapType(t.id as any)} className={`w-full p-5 text-left rounded-2xl border-2 transition-all flex items-center gap-5 group ${swapType === t.id ? 'bg-black border-black text-white shadow-xl' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                      <span className="text-2xl">{t.icon}</span>
                      <p className={`text-[11px] font-black uppercase tracking-widest ${swapType === t.id ? 'text-white' : 'text-slate-800'}`}>{t.label}</p>
                   </button>
                 ))}
              </div>
              {swapType !== 'OWN' && swapType !== 'REMOVE' && (
                <div className="mt-6 space-y-2 animate-in slide-in-from-top-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Override Payout ({currency})</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black text-xl outline-none" value={proxyRate} onChange={e => setProxyRate(e.target.value)} />
                </div>
              )}
              <div className="flex gap-4 mt-8">
                 <button onClick={() => setSwapOverride(null)} className="flex-1 py-5 bg-slate-100 text-slate-500 font-black text-[10px] uppercase rounded-2xl">Abort</button>
                 <button onClick={handleCommitSwap} className="flex-[2] py-5 bg-black text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95">Commit Log</button>
              </div>
           </div>
        </div>
      )}

      {/* ADD STAFF MODAL */}
      {showAddStaff && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/90 backdrop-blur-xl p-4" onClick={() => setShowAddStaff(false)}>
           <div className="bg-white w-full max-w-md rounded-[3rem] p-10 border border-slate-200 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-8">{editingStaffId ? 'Modify' : 'New'} Personnel</h3>
              <div className="space-y-6">
                 <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs uppercase" value={staffFormData.name} onChange={e => setStaffFormData({...staffFormData, name: e.target.value})} placeholder="Identity" />
                 <div className="grid grid-cols-2 gap-4">
                    <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs uppercase" value={staffFormData.wageType} onChange={e => setStaffFormData({...staffFormData, wageType: e.target.value as WageType})}><option value="Monthly">Monthly</option><option value="Daily">Daily</option></select>
                    <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs uppercase" value={staffFormData.role} onChange={e => setStaffFormData({...staffFormData, role: e.target.value})}><option>Maid</option><option>Cook</option><option>Driver</option></select>
                 </div>
                 <input type="number" className="w-full p-6 bg-slate-900 text-white border border-slate-800 rounded-3xl font-black text-3xl text-center" value={staffFormData.baseRate} onChange={e => setStaffFormData({...staffFormData, baseRate: e.target.value})} />
                 <div className="flex gap-4 pt-4">
                    <button onClick={() => setShowAddStaff(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black text-[10px] uppercase rounded-2xl">Cancel</button>
                    <button onClick={() => {
                      if (!staffFormData.name) return;
                      const data: Staff = { id: editingStaffId || Math.random().toString(36).substr(2, 9), name: staffFormData.name, role: staffFormData.role, baseRate: Number(staffFormData.baseRate), wageType: staffFormData.wageType, attendance: editingStaffId ? staffList.find(s=>s.id===editingStaffId)?.attendance || [] : [], joiningDate: staffFormData.joiningDate };
                      if (editingStaffId) {
                        updateStaff(data);
                      } else {
                        addStaff(data);
                      }
                      setShowAddStaff(false); resetForm();
                    }} className="flex-[2] py-4 bg-black text-white font-black text-[10px] uppercase rounded-2xl shadow-xl">Commit</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* SETTLEMENT MODAL */}
      {showSettleModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/95 backdrop-blur-2xl p-6" onClick={() => { setShowSettleModal(null); setSettlementMode(null); }}>
           <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-12 shadow-2xl text-center animate-in zoom-in-95 border border-slate-200" onClick={e => e.stopPropagation()}>
              {!isRecordingSuccess ? (
                <>
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner border border-emerald-100">💸</div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">Wage Settlement</h3>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-10">{monthName}</p>
                  <div className="p-10 bg-slate-50 rounded-[2.5rem] mb-10 shadow-inner border border-slate-100">
                    <p className="text-5xl font-black text-slate-900 tracking-tighter">{formatCurrency(currentMonthStats.total, currency).split('.')[0]}</p>
                    <p className="text-[9px] font-black text-indigo-400 uppercase mt-4 tracking-widest font-black">Verified Dues</p>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-left ml-3">Payout Account</label>
                       <select className="w-full p-5 bg-slate-100 border border-slate-200 rounded-2xl font-black text-xs outline-none cursor-pointer uppercase" value={settlementMode?.id || ''} onChange={(e) => {
                           const acc = availableAccounts.find(a => a.id === e.target.value);
                           if (acc) setSettlementMode(acc as any);
                         }}>
                         <option value="">Select Account</option>
                         {availableAccounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>))}
                       </select>
                    </div>
                    <div className="flex flex-col gap-4">
                      <button onClick={() => handleSettle(showSettleModal)} className="w-full py-6 bg-black text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-2xl active:scale-95">Release Funds</button>
                      <button onClick={() => { setShowSettleModal(null); setSettlementMode(null); }} className="w-full py-4 bg-slate-100 text-slate-400 font-black text-[9px] uppercase rounded-2xl">Abort</button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="animate-in zoom-in-95 duration-700 py-10">
                  <div className="w-28 h-28 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-6xl mx-auto mb-10 shadow-2xl border border-emerald-200">✅</div>
                  <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-3">Settled</h3>
                  <button onClick={() => { setShowSettleModal(null); setIsRecordingSuccess(false); }} className="w-full py-6 bg-black text-white font-black text-xs uppercase rounded-2xl shadow-2xl active:scale-95">Back to Console</button>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default StaffManager;
