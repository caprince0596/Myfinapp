import React, { useState, useEffect, useRef } from 'react';
import { useFinance } from '../store/FinanceContext';
import { Home, PlusCircle, User, Bell } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { state, activeMemberIds, setActiveMemberIds, resetBoarding, approveTransaction, rejectTransaction, handleFamilyRequest, isNavHidden, approveTransactions, rejectTransactions } = useFinance();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [isShrunk, setIsShrunk] = useState(false);
  const [history, setHistory] = useState<string[]>(['dashboard']);

  const mainRef = useRef<HTMLDivElement>(null);
  const familyMembers = state.profile?.familyMembers || [];

  useEffect(() => {
    const handleScroll = () => { if (mainRef.current) setIsShrunk(mainRef.current.scrollTop > 30); };
    const currentMain = mainRef.current;
    if (currentMain) currentMain.addEventListener('scroll', handleScroll);
    return () => currentMain?.removeEventListener('scroll', handleScroll);
  }, []);

  // Track history for back button
  useEffect(() => {
    const timer = setTimeout(() => {
      setHistory(prev => {
        if (prev[prev.length - 1] !== activeTab) {
          return [...prev, activeTab];
        }
        return prev;
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMemberSelector && !(event.target as Element).closest('.member-selector-container')) {
        setShowMemberSelector(false);
      }
      if (showNotifications && !(event.target as Element).closest('.notification-container')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMemberSelector, showNotifications]);

  const handleBack = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop(); // Remove current
      const prev = newHistory.pop(); // Get previous
      if (prev) {
        setHistory(newHistory); // History will be updated by the useEffect
        setActiveTab(prev);
      }
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleHome = () => {
    setActiveTab('dashboard');
  };

  // Navigation items updated based on user request
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: <Home size={20} strokeWidth={2.5} /> },
    { id: 'transactions', label: 'Add', icon: <PlusCircle size={20} strokeWidth={2.5} /> },
    { id: 'profile', label: 'My Profile', icon: <User size={20} strokeWidth={2.5} /> },
  ];

  const getSelectionLabel = () => {
    if (activeMemberIds.includes('all')) return 'Family Vault';
    if (activeMemberIds.length === 0) return state.profile.name || 'Personal';
    const member = familyMembers.find(m => m.id === activeMemberIds[0]);
    return member ? member.name : 'Vault';
  };

  const pendingApprovals = state.notifications.filter(n => n.type === 'approval_request' || n.type === 'family_request');
  const otherNotifications = state.notifications.filter(n => n.type !== 'approval_request' && n.type !== 'family_request');
  const allNotifications = [...pendingApprovals, ...otherNotifications];

  return (
    <div className="h-[100dvh] w-full flex font-sans selection:bg-purple-200 overflow-hidden relative">
      <main ref={mainRef} className="flex-1 flex flex-col relative h-full overflow-y-auto no-scrollbar transition-all duration-500">
        
        <header className={`sticky top-0 z-[100] flex justify-between items-center transition-all duration-300 px-6 md:px-12 ${isShrunk ? 'h-14 bg-white/60 backdrop-blur-2xl border-b border-white/20' : 'h-16 md:h-20 bg-transparent'}`}>
          <div className="flex items-center gap-4">
             {activeTab !== 'dashboard' && (
               <button 
                onClick={handleBack}
                className="w-8 h-8 flex items-center justify-center bg-white/40 backdrop-blur-md border border-white/40 rounded-xl text-brand-deep hover:bg-white/60 transition-all active:scale-90"
               >
                 <span className="text-xs font-black">←</span>
               </button>
             )}
             <button onClick={handleHome} title="Go to Home" className="flex items-center gap-2 group cursor-pointer">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-lg text-xs transition-all duration-300 ${activeTab !== 'dashboard' ? 'bg-indigo-600 shadow-indigo-500/30 group-hover:scale-110 ring-2 ring-offset-2 ring-indigo-100' : 'bg-brand-purple shadow-purple-500/20 group-hover:scale-105'}`}>
                  {activeTab !== 'dashboard' ? (
                    <>
                      <span className="group-hover:hidden">MF</span>
                      <span className="hidden group-hover:block">🏠</span>
                    </>
                  ) : (
                    "MF"
                  )}
                </div>
                <h1 className="text-lg font-black text-brand-deep tracking-tight hidden sm:block cursor-pointer">MyFin</h1>
             </button>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Notification Button */}
            <div className="relative notification-container">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-white/40 backdrop-blur-md border border-white/40 rounded-xl text-xl transition-all active:scale-90 hover:bg-white/60 shadow-sm ${showNotifications ? 'ring-2 ring-brand-purple bg-white/60' : ''}`}
                title="Notifications"
              >
                <Bell size={18} className={pendingApprovals.length > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-600'} />
                {pendingApprovals.length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border border-white shadow-sm"></span>
                )}
              </button>

              {showNotifications && (
                <div className="fixed inset-x-4 top-20 md:absolute md:inset-auto md:top-full md:right-0 md:mt-3 md:w-96 bg-white/95 backdrop-blur-3xl border border-white/40 rounded-[2rem] shadow-2xl z-[100] p-4 animate-in fade-in zoom-in-95 duration-200 max-h-[70vh] overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center mb-4 px-2">
                      <h4 className="text-[10px] font-black text-brand-deep uppercase tracking-widest">Notifications</h4>
                      {pendingApprovals.length > 0 && (
                        <button 
                          onClick={() => approveTransactions(pendingApprovals.map(n => n.transactionId!).filter(Boolean))}
                          className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 uppercase"
                        >
                          Approve All
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-1">
                      {allNotifications.length === 0 ? (
                        <p className="text-center py-8 text-[10px] font-black uppercase text-slate-300">No New Notifications</p>
                      ) : (
                        allNotifications.map(n => (
                          <div key={n.id} className={`p-4 rounded-2xl border ${n.type === 'approval_request' || n.type === 'family_request' ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                             <div className="flex justify-between items-start mb-1">
                               <p className={`text-[10px] font-black uppercase tracking-tight ${n.type === 'approval_request' ? 'text-indigo-900' : 'text-slate-800'}`}>{n.title}</p>
                               <span className="text-[8px] font-bold text-slate-400">{n.timestamp}</span>
                             </div>
                             <p className="text-[9px] text-slate-500 font-medium leading-relaxed mb-3">{n.message}</p>
                             
                             {(n.type === 'approval_request' || n.type === 'family_request') && (
                               <div className="flex gap-2">
                                  <button onClick={() => n.transactionId ? approveTransaction(n.transactionId) : handleFamilyRequest(n.id, true)} className="flex-1 py-2 bg-black text-white text-[8px] font-black uppercase rounded-lg shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-colors">Accept</button>
                                  <button onClick={() => n.transactionId ? rejectTransaction(n.transactionId) : handleFamilyRequest(n.id, false)} className="flex-1 py-2 bg-white text-slate-500 border border-slate-200 text-[8px] font-black uppercase rounded-lg hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-colors">Reject</button>
                               </div>
                             )}
                          </div>
                        ))
                      )}
                    </div>
                </div>
              )}
            </div>

            {/* Ranking Button: Second icon from right */}
            <button 
              onClick={() => setActiveTab('rankings')}
              className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-white/40 backdrop-blur-md border border-white/40 rounded-xl text-xl transition-all active:scale-90 hover:bg-white/60 shadow-sm ${activeTab === 'rankings' ? 'ring-2 ring-brand-purple bg-white/60' : ''}`}
              title="Global Standing"
            >
              🏆
            </button>

            {/* Vault Selector: Rightmost */}
            <div className="relative member-selector-container">
              <button 
                onClick={() => setShowMemberSelector(!showMemberSelector)} 
                className="relative flex items-center justify-start px-4 py-2 bg-white/40 backdrop-blur-md rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/40 text-brand-deep shadow-sm pr-8 min-h-[36px] md:min-h-[40px]"
              >
                <span className="max-w-[80px] md:max-w-[100px] truncate">{getSelectionLabel()}</span>
                <span className="text-xs absolute top-1/2 -translate-y-1/2 right-2">👥</span>
              </button>
              {showMemberSelector && (
                <div className="absolute top-full right-0 mt-3 w-max max-w-[200px] md:max-w-xs bg-white/95 backdrop-blur-3xl border border-white/40 rounded-3xl shadow-2xl z-[100] p-2 space-y-1 animate-in fade-in zoom-in-95 duration-200">
                    <button onClick={() => { setActiveMemberIds([]); setShowMemberSelector(false); }} className={`w-full text-left px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest truncate ${activeMemberIds.length === 0 ? 'bg-brand-purple text-white shadow-lg shadow-purple-500/20' : 'hover:bg-purple-50 text-purple-900/60'}`}>👤 My Vault</button>
                    <button onClick={() => { setActiveMemberIds(['all']); setShowMemberSelector(false); }} className={`w-full text-left px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest truncate ${activeMemberIds.includes('all') ? 'bg-brand-purple text-white shadow-lg shadow-purple-500/20' : 'hover:bg-purple-50 text-purple-900/60'}`}>🌍 Consolidated</button>
                    <div className="h-px bg-purple-100/50 my-1 mx-2"></div>
                    {familyMembers.map(m => (
                      <button key={m.id} onClick={() => { setActiveMemberIds([m.id]); setShowMemberSelector(false); }} className={`w-full text-left px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest truncate ${activeMemberIds.includes(m.id) ? 'bg-brand-purple text-white shadow-lg' : 'hover:bg-purple-50 text-purple-900/60'}`}>
                        {m.name}
                      </button>
                    ))}
                    <div className="h-px bg-purple-100/50 my-1 mx-2"></div>
                    <button onClick={resetBoarding} className="w-full text-left px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 flex items-center gap-2 truncate">
                       <span>🚪</span> Sign Out
                    </button>
                </div>
              )}
            </div>
          </div>
        </header>
        
        <div className={`flex-1 p-4 md:p-12 max-w-7xl mx-auto w-full ${isNavHidden ? 'pb-10' : 'pb-44'}`}>{children}</div>

        {/* Removed old notification modal since we moved it to the header */}
      </main>

      <nav className={`fixed bottom-0 left-0 w-full bg-brand-deep/95 backdrop-blur-3xl border-t border-white/10 px-2 md:px-10 pt-4 pb-8 z-[200] flex items-center justify-around transition-all duration-500 ${isNavHidden ? 'translate-y-[200%] opacity-0' : 'translate-y-0 opacity-100'}`}>
          {navItems.map(item => (
            <button 
               key={item.id} 
               onClick={() => {
                 setActiveTab(item.id);
               }}
               className={`relative flex flex-col items-center justify-center h-14 w-[20%] min-w-[60px] rounded-2xl transition-all active:scale-90 group border border-white/10 shadow-[2px_2px_0px_rgba(0,0,0,0.3)] ${activeTab === item.id ? 'bg-black text-white shadow-[4px_4px_0px_rgba(0,0,0,0.4)]' : 'bg-white/5 text-purple-100/60 hover:bg-white/10'}`}
            >
               <div className={`transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'scale-100'}`}>
                 {item.icon}
               </div>
               <span className={`text-[8px] font-black uppercase tracking-tighter mt-1 ${activeTab === item.id ? 'opacity-100' : 'opacity-70'}`}>
                 {item.label}
               </span>

               {item.id === 'profile' && pendingApprovals.length > 0 && (
                 <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border border-brand-deep shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>
               )}
            </button>
          ))}
      </nav>
    </div>
  );
};

export default Layout;
