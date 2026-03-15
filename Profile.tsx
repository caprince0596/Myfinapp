
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFinance } from '../store/FinanceContext';
import { MonitoredApp, MemberPermissions } from '../types';
import { 
  Download, Clock, Database, Video, AlertTriangle, Star, 
  MessageSquare, HelpCircle, Shield, FileText, DollarSign, 
  Trash2, ChevronRight, Settings, LogOut, Edit2, Camera, Search, X, Mail, Phone, Check
} from 'lucide-react';
import { COUNTRIES } from '../utils/countries';

// Declare Google Types for TypeScript
declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

// Configuration Constants - Using Vite's define replacement
// (Moved to FinanceContext)

const SUGGESTED_APPS: MonitoredApp[] = [
  { id: 'app1', name: 'PhonePe', icon: '💎', isEnabled: true, category: 'UPI' },
  { id: 'app2', name: 'Google Pay', icon: '🌀', isEnabled: true, category: 'UPI' },
  { id: 'app3', name: 'Paytm', icon: '🅿️', isEnabled: false, category: 'UPI' },
  { id: 'app4', name: 'HDFC Mobile', icon: '🏦', isEnabled: true, category: 'Banking' },
  { id: 'app5', name: 'ICICI iMobile', icon: '🏰', isEnabled: false, category: 'Banking' },
  { id: 'app6', name: 'Zerodha', icon: '📈', isEnabled: true, category: 'Investment' },
  { id: 'app7', name: 'Binance', icon: '🪙', isEnabled: false, category: 'Investment' },
];

