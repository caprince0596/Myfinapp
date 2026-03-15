
import React, { useState, useEffect, useRef } from 'react';
import { useFinance } from '../store/FinanceContext';
import { MonitoredApp } from '../types';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';

const countries = [
  { name: 'Afghanistan', currency: 'AFN', symbol: '؋' },
  { name: 'Albania', currency: 'ALL', symbol: 'L' },
  { name: 'Algeria', currency: 'DZD', symbol: 'د.ج' },
  { name: 'Argentina', currency: 'ARS', symbol: '$' },
  { name: 'Australia', currency: 'AUD', symbol: '$' },
  { name: 'Austria', currency: 'EUR', symbol: '€' },
  { name: 'Bahrain', currency: 'BHD', symbol: '.د.ب' },
  { name: 'Bangladesh', currency: 'BDT', symbol: '৳' },
  { name: 'Belgium', currency: 'EUR', symbol: '€' },
  { name: 'Brazil', currency: 'BRL', symbol: 'R$' },
  { name: 'Canada', currency: 'CAD', symbol: '$' },
  { name: 'China', currency: 'CNY', symbol: '¥' },
  { name: 'Denmark', currency: 'DKK', symbol: 'kr' },
  { name: 'Egypt', currency: 'EGP', symbol: '£' },
  { name: 'Finland', currency: 'EUR', symbol: '€' },
  { name: 'France', currency: 'EUR', symbol: '€' },
  { name: 'Germany', currency: 'EUR', symbol: '€' },
  { name: 'Greece', currency: 'EUR', symbol: '€' },
  { name: 'Hong Kong', currency: 'HKD', symbol: '$' },
  { name: 'India', currency: 'INR', symbol: '₹' },
  { name: 'Indonesia', currency: 'IDR', symbol: 'Rp' },
  { name: 'Ireland', currency: 'EUR', symbol: '€' },
  { name: 'Israel', currency: 'ILS', symbol: '₪' },
  { name: 'Italy', currency: 'EUR', symbol: '€' },
  { name: 'Japan', currency: 'JPY', symbol: '¥' },
  { name: 'Kenya', currency: 'KES', symbol: 'KSh' },
  { name: 'Kuwait', currency: 'KWD', symbol: 'د.ك' },
  { name: 'Malaysia', currency: 'MYR', symbol: 'RM' },
  { name: 'Mexico', currency: 'MXN', symbol: '$' },
  { name: 'Netherlands', currency: 'EUR', symbol: '€' },
  { name: 'New Zealand', currency: 'NZD', symbol: '$' },
  { name: 'Nigeria', currency: 'NGN', symbol: '₦' },
  { name: 'Norway', currency: 'NOK', symbol: 'kr' },
  { name: 'Pakistan', currency: 'PKR', symbol: '₨' },
  { name: 'Philippines', currency: 'PHP', symbol: '₱' },
  { name: 'Poland', currency: 'PLN', symbol: 'zł' },
  { name: 'Portugal', currency: 'EUR', symbol: '€' },
  { name: 'Qatar', currency: 'QAR', symbol: 'ر.ق' },
  { name: 'Russia', currency: 'RUB', symbol: '₽' },
  { name: 'Saudi Arabia', currency: 'SAR', symbol: 'ر.س' },
  { name: 'Singapore', currency: 'SGD', symbol: '$' },
  { name: 'South Africa', currency: 'ZAR', symbol: 'R' },
  { name: 'South Korea', currency: 'KRW', symbol: '₩' },
  { name: 'Spain', currency: 'EUR', symbol: '€' },
  { name: 'Sri Lanka', currency: 'LKR', symbol: 'Rs' },
  { name: 'Sweden', currency: 'SEK', symbol: 'kr' },
  { name: 'Switzerland', currency: 'CHF', symbol: 'Fr' },
  { name: 'Taiwan', currency: 'TWD', symbol: 'NT$' },
  { name: 'Thailand', currency: 'THB', symbol: '฿' },
  { name: 'Turkey', currency: 'TRY', symbol: '₺' },
  { name: 'United Arab Emirates', currency: 'AED', symbol: 'د.إ' },
  { name: 'United Kingdom', currency: 'GBP', symbol: '£' },
  { name: 'United States', currency: 'USD', symbol: '$' },
  { name: 'Vietnam', currency: 'VND', symbol: '₫' },
];

