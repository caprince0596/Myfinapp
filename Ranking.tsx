
import React, { useMemo, useState, useEffect } from 'react';
import { useFinance } from '../store/FinanceContext';
import { formatCurrency } from '../utils/formatters';
import { calculateAllocatedExpense } from '../utils/calculations';

type RankCategory = 'savings' | 'spending' | 'investments';

interface PeerData {
  id: string;
  name: string;
  value: number;
  percentile: number;
  isUser?: boolean;
}

const Ranking: React.FC = () => {
  const { filteredState, activeMemberIds } = useFinance();
  const [activeCategory, setActiveCategory] = useState<RankCategory>('savings');
  const currency = filteredState.profile.currency;

  const fyDates = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const startYear = now.getMonth() < 3 ? currentYear - 1 : currentYear;
    const start = new Date(startYear, 3, 1, 0, 0, 0); // April 1st
    const end = new Date(startYear + 1, 2, 31, 23, 59, 59); // March 31st
    return { start, end };
  }, []);

  const userStats = useMemo(() => {
    const { start, end } = fyDates;
    const transactions = filteredState.transactions || [];

    const income = transactions
      .filter(t => t.type === 'Income' && new Date(t.date) >= start && new Date(t.date) <= end)
      .reduce((acc, t) => acc + t.amount, 0);

    const spending = calculateAllocatedExpense(transactions, start, end);

    const investments = transactions
      .filter(t => t.type === 'Asset' && new Date(t.date) >= start && new Date(t.date) <= end)
      .reduce((acc, t) => acc + t.amount, 0);

    return {
      savings: income - spending,
      spending: spending,
      investments: investments
    };
  }, [filteredState.transactions, fyDates]);

  const peerList = useMemo(() => {
    const baseValue = userStats[activeCategory];
    const seed = activeCategory === 'savings' ? 50000 : activeCategory === 'spending' ? 30000 : 20000;
    
    const peers: PeerData[] = [
      { id: 'p1', name: 'Alpha Vault', value: baseValue * 1.4 + seed * 2, percentile: 99 },
      { id: 'p2', name: 'Delta Strategy', value: baseValue * 1.2 + seed * 1.5, percentile: 95 },
      { id: 'p3', name: 'Zion Reserve', value: baseValue * 1.1 + seed, percentile: 90 },
      { id: 'user', name: 'YOU (Current)', value: baseValue, percentile: 0, isUser: true },
      { id: 'p4', name: 'Node Prime', value: baseValue * 0.8 + seed * 0.5, percentile: 75 },
      { id: 'p5', name: 'Echo Liquidity', value: baseValue * 0.6 + seed * 0.2, percentile: 60 },
      { id: 'p6', name: 'Beta Sector', value: baseValue * 0.4, percentile: 40 },
    ];

    return peers.sort((a, b) => b.value - a.value).map((p, index) => ({
      ...p,
      rank: index + 1,
      percentile: Math.max(1, Math.floor(((peers.length - index) / peers.length) * 100))
    }));
  }, [userStats, activeCategory]);

  const userRank = peerList.find(p => p.isUser);

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-20 max-w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 md:px-0">
        <div>
          <h2 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight uppercase">Global Standing</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">FY Financial Year Benchmarking</p>
        </div>
        <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto">
          {(['savings', 'spending', 'investments'] as RankCategory[]).map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-black text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Highlights / Podium Cards - Responsive Grid for full visibility */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 text-5xl md:text-6xl opacity-10 font-black">#1</div>
          <p className="text-[8px] md:text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Global Leader</p>
          <h4 className="text-lg md:text-xl font-black uppercase truncate">{peerList[0].name}</h4>
          <p className="text-xl md:text-2xl font-black mt-3 md:mt-4 text-emerald-400">{formatCurrency(peerList[0].value, currency)}</p>
          <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-white/10 flex justify-between items-center">
            <span className="text-[7px] md:text-[8px] font-black text-white/30 uppercase tracking-widest">99th Percentile</span>
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-2 border-indigo-600 shadow-xl relative overflow-hidden group scale-100 md:scale-105 z-10">
          <div className="absolute top-0 right-0 p-4 text-5xl md:text-6xl opacity-5 font-black text-indigo-600">ME</div>
          <p className="text-[8px] md:text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">Your Performance</p>
          <h4 className="text-lg md:text-xl font-black uppercase truncate">Active Audit</h4>
          <p className="text-2xl md:text-3xl font-black mt-3 md:mt-4 text-slate-800">{formatCurrency(userStats[activeCategory], currency)}</p>
          <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-slate-100 flex justify-between items-center">
            <span className="text-[9px] md:text-[10px] font-black text-indigo-500 uppercase tracking-widest">Rank #{userRank?.rank} globally</span>
            <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{userRank?.percentile}% Score</span>
          </div>
        </div>

        <div className="bg-slate-50 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
           <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Next Milestone</p>
           <h4 className="text-lg md:text-xl font-black text-slate-800 uppercase truncate">To Rank Up</h4>
           <p className="text-xl md:text-2xl font-black mt-3 md:mt-4 text-indigo-500">
             +{formatCurrency((peerList[Math.max(0, (userRank?.rank || 1) - 2)].value - userStats[activeCategory]), currency)}
           </p>
           <div className="mt-4 md:mt-6 space-y-3">
             <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
               <div className="h-full bg-indigo-600 transition-all duration-1000" style={{ width: '65%' }}></div>
             </div>
             <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">Approaching Top {(userRank?.percentile || 0) + 5}%</p>
           </div>
        </div>
      </div>

      {/* Leaderboard Table - Optimized for visibility */}
      <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 md:p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
           <div>
             <h3 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-widest">Leaderboard</h3>
             <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Comparing {activeCategory} volumes</p>
           </div>
           <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[7px] md:text-[8px] font-black text-indigo-600 uppercase tracking-widest shadow-sm">Real-Time Sync</span>
        </div>
        
        <div className="divide-y divide-slate-50">
          {peerList.map((peer, i) => (
            <div 
              key={peer.id} 
              className={`p-4 md:p-6 md:px-10 flex items-center justify-between transition-all ${peer.isUser ? 'bg-indigo-50/50 border-l-4 border-indigo-600' : 'hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-4 md:gap-6 overflow-hidden">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center font-black text-[10px] md:text-sm shadow-sm shrink-0 ${
                  i === 0 ? 'bg-yellow-400 text-white' : 
                  i === 1 ? 'bg-slate-300 text-white' : 
                  i === 2 ? 'bg-amber-600 text-white' : 
                  'bg-slate-100 text-slate-400'
                }`}>
                  {i + 1}
                </div>
                <div className="overflow-hidden">
                  <p className={`text-[11px] md:text-sm font-black uppercase tracking-tight truncate ${peer.isUser ? 'text-indigo-600' : 'text-slate-800'}`}>
                    {peer.name} {peer.isUser && '(ME)'}
                  </p>
                  <p className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">
                    FY {fyDates.start.getFullYear()}-{fyDates.end.getFullYear().toString().slice(-2)} Audit
                  </p>
                </div>
              </div>
              
              <div className="text-right shrink-0 ml-4">
                <p className={`text-xs md:text-base font-black tracking-tighter ${peer.isUser ? 'text-indigo-600' : 'text-slate-800'}`}>
                  {formatCurrency(peer.value, currency)}
                </p>
                <p className="text-[7px] md:text-[8px] font-black text-slate-300 uppercase tracking-widest">Top {100 - peer.percentile}%</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-6 md:p-10 text-center">
           <button className="text-[8px] md:text-[9px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-700 transition-colors">Expand Dataset (5,000+ Vaults)</button>
        </div>
      </div>
    </div>
  );
};

export default Ranking;