const Profile: React.FC = () => {
  const { 
    state, updateProfile, addFamilyMember, removeFamilyMember, 
    updateMemberPermissions, verifyFamilyMember, simulateIncomingRequest, 
    connectionStatus, verifyConnection, isAuthenticated,
    updateMonitoredApps,
    uploadToDrive
  } = useFinance();
  
  const profile = state.profile;
  const [showAddMember, setShowAddMember] = useState(false);
  const [showPermissions, setShowPermissions] = useState<string | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<{id: string, name: string} | null>(null);
  const [newMember, setNewMember] = useState({ name: '', relation: 'Spouse', mobile: '', email: '' });
  
  // Profile Editing State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    name: profile.name,
    designation: profile.designation,
    city: profile.city,
    country: profile.country,
    email: profile.email || ''
  });

  // Settings State
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const [showReminders, setShowReminders] = useState(false);
  const [reminderTime, setReminderTime] = useState(profile?.reminderTime || '09:00');
  
  // Helper to convert 24h to 12h format for display
  const formatTime12h = (time24: string) => {
    if (!time24) return '';
    const [h, m] = time24.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateProfile({ ...profile, profilePicture: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    updateProfile({
      ...profile,
      name: editForm.name,
      designation: editForm.designation,
      city: editForm.city,
      country: editForm.country,
      email: editForm.email
    });
    setIsEditingProfile(false);
  };

  // Local UI State for Google Drive
  const [showFolderSelection, setShowFolderSelection] = useState(false);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMember.name && (newMember.mobile || newMember.email)) {
      await addFamilyMember({
        id: Math.random().toString(36).substr(2, 9),
        name: newMember.name,
        relation: newMember.relation,
        mobileNumber: newMember.mobile,
        email: newMember.email,
        status: 'pending_invitation',
        permissions: { viewDashboard: true, viewStatements: true, viewBudget: true, viewTransactions: true, viewCalendar: true, viewAccounts: true, canCreateTransactions: true }
      });
      setNewMember({ name: '', relation: 'Spouse', mobile: '', email: '' });
      setShowAddMember(false);
    }
  };

  const handleDeleteMember = (id: string, name: string) => {
    setMemberToDelete({ id, name });
  };

  const confirmDeleteMember = () => {
    if (memberToDelete) {
      removeFamilyMember(memberToDelete.id);
      setMemberToDelete(null);
    }
  };

  const handleCurrencyChange = (currency: string) => {
    updateProfile({ ...profile, currency });
    setShowCurrencySelector(false);
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Amount', 'Description', 'Category', 'Account', 'Status'];
    const rows = state.transactions.map(t => [
      t.date,
      t.type,
      t.amount,
      t.description,
      t.category || '',
      state.banks.find(b => b.id === t.accountId)?.name || state.cards.find(c => c.id === t.accountId)?.lenderName || state.wallets.find(w => w.id === t.accountId)?.name || 'Unknown',
      t.status
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `myfin_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleReminderSave = () => {
    updateProfile({ ...profile, remindersEnabled: true, reminderTime });
    setShowReminders(false);
    // In a real app, we would schedule a notification here
    alert(`Daily reminder set for ${reminderTime}`);
  };

  const handleBackup = async () => {
    const backupData = JSON.stringify(state, null, 2);
    const blob = new Blob([backupData], { type: 'application/json' });
    const file = new File([blob], `myfin_backup_${new Date().toISOString().split('T')[0]}.json`, { type: 'application/json' });
    
    try {
      await uploadToDrive(file);
      alert("Backup uploaded successfully!");
    } catch (e) {
      console.error("Backup failed", e);
      alert("Backup failed. Please try again.");
    }
  };

  const togglePermission = (id: string, key: keyof MemberPermissions) => {
    const member = profile.familyMembers.find(m => m.id === id);
    if (member) {
      updateMemberPermissions(id, { ...member.permissions, [key]: !member.permissions[key] });
    }
  };

  const settingsOptions = [
    { id: 'currency', label: 'Default Currency', icon: <DollarSign size={18} />, action: () => setShowCurrencySelector(true), value: profile.currency },
    { id: 'export', label: 'Export Data (.csv)', icon: <Download size={18} />, action: handleExportCSV },
    { id: 'reminders', label: 'Daily Check-in', icon: <Clock size={18} />, action: () => setShowReminders(true), value: profile.remindersEnabled ? profile.reminderTime : 'Off' },
    { id: 'backup', label: 'Cloud Backup', icon: <Database size={18} />, action: handleBackup },
    { id: 'demo', label: 'Watch Demo Video', icon: <Video size={18} />, action: () => window.open('https://youtube.com', '_blank') },
    { id: 'issue', label: 'Report an Issue', icon: <AlertTriangle size={18} />, action: () => window.open('mailto:support@myfin.app?subject=Issue Report', '_blank') },
    { id: 'rate', label: 'Rate on Playstore', icon: <Star size={18} />, action: () => window.open('https://play.google.com', '_blank') },
    { id: 'feedback', label: 'Share Feedback', icon: <MessageSquare size={18} />, action: () => window.open('mailto:feedback@myfin.app?subject=Feedback', '_blank') },
    { id: 'faq', label: 'FAQs', icon: <HelpCircle size={18} />, action: () => window.open('https://myfin.app/faq', '_blank') },
    { id: 'privacy', label: 'Privacy Policy', icon: <Shield size={18} />, action: () => window.open('https://myfin.app/privacy', '_blank') },
    { id: 'terms', label: 'Terms & Conditions', icon: <FileText size={18} />, action: () => window.open('https://myfin.app/terms', '_blank') },
  ];

  return (
    <div className="space-y-6 md:space-y-10 max-w-4xl animate-in fade-in duration-500 px-3 md:px-0 mx-auto">
      <div className="bg-white md:rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-40 bg-indigo-600 p-8 flex items-end relative">
           <div className="absolute top-0 right-0 p-8 text-8xl font-black text-white/10 tracking-tighter uppercase">MF</div>
           <div className="relative z-10 translate-y-12 group">
             <div className="w-24 h-24 bg-white p-1 shadow-xl rounded-[2rem] overflow-hidden relative">
                 {profile?.profilePicture ? (
                   <img src={profile.profilePicture} alt="Profile" className="w-full h-full object-cover rounded-[1.8rem]" />
                 ) : (
                   <div className="w-full h-full bg-slate-100 flex items-center justify-center text-4xl font-black text-indigo-600 rounded-[1.8rem] uppercase">{profile?.name?.charAt(0) || '?'}</div>
                 )}
                 <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                   <Camera className="text-white" size={24} />
                 </div>
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleProfilePictureUpload} />
             </div>
           </div>
           
           <div className="absolute top-6 right-6 z-20">
             {!isEditingProfile ? (
               <button onClick={() => { setEditForm({ name: profile.name, designation: profile.designation, city: profile.city, country: profile.country, email: profile.email || '' }); setIsEditingProfile(true); }} className="p-2 bg-white/20 backdrop-blur-md border border-white/20 rounded-xl text-white hover:bg-white/30 transition-colors">
                 <Edit2 size={16} />
               </button>
             ) : (
               <div className="flex gap-2">
                 <button onClick={() => setIsEditingProfile(false)} className="p-2 bg-rose-500/80 backdrop-blur-md border border-rose-400 rounded-xl text-white hover:bg-rose-600 transition-colors">
                   <X size={16} />
                 </button>
                 <button onClick={handleSaveProfile} className="p-2 bg-emerald-500/80 backdrop-blur-md border border-emerald-400 rounded-xl text-white hover:bg-emerald-600 transition-colors">
                   <Check size={16} />
                 </button>
               </div>
             )}
           </div>
        </div>
        <div className="px-8 pt-16 pb-10">
          <div className="flex justify-between items-start mb-8">
            <div className="w-full">
              {isEditingProfile ? (
                <div className="space-y-4 max-w-md">
                  <input className="w-full text-3xl font-black text-slate-800 tracking-tight uppercase border-b-2 border-slate-200 focus:border-indigo-600 outline-none bg-transparent" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="FULL NAME" />
                  <input className="w-full text-xs font-black text-indigo-500 uppercase tracking-widest border-b border-slate-200 focus:border-indigo-600 outline-none bg-transparent" value={editForm.designation} onChange={e => setEditForm({...editForm, designation: e.target.value})} placeholder="DESIGNATION" />
                  <input className="w-full text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 focus:border-indigo-600 outline-none bg-transparent" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} placeholder="EMAIL ADDRESS" />
                </div>
              ) : (
                <>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight uppercase">{profile?.name}</h3>
                  <p className="text-xs font-black text-indigo-500 uppercase tracking-widest mt-1">{profile?.designation}</p>
                  {profile?.email && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{profile.email}</p>}
                </>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 p-6 bg-slate-50 border border-slate-100 rounded-[2rem]">
             <div>
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Location</p>
               {isEditingProfile ? (
                 <div className="flex gap-2">
                   <input className="w-full text-xs font-black text-slate-800 uppercase border-b border-slate-300 bg-transparent outline-none" value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} placeholder="CITY" />
                   <input className="w-full text-xs font-black text-slate-800 uppercase border-b border-slate-300 bg-transparent outline-none" value={editForm.country} onChange={e => setEditForm({...editForm, country: e.target.value})} placeholder="COUNTRY" />
                 </div>
               ) : (
                 <p className="text-xs font-black text-slate-800 uppercase">{profile?.city}, {profile?.country}</p>
               )}
             </div>
             <div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Currency</p><p className="text-xs font-black text-indigo-600 uppercase">{profile?.currency}</p></div>
          </div>
        </div>
      </div>

      {/* Settings & Support Grid */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] mb-8">Settings & Support</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settingsOptions.map((option) => (
            <button 
              key={option.id}
              onClick={option.action}
              className="flex items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-indigo-50 hover:border-indigo-100 transition-all group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 shadow-sm transition-colors">
                  {option.icon}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-700 uppercase tracking-tight group-hover:text-indigo-900">{option.label}</p>
                  {option.value && <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">{option.value}</p>}
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-400" />
            </button>
          ))}
        </div>
      </div>

      {/* Cloud Vault Diagnostics */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm relative overflow-hidden">
         <div className="absolute top-0 right-0 p-4 text-6xl opacity-5 font-black text-indigo-600">CLOUD</div>
          <div className="flex justify-between items-center mb-6 relative z-10">
            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">Cloud Identity Service (Firebase)</h4>
            <div className="flex items-center gap-2">
              {isAuthenticated ? <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-emerald-100">● Auth Active</span> : <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-rose-100 animate-pulse">● Auth Pending</span>}
            </div>
          </div>
          
          <div className="relative z-10 space-y-4">
             {!isAuthenticated ? (
               <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl space-y-4">
                  <p className="text-[10px] font-black text-rose-900 uppercase tracking-tight">Authentication Required</p>
                  <p className="text-[9px] font-medium text-rose-700/80 leading-relaxed uppercase">
                     Your session is not authenticated via Firebase. Please initialize your vault to enable secure cloud identity.
                  </p>
                  <div className="flex gap-2">
                    <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="px-4 py-2 bg-black text-white text-[10px] font-black uppercase rounded-xl shadow-lg">Open Console</a>
                  </div>
               </div>
             ) : (
               <div className="space-y-4">
                 <div className="flex items-center justify-between">
                   <p className="text-[10px] text-slate-500 uppercase tracking-widest">Authenticated via Firebase Email Auth.</p>
                 </div>
                 <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                    <p className="text-[9px] font-black text-indigo-900 uppercase mb-2">Security Note</p>
                    <p className="text-[8px] text-indigo-700 uppercase leading-relaxed">
                       Cloud Storage and Firestore are currently used for identity and profile synchronization. Local data is encrypted and stored on-device.
                    </p>
                 </div>
               </div>
             )}
          </div>
      </div>

      {/* Google Drive Configuration Card (Removed) */}

      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">Family Members</h4>
          <button onClick={() => setShowAddMember(true)} className="px-6 py-3 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl">+ Invite Member</button>
        </div>
        <div className="space-y-4">
          {profile?.familyMembers.map(member => (
            <div key={member.id} className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-6 group">
              <div className="flex items-center gap-5">
                <div className={`w-12 h-12 flex items-center justify-center font-black rounded-2xl border border-slate-200 uppercase text-xl ${member.status === 'verified' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-300'}`}>
                   {member.status === 'verified' ? '✓' : '⏳'}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800 uppercase">{member.name}</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{member.relation} • {member.status === 'verified' ? 'Verified Session' : 'Pending Verification'}</p>
                  <div className="flex gap-2 mt-1">
                    {member.mobileNumber && <span className="text-[8px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-bold flex items-center gap-1"><Phone size={8} /> {member.mobileNumber}</span>}
                    {member.email && <span className="text-[8px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-bold flex items-center gap-1"><Mail size={8} /> {member.email}</span>}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-end mt-2 md:mt-0">
                 {member.status === 'pending_invitation' && (
                   <button onClick={() => verifyFamilyMember(member.id)} className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black uppercase rounded-xl hover:bg-emerald-100 transition-colors">Simulate Accept</button>
                 )}
                 <button onClick={() => setShowPermissions(member.id)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-xl hover:bg-slate-100 transition-colors">Manage Access</button>
                 <button onClick={() => handleDeleteMember(member.id, member.name)} className="px-4 py-2 bg-white border border-slate-200 text-rose-500 text-[10px] font-black uppercase rounded-xl hover:bg-rose-50 hover:border-rose-100 transition-colors">Remove</button>
              </div>
            </div>
          ))}
          {profile?.familyMembers.length === 0 && <p className="py-12 text-center text-slate-300 italic text-[10px] uppercase tracking-widest">No participant links active</p>}
        </div>
      </div>

      {/* Secure Notifications / Monitored Apps */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">Secure Notifications</h4>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-indigo-100">
            {profile.monitoredApps?.length || 0} Active
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {SUGGESTED_APPS.map(app => {
             const isActive = profile.monitoredApps?.some(a => a.id === app.id);
             return (
               <div 
                 key={app.id} 
                 onClick={() => {
                   const currentApps = profile.monitoredApps || [];
                   let newApps;
                   if (isActive) {
                     newApps = currentApps.filter(a => a.id !== app.id);
                   } else {
                     newApps = [...currentApps, { ...app, isEnabled: true }];
                   }
                   updateMonitoredApps(newApps);
                 }}
                 className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${isActive ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}
               >
                 <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm ${isActive ? 'bg-white text-indigo-600' : 'bg-white text-slate-400'}`}>
                      {app.icon}
                    </div>
                    <div>
                       <p className={`text-[10px] font-black uppercase tracking-tight ${isActive ? 'text-indigo-900' : 'text-slate-500'}`}>{app.name}</p>
                       <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{app.category}</p>
                    </div>
                 </div>
                 <div className={`w-8 h-5 rounded-full relative transition-colors ${isActive ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isActive ? 'left-4' : 'left-1'}`}></div>
                 </div>
               </div>
             );
           })}
        </div>
      </div>

      {/* Developer / Demo Tools for Request Simulation */}
      <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-xl relative overflow-hidden">
         <div className="relative z-10">
           <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Simulation Zone</h4>
           <div className="flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="space-y-1">
               <p className="text-lg font-black uppercase tracking-tight">Test Incoming Requests</p>
               <p className="text-[9px] text-slate-400 uppercase tracking-widest">Simulate another user requesting to link with your vault.</p>
             </div>
             <button 
               onClick={() => simulateIncomingRequest('Demo User', '9999999999', 'Partner')}
               className="px-6 py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-white/10 transition-colors"
             >
               Trigger Remote Request
             </button>
           </div>
         </div>
      </div>

      {showPermissions && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4" onClick={() => setShowPermissions(null)}>
           <div className="bg-white w-full max-lg rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-10">
                 <div>
                   <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Permission Matrix</h4>
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Audit Constraints for {profile.familyMembers.find(m => m.id === showPermissions)?.name}</p>
                 </div>
                 <button onClick={() => setShowPermissions(null)} className="text-slate-200 hover:text-slate-800 text-2xl font-black transition-colors">✕</button>
              </div>

              <div className="space-y-3">
                {[
                  { key: 'viewDashboard', label: 'Dashboard Access', desc: 'Summary metrics & live burn rates' },
                  { key: 'viewStatements', label: 'Audit Statements', desc: 'P&L and Balance Sheet details' },
                  { key: 'viewTransactions', label: 'History Ledger', desc: 'Full transaction timeline' },
                  { key: 'viewBudget', label: 'Budget Architect', desc: 'Target allocation controls' },
                  { key: 'viewCalendar', label: 'Fiscal Sentinel', desc: 'Due date pressure analysis' },
                  { key: 'viewAccounts', label: 'Instrument Vault', desc: 'Bank & Credit Card configurations' },
                  { key: 'canCreateTransactions', label: 'Write Access', desc: 'Ability to record new transactions' }
                ].map((perm) => (
                  <div key={perm.key} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-indigo-200 transition-all cursor-pointer" onClick={() => togglePermission(showPermissions, perm.key as keyof MemberPermissions)}>
                    <div>
                      <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{perm.label}</p>
                      <p className="text-[8px] text-slate-400 font-medium">{perm.desc}</p>
                    </div>
                    <div className={`w-12 h-7 rounded-full relative transition-all ${profile.familyMembers.find(m => m.id === showPermissions)?.permissions[perm.key as keyof MemberPermissions] ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${profile.familyMembers.find(m => m.id === showPermissions)?.permissions[perm.key as keyof MemberPermissions] ? 'left-6' : 'left-1'}`}></div>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={() => setShowPermissions(null)} className="w-full mt-10 py-5 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all">Apply Constraints</button>
           </div>
        </div>
      )}

      {showCurrencySelector && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4" onClick={() => setShowCurrencySelector(false)}>
           <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
              <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-4">Select Currency</h4>
              
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs uppercase" 
                  placeholder="Search Country or Currency..." 
                  value={currencySearch}
                  onChange={e => setCurrencySearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-1">
                 {/* Recommendations based on profile country if no search */}
                 {!currencySearch && profile.country && (
                   <div className="mb-4">
                     <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2 px-2">Recommended</p>
                     {COUNTRIES.filter(c => c.name.toLowerCase() === profile.country.toLowerCase()).map(c => (
                       <button key={c.code} onClick={() => handleCurrencyChange(c.currency)} className="w-full p-4 rounded-2xl text-left font-black text-xs uppercase flex justify-between items-center bg-indigo-50 text-indigo-900 border border-indigo-100 mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{c.flag}</span>
                            <div>
                              <p>{c.name}</p>
                              <p className="text-[9px] opacity-70">{c.currency} - {c.currencyName}</p>
                            </div>
                          </div>
                          {profile.currency === c.currency && <span>✓</span>}
                       </button>
                     ))}
                   </div>
                 )}

                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">All Currencies</p>
                 {COUNTRIES.filter(c => 
                    c.name.toLowerCase().includes(currencySearch.toLowerCase()) || 
                    c.currency.toLowerCase().includes(currencySearch.toLowerCase()) ||
                    c.currencyName.toLowerCase().includes(currencySearch.toLowerCase())
                 ).map(c => (
                   <button key={c.code} onClick={() => handleCurrencyChange(c.currency)} className={`w-full p-4 rounded-2xl text-left font-black text-xs uppercase flex justify-between items-center ${profile.currency === c.currency ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{c.flag}</span>
                        <div>
                          <p>{c.name}</p>
                          <p className={`text-[9px] ${profile.currency === c.currency ? 'text-indigo-200' : 'text-slate-400'}`}>{c.currency} - {c.currencyName}</p>
                        </div>
                      </div>
                      {profile.currency === c.currency && <span>✓</span>}
                   </button>
                 ))}
                 {COUNTRIES.filter(c => c.name.toLowerCase().includes(currencySearch.toLowerCase())).length === 0 && (
                   <p className="text-center py-8 text-slate-400 text-xs">No matches found</p>
                 )}
              </div>
           </div>
        </div>
      )}

      {showReminders && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4" onClick={() => setShowReminders(false)}>
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Daily Check-in</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-8">Set a time for your daily financial review.</p>
              
              <div className="flex justify-center mb-8 relative">
                 <input 
                   type="time" 
                   value={reminderTime} 
                   onChange={(e) => setReminderTime(e.target.value)}
                   className="text-4xl font-black text-slate-800 bg-slate-50 p-4 rounded-2xl border border-slate-200 outline-none focus:border-indigo-500 transition-colors text-center w-full"
                 />
                 {/* Visual helper for 12h format since input type=time depends on OS locale */}
                 <div className="absolute -bottom-6 text-xs font-bold text-indigo-500 uppercase tracking-widest">
                   {formatTime12h(reminderTime)}
                 </div>
              </div>

              <div className="flex gap-4 mt-8">
                 <button onClick={() => { updateProfile({ ...profile, remindersEnabled: false }); setShowReminders(false); }} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black text-[10px] uppercase rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-colors">Disable</button>
                 <button onClick={handleReminderSave} className="flex-[2] py-4 bg-black text-white font-black text-[10px] uppercase rounded-2xl shadow-xl">Save Reminder</button>
              </div>
           </div>
        </div>
      )}

      {memberToDelete && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4" onClick={() => setMemberToDelete(null)}>
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center text-3xl mb-6 mx-auto">
                 <AlertTriangle />
              </div>
              <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight text-center mb-2">Remove Member?</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mb-8 leading-relaxed">
                 Are you sure you want to remove <span className="text-slate-800">{memberToDelete.name}</span>? This action cannot be undone and will revoke all their access.
              </p>
              
              <div className="flex gap-4">
                 <button onClick={() => setMemberToDelete(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black text-[10px] uppercase rounded-2xl">Cancel</button>
                 <button onClick={confirmDeleteMember} className="flex-1 py-4 bg-rose-500 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl shadow-rose-500/20">Remove</button>
              </div>
           </div>
        </div>
      )}

      {showAddMember && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setShowAddMember(false)}>
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
             <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-10">Link Participant</h4>
             <form onSubmit={handleAddMember} className="space-y-6">
                <input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-xs uppercase" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} placeholder="Legal Name" />
                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none cursor-pointer" value={newMember.relation} onChange={e => setNewMember({...newMember, relation: e.target.value})}>
                  <option>Spouse</option><option>Child</option><option>Parent</option><option>Partner</option>
                </select>
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Authentication Method (One Required)</p>
                  <input type="tel" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-xs" value={newMember.mobile} onChange={e => setNewMember({...newMember, mobile: e.target.value.replace(/\D/g, '')})} placeholder="Mobile Number" />
                  <input type="email" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-xs" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} placeholder="Email Address" />
                </div>
                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => setShowAddMember(false)} className="flex-1 px-4 py-4 bg-slate-100 text-slate-500 font-black text-[10px] uppercase rounded-2xl">Cancel</button>
                  <button type="submit" className="flex-[2] px-4 py-4 bg-black text-white font-black text-[10px] uppercase rounded-2xl shadow-xl">Send Invite</button>
                </div>
             </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
