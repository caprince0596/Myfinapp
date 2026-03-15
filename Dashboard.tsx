
import React, { useState, useMemo } from 'react';
import { useFinance } from '../store/FinanceContext';
import { calculateRates, calculateNetWorth, ANNUAL_MULTIPLIERS, calculateAllocatedExpense } from '../utils/calculations';
import { formatCurrency } from '../utils/formatters';
import { Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Staff } from '../types';

const Dashboard: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { filteredState, state, logStaffAttendance } = useFinance();
  const [displayMode, setDisplayMode] = useState<'hourly' | 'daily' | 'monthly'>('monthly');
  const [periodScope, setPeriodScope] = useState<'financial_year' | 'calendar_year' | 'custom'>('financial_year');
  const [customStart, setCustomStart] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);
  const [activeHours, setActiveHours] = useState<number>(24);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const rawRates = useMemo(() => {
    let start: Date, end: Date;
    const now = new Date();

    if (periodScope === 'financial_year') {
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-11
      // Financial Year starts Apr 1
      if (currentMonth >= 3) {
        start = new Date(currentYear, 3, 1);
        end = new Date(currentYear + 1, 2, 31);
      } else {
        start = new Date(currentYear - 1, 3, 1);
        end = new Date(currentYear, 2, 31);
      }
    } else if (periodScope === 'calendar_year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    } else {
      start = new Date(customStart);
      end = new Date(customEnd);
    }

    // Override filteredState based on selected month/year if in monthly mode AND periodScope is not custom/year
    // Actually, if periodScope is set, we should respect it.
    // But existing logic supported monthly view selection.
    // If periodScope is active, we use that range.
    // If displayMode is monthly, we might want to see monthly breakdown?
    // The request implies periodScope filters the data for the metric.
    
    // Let's use periodScope to define the data range.
    // And displayMode to define the normalization unit.

    const periodFiltered = {
      ...filteredState,
      transactions: filteredState.transactions.filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      })
    };

    // Calculate totals for the period
    const periodIncome = periodFiltered.transactions
      .filter(t => t.type === 'Income')
      .reduce((acc, t) => acc + t.amount, 0);

    const periodExpense = calculateAllocatedExpense(periodFiltered.transactions, start, end);

    // Calculate days passed in the period (up to now if period includes now, or full period if past)
    const effectiveEnd = (end > now && start < now) ? now : end;
    const daysInPeriod = Math.max(1, Math.ceil((effectiveEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      income: periodIncome,
      expense: periodExpense,
      daysPassed: daysInPeriod,
      monthlySurplus: periodIncome - periodExpense
    };
  }, [filteredState, periodScope, customStart, customEnd]);

  const netWorthData = calculateNetWorth(filteredState);
  const currency = filteredState.profile.currency;
  const staffList = useMemo(() => state.staff || [], [state.staff]);

  const timeScaler = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    if (displayMode === 'monthly') return 1;
    if (displayMode === 'daily') return 1 / daysInMonth;
    return (1 / daysInMonth) / activeHours;
  }, [displayMode, activeHours]);

  const cycleLabel = useMemo(() => {
    if (displayMode === 'monthly') return 'Month';
    if (displayMode === 'daily') return 'Day';
    return `Hr`;
  }, [displayMode]);

  const totalStaffDues = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const today = now.toISOString().split('T')[0];
    let total = 0;
    
    staffList.forEach(staff => {
      for (let i = 1; i <= now.getDate(); i++) {
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const log = staff.attendance?.find(a => a.date === dateStr);
        if (log?.status === 'Present') {
          total += log.rate;
        } else if (!log && dateStr >= staff.joiningDate && (!staff.exitDate || dateStr <= staff.exitDate) && dateStr <= today) {
           let rate = staff.baseRate;
           if (staff.wageType === 'Monthly') {
              rate = staff.baseRate / daysInMonth;
           }
           total += rate;
        }
      }
    });
    return total;
  }, [staffList]);

  const currentDisplay = useMemo(() => {
    const daysPassed = Math.max(1, rawRates.daysPassed);
    
    // Calculate total budget for the selected period (rawRates start/end)
    // We need to access the start/end from rawRates calculation logic, but they are local to that memo.
    // We can reconstruct them or move them out. 
    // For now, let's reconstruct the period dates based on periodScope/customStart/customEnd
    // to match rawRates logic.
    let start: Date, end: Date;
    const now = new Date();
    if (periodScope === 'financial_year') {
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      if (currentMonth >= 3) {
        start = new Date(currentYear, 3, 1);
        end = new Date(currentYear + 1, 2, 31);
      } else {
        start = new Date(currentYear - 1, 3, 1);
        end = new Date(currentYear, 2, 31);
      }
    } else if (periodScope === 'calendar_year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    } else {
      start = new Date(customStart);
      end = new Date(customEnd);
    }
    // Ensure end covers the full day
    end.setHours(23, 59, 59, 999);

    const daysInPeriod = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    const periodBudget = (filteredState.budgets || []).reduce((acc, b) => {
       const bStart = new Date(b.startDate);
       const bEnd = new Date(b.endDate);
       
       const effectiveStart = new Date(Math.max(bStart.getTime(), start.getTime()));
       const effectiveEnd = new Date(Math.min(bEnd.getTime(), end.getTime()));
       
       if (effectiveStart > effectiveEnd) return acc;
       
       const overlapDays = Math.max(0, (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 3600 * 24) + 1);
       
       const annualMult = (ANNUAL_MULTIPLIERS as Record<string, number>)[b.frequency as string] || 12;
       const dailyRate = (b.amount * annualMult) / 365;
       
       const amount = dailyRate * overlapDays;
       
       if (b.type === 'Income') acc.income += amount;
       else acc.expense += amount;
       
       return acc;
    }, { income: 0, expense: 0 });

    // Normalize to display unit
    // timeScaler converts "Month" to "Unit". 
    // But here we have "Period Total". We need "Unit Average".
    // Unit Average = Period Total / DaysInPeriod * DaysInUnit.
    
    let daysInUnit = 30.44; // Default for monthly
    if (displayMode === 'daily') daysInUnit = 1;
    if (displayMode === 'hourly') daysInUnit = 1/activeHours; // This seems weird. 
    // Original timeScaler logic:
    // if monthly: 1. (Unit is Month).
    // if daily: 1/daysInMonth. (Unit is Day).
    
    // Let's stick to: Value = PeriodTotal / DaysInPeriod * DaysInUnit
    
    if (displayMode === 'monthly') daysInUnit = 30.44;
    else if (displayMode === 'daily') daysInUnit = 1;
    else if (displayMode === 'hourly') daysInUnit = 1/24; // activeHours logic handled separately?
    
    // Re-evaluating timeScaler from original code:
    // const timeScaler = ... if monthly return 1.
    // original budgetIncome = monthlyBudgetIncome * timeScaler.
    // monthlyBudgetIncome was "Monthly Equivalent".
    // So original logic was: MonthlyEquiv * 1 = Monthly.
    
    // My new logic:
    // periodBudget.income is Total for Period.
    // Monthly Average = periodBudget.income / (daysInPeriod / 30.44).
    
    const normalizationFactor = daysInUnit / daysInPeriod;
    
    // However, for 'hourly', the original code used activeHours.
    // if displayMode === 'hourly', timeScaler = (1/daysInMonth) / activeHours.
    // This implies "Amount per Hour".
    // My daysInUnit for hourly should be 1/24? Or 1/activeHours?
    // If I earn 240/day. 10/hr (24h).
    // If activeHours is 12. 20/hr?
    // Let's preserve activeHours logic.
    
    let displayFactor = 1;
    if (displayMode === 'monthly') {
       displayFactor = 30.44 / daysInPeriod;
    } else if (displayMode === 'daily') {
       displayFactor = 1 / daysInPeriod;
    } else { // hourly
       displayFactor = (1 / daysInPeriod) / activeHours;
    }

    const actualIncome = rawRates.income * displayFactor;
    const actualExpense = rawRates.expense * displayFactor;
    const budgetIncome = periodBudget.income * displayFactor;
    const budgetExpense = periodBudget.expense * displayFactor;

    return { 
      actualIncome,
      actualExpense,
      actualSavings: actualIncome - actualExpense,
      budgetIncome,
      budgetExpense,
      budgetSavings: budgetIncome - budgetExpense
    };
  }, [rawRates, displayMode, activeHours, filteredState.budgets, periodScope, customStart, customEnd]);

  const todayStr = new Date().toISOString().split('T')[0];
  
  const handleQuickAttendance = (staffId: string, status: 'Present' | 'Absent') => {
    const staffMember = staffList.find(s => s.id === staffId);
    if (!staffMember) return;
    const existingLog = staffMember.attendance?.find(a => a.date === todayStr);
    if (existingLog?.status === status) {
      logStaffAttendance(staffId, { date: todayStr, status: 'None' });
      return;
    }
    let rate = 0;
    if (status === 'Present') {
       if (staffMember.wageType === 'Daily' || staffMember.wageType === 'Task') {
          rate = staffMember.baseRate;
       } else if (staffMember.wageType === 'Monthly') {
          const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
          rate = staffMember.baseRate / daysInMonth;
       }
    }
    logStaffAttendance(staffId, { date: todayStr, status: status, rate: rate, isSubstitute: false });
  };

  const pieData = [
    { name: 'Assets', value: netWorthData.assets, color: '#8B5CF6' },
    { name: 'Liabilities', value: netWorthData.liabilities, color: '#DDD6FE' },
  ];

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 max-w-full">
      <div className="flex justify-between items-center px-1">
        <div>
           <h1 className="text-[10px] font-black text-brand-deep uppercase tracking-widest">
             Hi, {getGreeting()} {state.profile.name?.split(' ')[0] || 'User'}
           </h1>
        </div>
      </div>

      {/* METRICS & CONTROLS SECTION (Moved to Top) */}
      <div className="flex flex-col items-center gap-1.5 mt-2 px-1">
        {/* Period Scope Selector */}
        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-1 py-1 rounded-full shadow-sm border border-slate-100 mb-2">
           {(['financial_year', 'calendar_year', 'custom'] as const).map(scope => (
             <button
               key={scope}
               onClick={() => setPeriodScope(scope)}
               className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all duration-300 ${
                 periodScope === scope ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
               }`}
             >
               {scope.replace('_', ' ')}
             </button>
           ))}
        </div>
        
        {periodScope === 'custom' && (
           <div className="flex items-center gap-2 bg-white/70 px-4 py-1.5 rounded-full border border-white/50 shadow-sm mb-2">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-transparent text-[9px] font-black text-brand-deep uppercase outline-none" />
              <span className="text-slate-300">-</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-transparent text-[9px] font-black text-brand-deep uppercase outline-none" />
           </div>
        )}

        <div className={`transition-all duration-300 overflow-hidden flex flex-col items-center gap-2 ${displayMode === 'hourly' ? 'max-h-24 opacity-100 mb-1' : 'max-h-0 opacity-0'}`}>
          {displayMode === 'hourly' && (
            <div className="flex items-center gap-3 bg-white/70 px-4 py-1.5 rounded-full border border-white/50 shadow-sm">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Basis:</span>
              <select 
                value={activeHours}
                onChange={(e) => setActiveHours(Number(e.target.value))}
                className="bg-transparent text-[10px] font-black text-brand-deep uppercase outline-none cursor-pointer border-none focus:ring-0 p-0"
              >
                {Array.from({ length: 24 }, (_, i) => i + 1).map(h => (
                  <option key={h} value={h}>{h} Hours</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="inline-flex items-center p-1 bg-white/95 backdrop-blur-md rounded-full shadow-md border border-white/60 w-full max-w-[340px]">
          {(['hourly', 'daily', 'monthly'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setDisplayMode(mode)}
              className={`flex-1 py-3 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${
                displayMode === mode ? 'bg-black text-white shadow-lg scale-100' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
      
      <section className="glass-card rounded-[2rem] overflow-hidden border border-white/70 shadow-lg">
         <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-purple-50/50 border-b border-white/60">
                <th className="p-4 text-[8px] font-black text-purple-900/40 uppercase tracking-widest w-[40%]">Particulars</th>
                <th className="p-4 text-right text-[8px] font-black text-purple-900/40 uppercase tracking-widest">Actual</th>
                <th className="p-4 text-right text-[8px] font-black text-purple-900/40 uppercase tracking-widest">Budget</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-100/10">
              <tr className="hover:bg-purple-100/5 transition-colors">
                <td className="p-4 text-[10px] font-black text-brand-deep uppercase truncate">Income/{cycleLabel}</td>
                <td className="p-4 text-right text-[12px] font-black text-emerald-600">{formatCurrency(currentDisplay.actualIncome, currency)}</td>
                <td className="p-4 text-right text-[11px] font-black text-slate-400">{formatCurrency(currentDisplay.budgetIncome, currency)}</td>
              </tr>
              <tr className="hover:bg-purple-100/5 transition-colors">
                <td className="p-4 text-[10px] font-black text-brand-deep uppercase truncate">Expenses/{cycleLabel}</td>
                <td className="p-4 text-right text-[12px] font-black text-rose-500">{formatCurrency(currentDisplay.actualExpense, currency)}</td>
                <td className="p-4 text-right text-[11px] font-black text-slate-400">{formatCurrency(currentDisplay.budgetExpense, currency)}</td>
              </tr>
              <tr className="hover:bg-purple-100/5 transition-colors">
                <td className="p-4 text-[10px] font-black text-brand-deep uppercase truncate">
                  {currentDisplay.actualIncome >= currentDisplay.actualExpense ? 'Savings' : 'Overspend'}/{cycleLabel}
                </td>
                <td className={`p-4 text-right text-[12px] font-black ${currentDisplay.actualIncome >= currentDisplay.actualExpense ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {formatCurrency(Math.abs(currentDisplay.actualIncome - currentDisplay.actualExpense), currency)}
                </td>
                <td className="p-4 text-right text-[11px] font-black text-slate-400">
                  {formatCurrency(Math.abs(currentDisplay.budgetIncome - currentDisplay.budgetExpense), currency)}
                </td>
              </tr>
            </tbody>
         </table>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {[
          { id: 'accounts', label: 'Add/View Accounts', desc: 'Vault' },
          { id: 'transactions', label: 'Add a Transaction', desc: 'Entry' },
          { id: 'budget', label: 'Budget Planner', desc: 'Plan' },
          { id: 'calendar', label: 'Financial Calendar', desc: 'Sntl' },
          { id: 'statements', label: 'Balance Sheet and Profit & Loss Account', desc: 'Stat' },
          { id: 'rentals', label: 'Rental Manager', desc: 'Rent' },
        ].map(service => (
          <button 
            key={service.id} 
            onClick={() => onNavigate(service.id)}
            className="bg-white p-6 rounded-2xl flex items-center justify-center transition-all hover:scale-[1.02] active:scale-[0.95] border border-slate-100 aspect-[2/1] shadow-sm hover:shadow-md"
          >
            <div className="text-center">
              <h5 className="text-[13px] font-black text-brand-deep uppercase leading-tight tracking-[0.1em]">{service.label}</h5>
            </div>
          </button>
        ))}
        <button 
          onClick={() => onNavigate('taxes')}
          className="col-span-2 md:col-span-3 bg-white p-6 rounded-2xl flex items-center justify-center transition-all hover:scale-[1.02] active:scale-[0.95] border border-slate-100 shadow-sm hover:shadow-md"
        >
          <div className="text-center">
            <h5 className="text-[13px] font-black text-brand-deep uppercase leading-tight tracking-[0.1em]">Taxes</h5>
          </div>
        </button>
      </section>

      {/* STAFF PULSE SECTION */}
      <section className="animate-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white/40 md:rounded-[3rem] p-1 overflow-hidden">
           <div className="px-5 mb-4 flex justify-between items-end">
              <div>
                <h3 className="text-xs font-black text-brand-deep uppercase tracking-[0.2em]">Staff Pulse</h3>
                <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">Direct Ledger Control</p>
              </div>
           </div>
           
           <div className="flex overflow-x-auto no-scrollbar gap-4 px-4 pb-4">
              <div 
                onClick={() => onNavigate('staff')}
                className="flex-none w-[180px] bg-indigo-50/50 border-2 border-dashed border-indigo-200 rounded-[2.5rem] flex flex-col items-center justify-center p-6 cursor-pointer hover:bg-indigo-100/50 transition-all active:scale-95 group"
              >
                 <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm mb-4 group-hover:rotate-12 transition-transform">➕</div>
                 <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Add Staff</p>
                 <p className="text-[7px] font-bold text-indigo-300 uppercase mt-1">New Entry</p>
              </div>

              {staffList.map(staff => {
                const attendance = staff.attendance?.find(a => a.date === todayStr);
                const isPresent = attendance?.status === 'Present';
                const isAbsent = attendance?.status === 'Absent';
                
                return (
                  <div key={staff.id} className="flex-none w-[260px] bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-between group transition-all hover:shadow-2xl">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 bg-slate-900 text-white rounded-[1.25rem] flex items-center justify-center text-xl font-black shadow-lg">
                        {staff.name.charAt(0).toLowerCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter truncate leading-none mb-1">{staff.name}</h4>
                        <div className="flex items-center gap-2 overflow-hidden">
                           <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest whitespace-nowrap">{staff.role}</span>
                           <span className="w-1 h-1 bg-slate-300 rounded-full shrink-0"></span>
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Monthly Audit</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button 
                         onClick={() => handleQuickAttendance(staff.id, 'Present')}
                         className={`flex-1 py-3.5 rounded-2xl border-2 flex items-center justify-center gap-2 transition-all active:scale-95 ${isPresent ? 'bg-emerald-500 border-emerald-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-300 hover:bg-emerald-50 hover:text-emerald-600'}`}
                       >
                          <span className="text-sm">✅</span>
                          <span className="text-[9px] font-black uppercase tracking-widest">Present</span>
                       </button>
                       <button 
                         onClick={() => handleQuickAttendance(staff.id, 'Absent')}
                         className={`flex-1 py-3.5 rounded-2xl border-2 flex items-center justify-center gap-2 transition-all active:scale-95 ${isAbsent ? 'bg-rose-500 border-rose-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-300 hover:bg-rose-50 hover:text-rose-600'}`}
                       >
                          <span className="text-sm">❌</span>
                          <span className="text-[9px] font-black uppercase tracking-widest">Absent</span>
                       </button>
                    </div>
                  </div>
                );
              })}
           </div>

           <div className="px-4 mt-2 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => onNavigate('staff')}
                  className="bg-black text-white p-5 rounded-[2rem] flex flex-col gap-4 shadow-xl transition-all hover:bg-slate-900 active:scale-[0.98] border border-white/5"
                >
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xl">📅</div>
                  <div className="text-left">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.1em]">Calendar View</h4>
                    <p className="text-[7px] font-black text-indigo-400 uppercase tracking-widest mt-1">Daily Logs Audit</p>
                  </div>
                </button>
                <button 
                  onClick={() => onNavigate('staff')}
                  className="bg-black text-white p-5 rounded-[2rem] flex flex-col gap-4 shadow-xl transition-all hover:bg-slate-900 active:scale-[0.98] border border-black/50"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">👤</div>
                  <div className="text-left">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.1em]">Staff Manager</h4>
                    <p className="text-[7px] font-black text-white/50 uppercase tracking-widest mt-1">Add & Modify Help</p>
                  </div>
                </button>
              </div>
              <div className="mt-3 px-4 py-3 bg-white border border-slate-100 rounded-2xl flex justify-between items-center shadow-sm">
                 <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Estimated Period Dues</p>
                 <p className="text-[11px] font-black text-brand-deep">{formatCurrency(totalStaffDues, currency).split('.')[0]}</p>
              </div>
           </div>
        </div>
      </section>


    </div>
  );
};

export default Dashboard;
