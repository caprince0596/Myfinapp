
import React, { useMemo, useState, useEffect } from 'react';
import { useFinance } from '../store/FinanceContext';
import { formatCurrency } from '../utils/formatters';
import { ANNUAL_MULTIPLIERS } from '../utils/calculations';

const getBudgetDueDateForWindow = (dueDateStr: string | undefined, windowStart: Date, windowEnd: Date) => {
  if (!dueDateStr) return null;
  const refDate = new Date(dueDateStr);
  if (isNaN(refDate.getTime())) return null;

  const day = refDate.getDate();
  // Create a date in the window's month/year
  const targetDate = new Date(windowStart.getFullYear(), windowStart.getMonth(), day);
  
  // Handle month length mismatch (e.g. 31st in Feb)
  if (targetDate.getMonth() !== windowStart.getMonth()) {
    targetDate.setDate(0); 
  }
  
  if (targetDate >= windowStart && targetDate <= windowEnd) {
    return targetDate;
  }
  return null;
};

const FiscalSentinel: React.FC = () => {
  const { filteredState } = useFinance();
  const currency = filteredState.profile.currency;
  
  const [viewMode, setViewMode] = useState<'monthly' | 'custom'>('monthly');
  const [viewDate, setViewDate] = useState(new Date());
  const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]);
  
  // Income Configuration State
  // Map of Budget Category -> { included: boolean, period: 'current' | 'previous' }
  const [incomeConfigOverrides, setIncomeConfigOverrides] = useState<Record<string, { included: boolean, period: 'current' | 'previous' }>>({});
  const [showIncomeConfig, setShowIncomeConfig] = useState(false);

  const incomeConfig = useMemo(() => {
    const config: Record<string, { included: boolean, period: 'current' | 'previous' }> = {};
    const incomeHeads = (filteredState.budgets || []).filter(b => b.type === 'Income');
    
    incomeHeads.forEach(h => {
      config[h.category] = incomeConfigOverrides[h.category] || { included: true, period: 'previous' };
    });
    
    return config;
  }, [filteredState.budgets, incomeConfigOverrides]);

  const calendarData = useMemo(() => {
    let windowStart: Date, windowEnd: Date;

    if (viewMode === 'monthly') {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      windowStart = new Date(year, month, 1);
      windowEnd = new Date(year, month + 1, 0, 23, 59, 59);
    } else {
      windowStart = new Date(customStart);
      windowEnd = new Date(customEnd);
      windowEnd.setHours(23, 59, 59);
    }

    // Calculate Income Base based on Configuration
    const incomeBase = (filteredState.budgets || [])
      .filter(b => b.type === 'Income')
      .reduce((acc, b) => {
        const config = incomeConfig[b.category];
        if (!config || !config.included) return acc;

        // Determine the period to fetch actuals from
        let targetStart: Date, targetEnd: Date;
        
        if (viewMode === 'monthly') {
          const year = viewDate.getFullYear();
          const month = viewDate.getMonth();
          if (config.period === 'current') {
            targetStart = new Date(year, month, 1);
            targetEnd = new Date(year, month + 1, 0, 23, 59, 59);
          } else {
            targetStart = new Date(year, month - 1, 1);
            targetEnd = new Date(year, month, 0, 23, 59, 59);
          }
        } else {
          // For custom mode, 'current' is the custom range, 'previous' is the same duration before start
          if (config.period === 'current') {
            targetStart = new Date(windowStart);
            targetEnd = new Date(windowEnd);
          } else {
            const duration = windowEnd.getTime() - windowStart.getTime();
            targetEnd = new Date(windowStart.getTime() - 1);
            targetStart = new Date(targetEnd.getTime() - duration);
          }
        }

        // Sum actual transactions for this head in the target period
        const actuals = (filteredState.transactions || [])
          .filter(t => t.type === 'Income' && t.nature === b.category && new Date(t.date) >= targetStart && new Date(t.date) <= targetEnd)
          .reduce((sum, t) => sum + t.amount, 0);
          
        return acc + actuals;
      }, 0);
    
    const dailyThresholdWarning = incomeBase * 0.2;
    const cumulativeBlowoutThreshold = incomeBase * 0.5;

    // Generate Daily Map
    // For monthly: 1..DaysInMonth. For custom: List of dates?
    // Let's use a Map keyed by Date String "YYYY-MM-DD"
    const dailyMap: Record<string, { amount: number, items: { name: string, amount: number }[], hasScheduledDue: boolean, date: Date }> = {};
    const dailyActualSpent: Record<string, number> = {};

    // Initialize days
    const curr = new Date(windowStart);
    while (curr <= windowEnd) {
      const dateStr = curr.toISOString().split('T')[0];
      dailyMap[dateStr] = { amount: 0, items: [], hasScheduledDue: false, date: new Date(curr) };
      dailyActualSpent[dateStr] = 0;
      curr.setDate(curr.getDate() + 1);
    }

    // Process Dues (Budgets)
    (filteredState.budgets || []).forEach(b => {
      // Check if due date falls in window
      // This is tricky for recurring. We need to project the due date into the window.
      // For simplicity, if frequency is monthly, we project to each month in window.
      // If annual, check if month/day matches.
      
      const bDueDate = b.dueDate ? new Date(b.dueDate) : null;
      if (!bDueDate) return;

      const checkStart = new Date(windowStart);
      while (checkStart <= windowEnd) {
        // Project due date to this month
        // Only if frequency matches or is monthly
        let matches = false;
        if (b.frequency === 'Monthly') matches = true;
        else if (b.frequency === 'Annually' && bDueDate.getMonth() === checkStart.getMonth()) matches = true;
        // Add other frequencies if needed, keeping it simple for now
        
        if (matches) {
           const targetDay = bDueDate.getDate();
           const targetDate = new Date(checkStart.getFullYear(), checkStart.getMonth(), targetDay);
           // Handle month end clipping
           if (targetDate.getMonth() !== checkStart.getMonth()) targetDate.setDate(0);
           
           const dateStr = targetDate.toISOString().split('T')[0];
           if (dailyMap[dateStr]) {
             const amountPerFreq = b.amount / (ANNUAL_MULTIPLIERS as Record<string, number>)[b.frequency as string] || 1;
             dailyMap[dateStr].amount += amountPerFreq;
             dailyMap[dateStr].hasScheduledDue = true;
             dailyMap[dateStr].items.push({ name: b.category, amount: amountPerFreq });
           }
        }
        // Move to next month
        checkStart.setMonth(checkStart.getMonth() + 1);
        checkStart.setDate(1);
      }
    });

    // Process Cards
    (filteredState.cards || []).forEach(c => {
      if (c.dueDate) {
        const cDate = new Date(c.dueDate);
        // Project similar to budgets? Or just specific date?
        // Cards usually have specific due dates. Let's assume specific for now, or monthly if we had that data.
        // The existing logic projected it to every month. Let's stick to that for 'Monthly' behavior implied by 'dueDate' usually being a day of month.
        
        const checkStart = new Date(windowStart);
        while (checkStart <= windowEnd) {
           const targetDay = cDate.getDate();
           const targetDate = new Date(checkStart.getFullYear(), checkStart.getMonth(), targetDay);
           if (targetDate.getMonth() !== checkStart.getMonth()) targetDate.setDate(0);
           
           const dateStr = targetDate.toISOString().split('T')[0];
           if (dailyMap[dateStr]) {
             const bal = Math.abs(c.balance);
             dailyMap[dateStr].amount += bal;
             dailyMap[dateStr].items.push({ name: c.lenderName, amount: bal });
             dailyMap[dateStr].hasScheduledDue = true;
           }
           checkStart.setMonth(checkStart.getMonth() + 1);
           checkStart.setDate(1);
        }
      }
    });

    // Process Actual Expenses
    (filteredState.transactions || [])
      .filter(t => t.type === 'Expense')
      .forEach(t => {
        const tDate = new Date(t.date);
        if (tDate >= windowStart && tDate <= windowEnd) {
          const dateStr = tDate.toISOString().split('T')[0];
          if (dailyActualSpent[dateStr] !== undefined) {
             dailyActualSpent[dateStr] += t.amount;
          }
        }
      });

    // Identify Blowout
    let cumulativeSum = 0;
    let firstBlowoutDate: string | null = null;
    const sortedDates = Object.keys(dailyActualSpent).sort();
    
    for (const dateStr of sortedDates) {
      cumulativeSum += dailyActualSpent[dateStr];
      if (firstBlowoutDate === null && cumulativeSum > cumulativeBlowoutThreshold) {
        firstBlowoutDate = dateStr;
      }
    }

    return { 
      dailyMap, 
      dailyThresholdWarning, 
      cumulativeBlowoutThreshold, 
      firstBlowoutDate, 
      windowStart,
      windowEnd,
      incomeBase,
      cumulativeTotalSpent: cumulativeSum 
    };
  }, [filteredState, viewDate, viewMode, customStart, customEnd, incomeConfig]);

  const monthName = viewDate.toLocaleString('default', { month: 'long' });
  const year = viewDate.getFullYear();
  const startDayOfWeek = new Date(year, viewDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(year, viewDate.getMonth() + 1, 0).getDate();

  const years = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 md:px-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight uppercase">Financial Calendar</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Due Date and Financial Discipline Tracker</p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
           <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
             <select 
               value={viewMode} 
               onChange={(e) => setViewMode(e.target.value as 'monthly' | 'custom')}
               className="bg-transparent text-[10px] font-black uppercase outline-none px-2 py-1"
             >
               <option value="monthly">Monthly View</option>
               <option value="custom">Custom Period</option>
             </select>
           </div>

           {viewMode === 'monthly' ? (
             <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
               <select 
                 value={viewDate.getMonth()} 
                 onChange={(e) => setViewDate(new Date(viewDate.getFullYear(), Number(e.target.value), 1))}
                 className="bg-transparent text-[10px] font-black uppercase outline-none px-2 py-1 cursor-pointer"
               >
                 {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
               </select>
               <select 
                 value={viewDate.getFullYear()} 
                 onChange={(e) => setViewDate(new Date(Number(e.target.value), viewDate.getMonth(), 1))}
                 className="bg-transparent text-[10px] font-black uppercase outline-none px-2 py-1 cursor-pointer"
               >
                 {years.map(y => <option key={y} value={y}>{y}</option>)}
               </select>
             </div>
           ) : (
             <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
               <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="text-[10px] font-black uppercase outline-none px-2" />
               <span className="text-slate-300">-</span>
               <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="text-[10px] font-black uppercase outline-none px-2" />
             </div>
           )}
        </div>
      </div>

      <section className="bg-white p-6 md:p-10 rounded-[3rem] border border-slate-200 shadow-sm animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Financial Forecast</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              {viewMode === 'monthly' ? `Status Report for ${monthName} cycle` : `Custom Period Analysis`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-rose-600"></div>
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Spends &gt; 50% Income</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-amber-400"></div>
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Spends &gt; 20% Income</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-emerald-600"></div>
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Spends &lt; 20% Income</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-yellow-100 border border-black"></div>
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Due Date</span>
             </div>
          </div>
        </div>

        {viewMode === 'monthly' ? (
          <div className="grid grid-cols-7 gap-2 md:gap-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-[9px] font-black text-slate-300 uppercase tracking-widest mb-4">{d}</div>
            ))}
            
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square bg-slate-50/30 rounded-2xl"></div>
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = new Date(year, viewDate.getMonth(), day).toISOString().split('T')[0];
              const info = calendarData.dailyMap[dateStr] || { amount: 0, items: [], hasScheduledDue: false };
              const hasAmount = info.amount > 0;
              const hasScheduledDue = info.hasScheduledDue;
              const isBlowout = calendarData.firstBlowoutDate !== null && dateStr >= calendarData.firstBlowoutDate;
              const isWarning = hasAmount && info.amount > calendarData.dailyThresholdWarning && !isBlowout;
              const isSafe = hasAmount && !isWarning && !isBlowout;
              
              return (
                <div 
                  key={day} 
                  className={`relative aspect-square flex flex-col items-center justify-center transition-all group cursor-default ${
                    hasScheduledDue 
                      ? 'rounded-full border-2 border-black bg-yellow-100 text-slate-900 shadow-xl scale-105 z-10' 
                      : isBlowout 
                        ? 'bg-rose-600 border-2 border-rose-600 text-white shadow-xl shadow-rose-200 rounded-full scale-105' 
                        : isWarning
                            ? 'bg-amber-400 border-2 border-amber-400 text-white shadow-xl shadow-amber-200 rounded-full scale-105'
                            : isSafe
                              ? 'bg-emerald-600 border-2 border-emerald-600 text-white shadow-xl shadow-emerald-200 rounded-full scale-105'
                              : 'bg-white border border-slate-100 rounded-2xl hover:border-slate-300 text-slate-400'
                  }`}
                >
                  <div className={`w-full h-full flex flex-col items-center justify-center p-1`}>
                     <span className={`text-[10px] md:text-sm font-black ${!hasScheduledDue && (isBlowout || isWarning || isSafe) ? 'text-white' : 'text-slate-800'}`}>{day}</span>
                     {hasScheduledDue && (
                       <div className="mt-0.5 hidden md:block">
                          <p className="text-[8px] font-black text-slate-600">
                            {hasAmount ? formatCurrency(info.amount, currency).split('.')[0] : 'DUE'}
                          </p>
                       </div>
                     )}
                  </div>

                  {hasScheduledDue && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50">
                       <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Audit Detail • {day} {monthName}</p>
                       <div className="space-y-1.5">
                          {info.items.length > 0 ? info.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[10px] font-black">
                              <span className="uppercase tracking-tight truncate max-w-[100px]">{item.name}</span>
                              <span>{item.amount > 0 ? formatCurrency(item.amount, currency) : 'Recurring'}</span>
                            </div>
                          )) : (
                            <p className="text-[10px] font-black text-slate-400 italic">Scheduled Occurrence</p>
                          )}
                       </div>
                       {hasAmount && (
                         <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center text-[10px] font-black text-indigo-400">
                           <span>Total Due</span>
                           <span>{formatCurrency(info.amount, currency)}</span>
                         </div>
                       )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
             {Object.keys(calendarData.dailyMap).sort().map(dateStr => {
               const info = calendarData.dailyMap[dateStr];
               if (!info.hasScheduledDue && info.amount === 0) return null;
               
               const date = new Date(dateStr);
               const isBlowout = calendarData.firstBlowoutDate !== null && dateStr >= calendarData.firstBlowoutDate;
               
               return (
                 <div key={dateStr} className={`p-4 rounded-2xl border flex items-center justify-between ${isBlowout ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center gap-4">
                       <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center border-2 ${info.hasScheduledDue ? 'bg-yellow-100 border-black text-slate-900' : 'bg-white border-slate-200 text-slate-500'}`}>
                          <span className="text-[8px] font-black uppercase">{date.toLocaleString('default', { month: 'short' })}</span>
                          <span className="text-lg font-black leading-none">{date.getDate()}</span>
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">
                            {info.items.map(i => i.name).join(', ') || 'No Events'}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                            {isBlowout ? 'Critical Spend Level' : 'Scheduled Activity'}
                          </p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-sm font-black text-slate-800">{formatCurrency(info.amount, currency)}</p>
                    </div>
                 </div>
               );
             })}
             {Object.keys(calendarData.dailyMap).every(k => !calendarData.dailyMap[k].hasScheduledDue && calendarData.dailyMap[k].amount === 0) && (
               <p className="text-center py-10 text-[10px] font-black text-slate-300 uppercase tracking-widest">No events in this period</p>
             )}
          </div>
        )}
        
        <div className="mt-12 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col gap-6">
           <div className="flex justify-between items-center">
             <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl">📊</div>
               <div>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Basis Reference</p>
                 <p className="text-sm font-black text-slate-800 uppercase">Analyzed Income: <span className="text-indigo-600">{formatCurrency(calendarData.incomeBase, currency)}</span></p>
               </div>
             </div>
             <button onClick={() => setShowIncomeConfig(!showIncomeConfig)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors">
               {showIncomeConfig ? 'Hide Config' : 'Configure Income'}
             </button>
           </div>

           {showIncomeConfig && (
             <div className="p-4 bg-white rounded-2xl border border-slate-200 animate-in slide-in-from-top-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Select Income Sources for Analysis</p>
                <div className="space-y-2">
                   {Object.keys(incomeConfig).map(cat => (
                     <div key={cat} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                           <input 
                             type="checkbox" 
                             checked={incomeConfig[cat].included} 
                             onChange={e => setIncomeConfigOverrides({...incomeConfigOverrides, [cat]: { ...incomeConfig[cat], included: e.target.checked }})}
                             className="w-4 h-4 rounded border-slate-300 text-black focus:ring-0"
                           />
                           <span className="text-[10px] font-black text-slate-700 uppercase">{cat}</span>
                        </div>
                        {incomeConfig[cat].included && (
                          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                             <button 
                               onClick={() => setIncomeConfigOverrides({...incomeConfigOverrides, [cat]: { ...incomeConfig[cat], period: 'current' }})}
                               className={`px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all ${incomeConfig[cat].period === 'current' ? 'bg-white shadow-sm text-black' : 'text-slate-400'}`}
                             >
                               Current
                             </button>
                             <button 
                               onClick={() => setIncomeConfigOverrides({...incomeConfigOverrides, [cat]: { ...incomeConfig[cat], period: 'previous' }})}
                               className={`px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all ${incomeConfig[cat].period === 'previous' ? 'bg-white shadow-sm text-black' : 'text-slate-400'}`}
                             >
                               Previous
                             </button>
                          </div>
                        )}
                     </div>
                   ))}
                   {Object.keys(incomeConfig).length === 0 && <p className="text-[9px] text-slate-300 italic">No Income Heads Found</p>}
                </div>
             </div>
           )}

           <div className="flex flex-col md:flex-row gap-8 justify-end border-t border-slate-200 pt-6">
             <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Planned Spends exceed 20% of Income</p>
                <p className="text-xl font-black text-amber-500 uppercase">{formatCurrency(calendarData.dailyThresholdWarning, currency)}</p>
             </div>
             <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Planned Spends exceed 50% of Income</p>
                <p className="text-xl font-black text-rose-500 uppercase">{formatCurrency(calendarData.cumulativeBlowoutThreshold, currency)}</p>
             </div>
           </div>
        </div>
      </section>
    </div>
  );
};

export default FiscalSentinel;
