
import React from 'react';
import { useFinance } from '../store/FinanceContext';
import { formatCurrency } from '../utils/formatters';
import { getAnnualPeriodStart, getAnnualPeriodEnd, getBillingCycleDates, getPreviousBillingCycleDates } from '../utils/calculations';
import { CreditCard } from '../types';

const Rewards: React.FC = () => {
  const { filteredState, state } = useFinance();
  const currency = filteredState.profile.currency;
  const cards = filteredState.cards || [];

  const getCycleSpend = (cardId: string, start: Date, end: Date) => {
    return state.transactions
      .filter(t => t.accountId === cardId && t.type === 'Expense' && new Date(t.date) >= start && new Date(t.date) <= end)
      .reduce((acc, t) => acc + t.amount, 0);
  };

  const calculateAnnualProgress = (card: CreditCard) => {
    if (!card.anniversaryDate) return { spend: 0, startDate: null, endDate: null };
    const start = getAnnualPeriodStart(card.anniversaryDate);
    const end = getAnnualPeriodEnd(start);
    const spend = state.transactions
      .filter(t => t.accountId === card.id && t.type === 'Expense' && new Date(t.date) >= start && new Date(t.date) <= end)
      .reduce((acc, t) => acc + t.amount, 0);
    return { spend, start, end };
  };

  const now = new Date();
  const currentMonthName = now.toLocaleString('default', { month: 'long' });

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight uppercase">Privilege Vault</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Active Credit Benefit Applicability</p>
        </div>
        <div className="bg-indigo-600 px-6 py-3 rounded-2xl text-white shadow-xl shadow-indigo-100/50">
          <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Status Dashboard</p>
          <p className="text-sm font-black uppercase tracking-tight">{currentMonthName} {now.getFullYear()}</p>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="py-24 text-center bg-white border border-dashed border-slate-200 rounded-[2.5rem]">
          <div className="text-4xl mb-4">💳</div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No active credit cards identified in vault</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-12">
          {cards.map(card => {
            const billingDay = card.billingDay || 1;
            const currentCycle = getBillingCycleDates(billingDay);
            const prevCycle = getPreviousBillingCycleDates(billingDay);
            
            const currentCycleSpend = getCycleSpend(card.id, currentCycle.start, currentCycle.end);
            const prevCycleSpend = getCycleSpend(card.id, prevCycle.start, prevCycle.end);
            const annual = calculateAnnualProgress(card);
            
            const loungeSpendThreshold = card.loungeAccess?.spendLimit || 0;
            
            // Availability NOW (Current Billing Cycle) is based on Previous Billing Cycle
            const isLoungeUnlockedNow = prevCycleSpend >= loungeSpendThreshold;
            
            // Progress toward NEXT Billing Cycle qualification
            const nextCycleProgress = loungeSpendThreshold > 0 ? Math.min(100, (currentCycleSpend / loungeSpendThreshold) * 100) : 100;
            const isQualifiedForNextCycle = currentCycleSpend >= loungeSpendThreshold;

            const formatRange = (start: Date, end: Date) => {
              return `${start.toLocaleDateString('default', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('default', { day: 'numeric', month: 'short' })}`;
            };

            return (
              <div key={card.id} className="bg-white border border-slate-200 rounded-[3rem] shadow-sm overflow-hidden flex flex-col lg:flex-row transition-all hover:shadow-md">
                {/* Left Section: Identity & Static Perks */}
                <div className="p-8 lg:w-1/3 bg-slate-900 text-white flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 text-6xl opacity-5 font-black">CREDIT</div>
                  <div className="relative z-10">
                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block mb-2">{card.classification || 'Privilege Line'}</span>
                    <h3 className="text-2xl font-black tracking-tight uppercase leading-none">{card.lenderName}</h3>
                    <p className="text-[10px] font-mono text-white/40 mt-2 tracking-[0.25em]">•••• {card.last4}</p>
                    <div className="mt-4 bg-white/5 p-3 rounded-xl border border-white/10 inline-block">
                       <p className="text-[7px] font-black text-indigo-300 uppercase tracking-widest">Billing Cycle</p>
                       <p className="text-[10px] font-black">{billingDay} to {billingDay === 1 ? 'End' : billingDay - 1}</p>
                    </div>
                  </div>
                  
                  <div className="mt-12 space-y-6 relative z-10">
                    <div>
                      <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-3">Core Privileges (No Spend Required)</p>
                      <div className="flex flex-wrap gap-2">
                        {card.offers.movie && <span className="bg-white/10 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight">🎬 1+1 Movies</span>}
                        {card.offers.dining && <span className="bg-white/10 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight">🍽️ Dining</span>}
                        {card.fuelSurchargeWaiver && <span className="bg-white/10 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight">⛽ Fuel Waiver</span>}
                        {card.cashbackPct && <span className="bg-indigo-500 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight">{card.cashbackPct}% CB</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Section: Conditional Performance Stats */}
                <div className="p-8 lg:flex-1 grid grid-cols-1 md:grid-cols-2 gap-10">
                  
                  {/* Monthly Spend-Based Perks (Lounge) */}
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Active Benefits (This Cycle)</h4>
                          <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 italic">{formatRange(currentCycle.start, currentCycle.end)}</p>
                        </div>
                        {isLoungeUnlockedNow ? (
                          <span className="bg-emerald-100 text-emerald-600 text-[8px] font-black px-3 py-1 rounded-full uppercase">Verified: Active</span>
                        ) : (
                          <span className="bg-rose-50 text-rose-500 text-[8px] font-black px-3 py-1 rounded-full uppercase">Locked This Cycle</span>
                        )}
                      </div>
                      
                      <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] flex items-center justify-between group">
                         <div className="space-y-1">
                            <p className="text-base font-black text-slate-800 uppercase leading-none">
                              {isLoungeUnlockedNow ? `${card.loungeAccess?.count || 0} Lounge Entries` : 'Access Restricted'}
                            </p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Earned from Prev Cycle: {formatCurrency(prevCycleSpend, currency)}</p>
                            <p className="text-[7px] text-slate-300 italic">({formatRange(prevCycle.start, prevCycle.end)})</p>
                         </div>
                         <div className={`text-3xl transition-transform group-hover:scale-110 ${isLoungeUnlockedNow ? 'grayscale-0' : 'grayscale opacity-30'}`}>
                           {isLoungeUnlockedNow ? '✨' : '🔒'}
                         </div>
                      </div>
                    </div>

                    {/* Next Cycle Qualification */}
                    <div className="space-y-4 pt-6 border-t border-slate-100">
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                          <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Qualifying for Next Cycle</h4>
                          <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Threshold Target Progress</p>
                        </div>
                        <p className="text-[10px] font-black text-slate-700">{formatCurrency(currentCycleSpend, currency)} / {formatCurrency(loungeSpendThreshold, currency)}</p>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${isQualifiedForNextCycle ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-indigo-600'}`}
                          style={{ width: `${nextCycleProgress}%` }}
                        ></div>
                      </div>
                      {isQualifiedForNextCycle ? (
                        <div className="flex items-center gap-2 bg-emerald-50 p-3 rounded-xl border border-emerald-100 animate-in slide-in-from-left-2">
                           <span className="text-emerald-500 text-sm">✔</span>
                           <p className="text-[8px] font-black text-emerald-600 uppercase tracking-tight">Threshold met. Benefits will be available in next cycle.</p>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <p className="text-[8px] font-black text-slate-400 uppercase">Need {formatCurrency(loungeSpendThreshold - currentCycleSpend, currency)} more</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Annual Milestone Progression */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Annual Milestone Tracker</h4>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Yearly Fee Waiver/Rewards</p>
                      </div>
                    </div>
                    
                    <div className="bg-indigo-50/30 p-8 rounded-[2.5rem] border border-indigo-100/50 space-y-8 relative overflow-hidden group">
                      <div className="absolute bottom-0 right-0 p-6 text-6xl opacity-5 grayscale group-hover:rotate-12 transition-transform">🏆</div>
                      
                      <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase text-indigo-400 tracking-[0.2em]">Target Spend Milestone</p>
                        <p className="text-lg font-black text-slate-800 tracking-tight">
                          {card.annualLimit ? formatCurrency(card.annualLimit, currency) : 'No Limit Defined'}
                        </p>
                      </div>

                      <div className="space-y-4 relative z-10">
                        <div className="flex justify-between items-end">
                          <div className="flex flex-col">
                            <p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.1em]">Accumulated Year-to-Date</p>
                            {annual.start && annual.end && (
                              <p className="text-[7px] font-black text-indigo-500/50 uppercase mt-0.5">
                                Cycle: {annual.start.toLocaleDateString()} - {annual.end.toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <p className="text-sm font-black text-indigo-600">{formatCurrency(annual.spend, currency)}</p>
                        </div>
                        <div className="w-full h-2 bg-white border border-indigo-100/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-600 transition-all duration-1000"
                            style={{ width: `${card.annualLimit ? Math.min(100, (annual.spend / card.annualLimit) * 100) : 100}%` }}
                          ></div>
                        </div>
                        {card.annualLimit && annual.spend < card.annualLimit && (
                           <p className="text-[7px] font-black text-slate-400 uppercase text-right tracking-widest">
                             {((annual.spend / card.annualLimit) * 100).toFixed(1)}% Completed
                           </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Performance Vouchers */}
                  {(card.otherBenefits || []).length > 0 && (
                    <div className="md:col-span-2 space-y-6 pt-8 border-t border-slate-100">
                      <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">🎯 Targeted Achievement Rewards</h4>
                        <span className="text-[7px] font-black text-slate-300 uppercase italic">Benefits applied in next billing cycle</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {card.otherBenefits?.map((benefit, idx) => (
                          <div key={idx} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl group hover:border-indigo-200 hover:shadow-sm transition-all">
                             <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight leading-tight">{benefit.benefitName}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Rule: {benefit.condition}</p>
                             </div>
                             <div className="text-xl opacity-20 group-hover:opacity-100 transition-all group-hover:rotate-12">🎁</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Rewards;