const SUGGESTED_APPS: MonitoredApp[] = [
  { id: 'app1', name: 'PhonePe', icon: '💎', isEnabled: true, category: 'UPI' },
  { id: 'app2', name: 'Google Pay', icon: '🌀', isEnabled: true, category: 'UPI' },
  { id: 'app3', name: 'Paytm', icon: '🅿️', isEnabled: false, category: 'UPI' },
  { id: 'app4', name: 'HDFC Mobile', icon: '🏦', isEnabled: true, category: 'Banking' },
  { id: 'app5', name: 'ICICI iMobile', icon: '🏰', isEnabled: false, category: 'Banking' },
  { id: 'app6', name: 'Zerodha', icon: '📈', isEnabled: true, category: 'Investment' },
  { id: 'app7', name: 'Binance', icon: '🪙', isEnabled: false, category: 'Investment' },
];

const Onboarding: React.FC = () => {
  const { state, updateProfile, setAuthenticated, addWallet, loadStateFromCloud, updateMonitoredApps } = useFinance();
  const [authState, setAuthState] = useState<'WELCOME' | 'PROFILE' | 'APP_SENTINEL'>('WELCOME');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isVerifyingCloud, setIsVerifyingCloud] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  // Rotating Quotes State
  const quotes = [
    "Let's Build Wealth",
    "Let's Track Expenses",
    "Let Me Understand My Finances",
    "Let me Retire Early",
    "Let me Plan my Taxes"
  ];
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setQuoteIndex((prev) => (prev + 1) % quotes.length);
        setIsFading(false);
      }, 300);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const activeSession = localStorage.getItem('myfin_active_session');
    if (activeSession) {
      setEmail(activeSession);
      // If user is authenticated but we are still on WELCOME, move to PROFILE
      if (authState === 'WELCOME') {
        setAuthState('PROFILE');
      }
    }
  }, [authState]);
  
  // Sentinel State
  const [isScanning, setIsScanning] = useState(false);
  const [detectedApps, setDetectedApps] = useState<MonitoredApp[]>([]);
  const [hasScanned, setHasScanned] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    designation: '',
    age: '',
    city: '',
    country: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    openingCash: '0'
  });

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setError(null);
    setIsVerifyingCloud(true);
    
    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (!userCredential.user.emailVerified) {
          await signOut(auth);
          setVerificationSent(true);
          setIsVerifyingCloud(false);
          return;
        }
        // Store session in local storage
        localStorage.setItem('myfin_active_session', email);
        // Transition to PROFILE screen
        setAuthState('PROFILE');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        await signOut(auth);
        setVerificationSent(true);
        setIsLogin(true);
      }
    } catch (err: any) {
      console.error('Auth Error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use. Try logging in.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError('Authentication failed. Please try again.');
      }
    } finally {
      setIsVerifyingCloud(false);
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthState('APP_SENTINEL');
  };

  const startScanning = () => {
    setIsScanning(true);
    setTimeout(() => {
      setDetectedApps(SUGGESTED_APPS);
      setIsScanning(false);
      setHasScanned(true);
    }, 3000);
  };

  const toggleApp = (id: string) => {
    setDetectedApps(prev => prev.map(a => a.id === id ? { ...a, isEnabled: !a.isEnabled } : a));
  };

  const finalizeOnboarding = () => {
    updateProfile({ 
      ...formData, 
      age: Number(formData.age), 
      email: email,
      isBoarded: true, 
      familyMembers: [],
      cloudDatabaseName: 'Default_Vault',
      monitoredApps: detectedApps.filter(a => a.isEnabled),
      remindersEnabled: true
    });
    
    addWallet({ id: 'default-cash', name: 'Cash', balance: Number(formData.openingCash) });
    setAuthenticated(true);
  };

  const containerClasses = "fixed inset-0 w-full h-full bg-white md:bg-slate-50 flex items-center justify-center overflow-y-auto custom-scrollbar";
  const cardClasses = "w-full min-h-full md:min-h-0 md:max-w-md bg-white p-8 md:p-12 md:rounded-[3rem] md:shadow-2xl md:border md:border-slate-100 flex flex-col justify-center animate-in fade-in zoom-in-95 duration-500";

  if (verificationSent) {
    return (
      <div className={containerClasses}>
        <div className={cardClasses}>
          <div className="mb-12 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center text-3xl font-black mx-auto mb-6 shadow-xl shadow-emerald-200">✉️</div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-900">Verify Email</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3 leading-relaxed">
              Check your email and verify, then log in
            </p>
          </div>
          
          <div className="space-y-4 pt-4">
            <button 
              onClick={() => {
                setVerificationSent(false);
                setIsLogin(true);
                setError(null);
              }}
              className="w-full py-5 bg-black text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-slate-900 transition-all active:scale-95"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (authState === 'WELCOME') {
    return (
      <div className={containerClasses}>
        <div className={cardClasses}>
          <div className="mb-12 text-center">
            <div className="w-16 h-16 bg-indigo-600 text-white rounded-3xl flex items-center justify-center text-3xl font-black mx-auto mb-6 shadow-xl shadow-indigo-200">M</div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900">MyFin</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">Private Wealth Portal</p>
          </div>
          
          <form onSubmit={handleAuthSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Email Address</label>
                <div className="relative border-b-2 border-slate-100 pb-2 focus-within:border-indigo-600 transition-all duration-300">
                  <input 
                    required 
                    type="email" 
                    placeholder="email@example.com" 
                    className="w-full bg-transparent outline-none font-black text-xl tracking-tight text-slate-900 placeholder:text-slate-200" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Password</label>
                <div className="relative border-b-2 border-slate-100 pb-2 focus-within:border-indigo-600 transition-all duration-300">
                  <input 
                    required 
                    type="password" 
                    placeholder="••••••••" 
                    className="w-full bg-transparent outline-none font-black text-xl tracking-tight text-slate-900 placeholder:text-slate-200" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                  />
                </div>
              </div>
              
              {error && <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">{error}</p>}
            </div>
            
            <div className="space-y-4 pt-4">
              <button 
                type="submit" 
                disabled={isVerifyingCloud} 
                className={`w-full py-5 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 ${isVerifyingCloud ? 'bg-slate-300 text-slate-500 opacity-50 cursor-not-allowed' : 'bg-black hover:bg-slate-900 shadow-slate-200 active:scale-95'}`}
              >
                {isVerifyingCloud ? (<><span className="animate-spin">⚙️</span> Processing...</>) : (isLogin ? 'Login to Vault' : 'Create Vault')}
              </button>

              <button 
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                }}
                className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
              >
                {isLogin ? "Don't have a vault? Sign Up" : "Already have a vault? Login"}
              </button>
            </div>
          </form>
          
          <p className="mt-12 text-[10px] text-slate-400 text-center font-bold leading-relaxed uppercase tracking-widest opacity-60">
            Secure Cloud Identity Enabled
          </p>
        </div>
      </div>
    );
  }

  if (authState === 'APP_SENTINEL') {
    return (
      <div className={containerClasses}>
        <div className="w-full h-full md:h-auto md:max-w-2xl bg-white p-8 md:p-16 md:rounded-[3rem] md:shadow-2xl md:border md:border-slate-100 flex flex-col justify-start md:justify-center animate-in fade-in duration-500 overflow-y-auto md:max-h-[90dvh] custom-scrollbar">
          {!hasScanned && !isScanning ? (
            <div className="text-center py-10">
               <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner animate-pulse">📡</div>
               <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Allow Notifications</h2>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3 leading-loose">Let us help you stay financially organized. Enable notifications and we’ll remind you to log income or expenses when relevant apps open—without collecting or saving any personal activity.</p>
               <button 
                 onClick={startScanning}
                 className="mt-12 w-full py-6 bg-black text-white font-black text-[10px] uppercase tracking-[0.3em] rounded-3xl shadow-xl active:scale-95 transition-all"
               >
                 Secure App Scan
               </button>
               <button onClick={finalizeOnboarding} className="mt-4 text-[9px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-500 transition-colors">Skip – I Prefer Manual Tracking</button>
            </div>
          ) : isScanning ? (
            <div className="text-center py-20 relative">
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-40 h-40 border-4 border-indigo-100 rounded-full animate-ping opacity-20"></div>
                  <div className="absolute w-60 h-60 border-2 border-indigo-50 rounded-full animate-ping opacity-10" style={{ animationDelay: '0.5s' }}></div>
               </div>
               <div className="relative z-10">
                  <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-xl mx-auto mb-6 animate-bounce">🔍</div>
                  <p className="text-xs font-black text-indigo-600 uppercase tracking-[0.4em] animate-pulse">Scanning Ecosystem...</p>
                  <p className="text-[8px] font-black text-slate-300 uppercase mt-4 tracking-widest">Identifying local financial endpoints</p>
               </div>
            </div>
          ) : (
            <div className="animate-in fade-in duration-700">
               <div className="flex justify-between items-center mb-10">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Scan Result</h2>
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1">✓ Environment Verified</p>
                  </div>
                  <div className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[8px] font-black uppercase tracking-widest">7 Apps Found</div>
               </div>
               
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Link apps to enable "Contextual Reminders"</p>
               
               <div className="grid grid-cols-1 gap-3 mb-12">
                  {detectedApps.map(app => (
                    <div 
                      key={app.id} 
                      onClick={() => toggleApp(app.id)}
                      className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex items-center justify-between group ${app.isEnabled ? 'bg-indigo-50 border-indigo-600 shadow-lg shadow-indigo-100/50' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                    >
                      <div className="flex items-center gap-5">
                         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm transition-transform group-hover:scale-110 ${app.isEnabled ? 'bg-white text-indigo-600' : 'bg-slate-50'}`}>
                           {app.icon}
                         </div>
                         <div>
                            <p className={`text-xs font-black uppercase tracking-tight ${app.isEnabled ? 'text-indigo-600' : 'text-slate-800'}`}>{app.name}</p>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">{app.category}</p>
                         </div>
                      </div>
                      <div className={`w-10 h-6 rounded-full relative transition-colors ${app.isEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                         <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${app.isEnabled ? 'left-5' : 'left-1'}`}></div>
                      </div>
                    </div>
                  ))}
               </div>

               <div className="p-6 bg-slate-900 text-white rounded-[2.5rem] mb-10">
                  <div className="flex items-start gap-4">
                     <div className="text-2xl mt-1">🛡️</div>
                     <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1">Privacy Guarantee</p>
                        <p className="text-[10px] font-medium leading-relaxed text-slate-300">MyFin never reads transaction data from other apps. It only monitors activity to nudge you to log transactions manually.</p>
                     </div>
                  </div>
               </div>

               <button 
                 onClick={finalizeOnboarding}
                 className="w-full py-6 bg-black text-white font-black text-xs uppercase tracking-[0.2em] rounded-3xl shadow-2xl shadow-slate-200 hover:bg-slate-900 transition-all active:scale-95"
               >
                 Enable Secure Notifications
               </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <div className="w-full h-full md:h-auto md:max-w-2xl bg-white p-6 md:p-12 md:rounded-[3rem] md:shadow-2xl md:border md:border-slate-100 flex flex-col justify-center animate-in fade-in duration-500 overflow-y-auto md:max-h-[90dvh] custom-scrollbar">
        <div className="mb-6 shrink-0">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase">Setup Profile</h2>
        </div>
        
        <form onSubmit={handleProfileSubmit} className="space-y-5 md:space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            <div className="space-y-2 border-b-2 border-slate-100 pb-2 focus-within:border-indigo-600 transition-all">
              <label className="text-[9px] font-black text-black uppercase tracking-widest">What should we call you?</label>
              <input required placeholder="Your Full Name" className="w-full bg-transparent outline-none font-black text-lg md:text-xl text-slate-900 placeholder:text-slate-200" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2 border-b-2 border-slate-100 pb-2 focus-within:border-indigo-600 transition-all">
              <label className="text-[9px] font-black text-black uppercase tracking-widest">Profession</label>
              <input required placeholder="Designation" className="w-full bg-transparent outline-none font-black text-lg md:text-xl text-slate-900 placeholder:text-slate-200" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            <div className="space-y-2 border-b-2 border-slate-100 pb-2 focus-within:border-indigo-600 transition-all">
              <label className="text-[9px] font-black text-black uppercase tracking-widest">City</label>
              <input required placeholder="Current City" className="w-full bg-transparent outline-none font-black text-lg md:text-xl text-slate-900 placeholder:text-slate-200" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
            </div>
            <div className="space-y-2 border-b-2 border-slate-100 pb-2 focus-within:border-indigo-600 transition-all">
              <label className="text-[9px] font-black text-black uppercase tracking-widest">Currency Base</label>
              <select className="w-full bg-transparent outline-none font-black text-lg md:text-xl text-slate-900 cursor-pointer" value={formData.country} onChange={e => {
                const country = countries.find(c => c.name === e.target.value);
                setFormData({...formData, country: e.target.value, currency: country?.currency || 'USD', currencySymbol: country?.symbol || '$'});
              }}>
                {countries.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
          
          <div className="space-y-2 border-b-2 border-slate-100 pb-2 focus-within:border-indigo-600 transition-all">
            <label className="text-[9px] font-black text-black uppercase tracking-widest">Cash in Hand as on {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</label>
            <div className="flex items-center">
              <span className="text-indigo-600 font-black text-xl md:text-2xl mr-2">{formData.currencySymbol}</span>
              <input type="number" step="any" placeholder="0.00" className="w-full bg-transparent outline-none font-black text-3xl md:text-4xl text-slate-900" value={formData.openingCash} onChange={e => setFormData({...formData, openingCash: e.target.value})} />
            </div>
          </div>
          
          <button type="submit" className="w-full py-4 md:py-6 bg-black text-white font-black text-xs uppercase tracking-[0.2em] rounded-3xl shadow-2xl shadow-slate-200 hover:bg-slate-900 transition-all active:scale-95">
            <span className={`transition-opacity duration-300 block ${isFading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
              {quotes[quoteIndex]}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
