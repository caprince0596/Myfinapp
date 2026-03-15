
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { FinancialState, UserProfile, BankAccount, CreditCard, Wallet, IncomeStream, Expense, Asset, Liability, Transaction, FamilyMember, Notification, Budget, MonitoredApp, MemberPermissions, TransactionAttachment, Staff, StaffAttendance, Tenant } from '../types';


interface FinanceContextType {
  state: FinancialState;
  filteredState: FinancialState;
  isAuthenticated: boolean;
  activeMemberIds: string[];
  isCloudSyncing: boolean;
  connectionStatus: 'online' | 'offline' | 'checking';
  isNavHidden: boolean;
  setIsNavHidden: (hidden: boolean) => void;
  setActiveMemberIds: (ids: string[]) => void;
  setAuthenticated: (value: boolean) => void;
  updateProfile: (profile: UserProfile) => void;
  addFamilyMember: (member: FamilyMember) => Promise<{ success: boolean; syncedCount: number; error?: string }>;
  removeFamilyMember: (id: string) => void;
  updateMemberPermissions: (id: string, permissions: MemberPermissions) => void;
  verifyFamilyMember: (id: string) => void;
  approveTransaction: (id: string) => void;
  approveTransactions: (ids: string[]) => void;
  rejectTransaction: (id: string) => void;
  rejectTransactions: (ids: string[]) => void;
  addBank: (bank: BankAccount) => void;
  updateBank: (bank: BankAccount) => void;
  deleteBank: (id: string) => void;
  addCard: (card: CreditCard) => void;
  updateCard: (card: CreditCard) => void;
  deleteCard: (id: string) => void;
  addWallet: (wallet: Wallet) => void;
  updateWallet: (wallet: Wallet) => void;
  deleteWallet: (id: string) => void;
  addIncome: (income: IncomeStream) => void;
  addExpense: (expense: Expense) => void;
  addAsset: (asset: Asset) => void;
  updateAsset: (asset: Asset) => void;
  deleteAsset: (id: string) => void;
  addLiability: (liability: Liability) => void;
  updateLiability: (liability: Liability) => void;
  deleteLiability: (id: string) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (transaction: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addBudget: (budget: Budget) => void;
  updateBudget: (budget: Budget) => void;
  deleteBudget: (id: string) => void;
  addTransactionNature: (nature: string) => void;
  deleteTransactionNature: (nature: string) => void;
  addTransactions: (transactions: Transaction[]) => void;
  addStaff: (staff: Staff) => void;
  updateStaff: (staff: Staff) => void;
  deleteStaff: (id: string) => void;
  logStaffAttendance: (staffId: string, attendance: StaffAttendance | { date: string, status: 'None' }) => void;
  addTenant: (tenant: Tenant) => void;
  updateTenant: (tenant: Tenant) => void;
  deleteTenant: (id: string) => void;
  addNotification: (notification: Notification) => void;
  clearNotifications: () => void;
  markNotificationRead: (id: string) => void;
  simulateSync: () => Promise<void>;
  resetBoarding: () => Promise<void>;
  loadStateFromCloud: (mobile: string) => Promise<boolean>;
  verifyConnection: () => Promise<boolean>;
  importState: (newState: FinancialState) => void;
  updateMonitoredApps: (apps: MonitoredApp[]) => void;
  updateTaxProfile: (profile: any) => void;
  simulateIncomingRequest: (name: string, mobile: string, relation: string) => void;
  handleFamilyRequest: (notificationId: string, accepted: boolean) => void;
  uploadToDrive: (file: File) => Promise<TransactionAttachment>;
}

const GLOBAL_SESSION_KEY = 'myfin_active_session';
const STATE_PREFIX = 'myfin_state_';

const DEFAULT_PERMISSIONS: MemberPermissions = {
  viewDashboard: true,
  viewStatements: true,
  viewBudget: true,
  viewTransactions: true,
  viewCalendar: true,
  viewAccounts: true,
  canCreateTransactions: true
};

const initialState: FinancialState = {
  profile: { 
    name: '', designation: '', age: 0, city: '', country: 'India', currency: 'INR', mobileNumber: '',
    isBoarded: false, familyMembers: [], cloudDatabaseName: 'Default_Vault', monitoredApps: [], remindersEnabled: false,
    googleDriveConfig: { folderId: '', folderName: '', isConnected: false, linkedEmail: '' }
  },
  banks: [{ id: 'def-bank-1', name: 'Primary Savings Bank', balance: 0, accountType: 'Savings', classification: 'Current Asset' }],
  cards: [{ id: 'def-card-1', lenderName: 'Main Credit Card', balance: 0, last4: '0000', billingDay: 1, dueDate: '2024-01-15', offers: { movie: true, dining: true, concierge: false, lounge: true }, classification: 'Current Liability' }],
  wallets: [{ id: 'def-wallet-1', name: 'Cash', balance: 0, classification: 'Current Asset' }],
  incomes: [], expenses: [], assets: [], liabilities: [], transactions: [], budgets: [], notifications: [], transactionNatures: ['Salary', 'Rent', 'Food', 'Investment', 'Daily House Help'], capital: 0, staff: [], tenants: []
};

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within a FinanceProvider');
  return context;
};

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [activeMemberIds, setActiveMemberIds] = useState<string[]>([]);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'checking'>('online');
  const [isNavHidden, setIsNavHidden] = useState(false);

  useEffect(() => {
    const activeSession = localStorage.getItem(GLOBAL_SESSION_KEY);
    if (activeSession) {
      setAuthenticated(true);
    }
  }, []);
  
  // Google Drive State
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [availableFolders, setAvailableFolders] = useState<any[]>([]);

  const [state, setState] = useState<FinancialState>(() => {
    const email = localStorage.getItem(GLOBAL_SESSION_KEY);
    if (email) {
      const saved = localStorage.getItem(`${STATE_PREFIX}${email}`);
      if (saved) return { ...initialState, ...JSON.parse(saved) };
    }
    return initialState;
  });

  const verifyConnection = async (): Promise<boolean> => {
    setConnectionStatus('online');
    return true; // Mocked for now as Firestore is disabled
  };

  useEffect(() => {
    const activeSession = localStorage.getItem(GLOBAL_SESSION_KEY);
    if (activeSession && state.profile.isBoarded && state.profile.email === activeSession) {
      setAuthenticated(true);
      verifyConnection();
    }
  }, [state.profile.isBoarded, state.profile.email]);

  useEffect(() => {
    if (state.profile.email && state.profile.isBoarded) {
      localStorage.setItem(GLOBAL_SESSION_KEY, state.profile.email);
      localStorage.setItem(`${STATE_PREFIX}${state.profile.email}`, JSON.stringify(state));

      // Cloud Sync enabled for identity
      setConnectionStatus('online');
    }
  }, [state]);

  const loadStateFromCloud = async (email: string): Promise<boolean> => {
    setIsCloudSyncing(true);
    setConnectionStatus('checking');
    try {
      // Cloud loading logic would go here
      setConnectionStatus('online');
      return false;
    } catch (err: any) {
      console.error('Cloud Load Error:', err);
      setConnectionStatus('offline');
      return false;
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const simulateSync = async () => {
    if (state.profile.email) await loadStateFromCloud(state.profile.email);
  };

  const resetBoarding = async () => {
    if (state.profile.email) localStorage.removeItem(`${STATE_PREFIX}${state.profile.email}`);
    localStorage.removeItem(GLOBAL_SESSION_KEY);
    setAuthenticated(false);
    setState(initialState);
    setActiveMemberIds([]);
  };

  const uploadToDrive = async (file: File): Promise<TransactionAttachment> => {
    // Fallback to mock
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: `file_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          url: '#',
          mimeType: file.type,
          uploadDate: new Date().toISOString()
        });
      }, 1500);
    });
  };

  const applyTransactionEffect = (transaction: Transaction, newState: FinancialState, isReversing: boolean) => {
    if (transaction.status === 'pending_approval') return; 
    const factor = isReversing ? -1 : 1;
    const totalAmount = transaction.amount || 0;
    const balanceDelta = (transaction.type === 'Income' || transaction.type === 'Liability' || transaction.type === 'Receipt') ? totalAmount : -totalAmount;
    const finalBalanceDelta = balanceDelta * factor;

    if (transaction.accountType === 'bank') {
      newState.banks = newState.banks.map(b => b.id === transaction.accountId ? { ...b, balance: b.balance + finalBalanceDelta } : b);
    } else if (transaction.accountType === 'card') {
      const cardDelta = (transaction.type === 'Income' || transaction.type === 'Liability' || transaction.type === 'Receipt' ? -totalAmount : totalAmount) * factor;
      newState.cards = newState.cards.map(c => c.id === transaction.accountId ? { ...c, balance: c.balance + cardDelta } : c);
    } else if (transaction.accountType === 'wallet') {
      newState.wallets = newState.wallets.map(w => w.id === transaction.accountId ? { ...w, balance: w.balance + finalBalanceDelta } : w);
    } else if (transaction.accountType === 'asset') {
      newState.assets = newState.assets.map(a => a.id === transaction.accountId ? { ...a, value: a.value + finalBalanceDelta } : a);
    } else if (transaction.accountType === 'liability') {
      const liabilityDelta = (transaction.type === 'Income' || transaction.type === 'Liability' || transaction.type === 'Receipt' ? -totalAmount : totalAmount) * factor;
      newState.liabilities = newState.liabilities.map(l => l.id === transaction.accountId ? { ...l, amount: l.amount + liabilityDelta } : l);
    }
  };

  const addTransaction = (transaction: Transaction) => {
    setState(prev => {
      if (prev.transactions.some(t => t.id === transaction.id)) {
        console.warn(`Transaction with ID ${transaction.id} already exists. Skipping add.`);
        return prev;
      }
      const isForSelf = !transaction.ownerId || transaction.ownerId === '';
      const finalStatus: 'active' | 'pending_approval' = isForSelf ? 'active' : 'pending_approval';
      const creatorName = prev.profile.name || 'System'; 
      const txWithStatus: Transaction = { ...transaction, status: finalStatus, createdBy: creatorName };
      const newState = { ...prev, transactions: [txWithStatus, ...prev.transactions] };
      applyTransactionEffect(txWithStatus, newState, false);

      if (finalStatus === 'pending_approval') {
        const ownerName = prev.profile.familyMembers.find(m => m.id === transaction.ownerId)?.name || 'Member';
        newState.notifications = [{
          id: `approval_${txWithStatus.id}`,
          title: 'Pending Audit Sign-off',
          message: `A transaction of ${txWithStatus.amount} for ${ownerName} requires their verification.`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'approval_request',
          isRead: false,
          transactionId: txWithStatus.id
        }, ...newState.notifications];
      }
      return newState;
    });
  };

  const addTransactions = (transactions: Transaction[]) => {
    setState(prev => {
      const newState = { ...prev };
      const creatorName = prev.profile.name || 'System';
      
      const txsWithStatus = transactions.map(tx => {
        const isForSelf = !tx.ownerId || tx.ownerId === '';
        const finalStatus: 'active' | 'pending_approval' = isForSelf ? 'active' : 'pending_approval';
        return { ...tx, status: finalStatus, createdBy: creatorName };
      });

      newState.transactions = [...txsWithStatus, ...prev.transactions];
      
      txsWithStatus.forEach(tx => {
        applyTransactionEffect(tx, newState, false);
        if (tx.status === 'pending_approval') {
          const ownerName = prev.profile.familyMembers.find(m => m.id === tx.ownerId)?.name || 'Member';
          newState.notifications = [{
            id: `approval_${tx.id}`,
            title: 'Pending Audit Sign-off',
            message: `A transaction of ${tx.amount} for ${ownerName} requires their verification.`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'approval_request',
            isRead: false,
            transactionId: tx.id
          }, ...newState.notifications];
        }
      });
      
      return newState;
    });
  };

  const approveTransaction = (id: string) => {
    setState(prev => {
      const tx = prev.transactions.find(t => t.id === id);
      if (!tx) return prev;
      const updatedTx = { ...tx, status: 'active' as const };
      const newState = { ...prev, transactions: prev.transactions.map(t => t.id === id ? updatedTx : t) };
      applyTransactionEffect(updatedTx, newState, false);
      newState.notifications = prev.notifications.filter(n => n.transactionId !== id);
      return newState;
    });
  };

  const approveTransactions = (ids: string[]) => {
    setState(prev => {
      const newState = { ...prev };
      const pendingTxs = prev.transactions.filter(t => ids.includes(t.id) && t.status === 'pending_approval');
      if (pendingTxs.length === 0) return prev;
      newState.transactions = prev.transactions.map(t => {
        if (ids.includes(t.id) && t.status === 'pending_approval') return { ...t, status: 'active' as const };
        return t;
      });
      pendingTxs.forEach(tx => applyTransactionEffect({ ...tx, status: 'active' }, newState, false));
      newState.notifications = prev.notifications.filter(n => !n.transactionId || !ids.includes(n.transactionId));
      return newState;
    });
  };

  const rejectTransaction = (id: string) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id),
      notifications: prev.notifications.filter(n => n.transactionId !== id)
    }));
  };

  const rejectTransactions = (ids: string[]) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => !ids.includes(t.id)),
      notifications: prev.notifications.filter(n => !n.transactionId || !ids.includes(n.transactionId))
    }));
  };

  const deleteTransaction = (id: string) => {
    setState(prev => {
      const tx = prev.transactions.find(t => t.id === id);
      if (!tx) return prev;

      // Find related child transactions (e.g., splits)
      const childTxs = prev.transactions.filter(t => t.id.startsWith(`${id}_split_`) || t.id.startsWith(`${id}_rel`));
      const allTxsToDelete = [tx, ...childTxs];
      const allIdsToDelete = allTxsToDelete.map(t => t.id);

      const newState = { 
          ...prev, 
          transactions: prev.transactions.filter(t => !allIdsToDelete.includes(t.id)),
          notifications: prev.notifications.filter(n => !n.transactionId || !allIdsToDelete.includes(n.transactionId))
      };

      allTxsToDelete.forEach(transaction => {
          // 1. Reverse effect on main account
          applyTransactionEffect(transaction, newState, true);

          // 2. Reverse effect on related Asset/Liability (if any)
          if (transaction.relatedAssetLiabilityId) {
              console.log(`[Delete] Processing related entity for tx ${transaction.id}. Entity ID: ${transaction.relatedAssetLiabilityId}, Amount: ${transaction.amount}`);
              const asset = newState.assets.find(a => a.id === transaction.relatedAssetLiabilityId);
              if (asset) {
                  console.log(`[Delete] Found Asset ${asset.name}. Old Value: ${asset.value}. Subtracting ${transaction.amount}`);
                  newState.assets = newState.assets.map(a => a.id === asset.id ? { ...a, value: a.value - (transaction.amount || 0) } : a);
              } else {
                  const liability = newState.liabilities.find(l => l.id === transaction.relatedAssetLiabilityId);
                  if (liability) {
                      console.log(`[Delete] Found Liability ${liability.name}. Old Amount: ${liability.amount}. Subtracting ${transaction.amount}`);
                      newState.liabilities = newState.liabilities.map(l => l.id === liability.id ? { ...l, amount: l.amount - (transaction.amount || 0) } : l);
                  } else {
                      console.warn(`[Delete] Related entity ${transaction.relatedAssetLiabilityId} not found in Assets or Liabilities.`);
                  }
              }
          }
      });

      return newState;
    });
  };

  const updateTransaction = (transaction: Transaction) => {
    setState(prev => {
      const oldTx = prev.transactions.find(t => t.id === transaction.id);
      if (!oldTx) return prev;
      const newState = { ...prev, transactions: prev.transactions.map(t => t.id === transaction.id ? transaction : t) };
      applyTransactionEffect(oldTx, newState, true);
      applyTransactionEffect(transaction, newState, false);
      return newState;
    });
  };

  const addFamilyMember = async (member: FamilyMember) => {
    setState(prev => ({ ...prev, profile: { ...prev.profile, familyMembers: [...prev.profile.familyMembers, { ...member, permissions: DEFAULT_PERMISSIONS, status: 'pending_invitation' }] } }));
    return { success: true, syncedCount: 0 };
  };

  const verifyFamilyMember = (id: string) => {
    setState(prev => ({
      ...prev,
      profile: { ...prev.profile, familyMembers: prev.profile.familyMembers.map(m => m.id === id ? { ...m, status: 'verified' as const } : m) }
    }));
  };

  const updateMemberPermissions = (id: string, permissions: MemberPermissions) => {
    setState(prev => ({
      ...prev,
      profile: { ...prev.profile, familyMembers: prev.profile.familyMembers.map(m => m.id === id ? { ...m, permissions } : m) }
    }));
  };

  const simulateIncomingRequest = (name: string, mobile: string, relation: string) => {
    const newNotif: Notification = {
      id: `req_${Date.now()}`,
      title: 'Priority: Family Link Request',
      message: `${name} (${relation}) is requesting to link vaults with you. Accept to grant access based on their settings.`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'family_request',
      isRead: false,
      requestData: { name, mobile, relation }
    };
    setState(prev => ({ ...prev, notifications: [newNotif, ...prev.notifications] }));
  };

  const handleFamilyRequest = (notificationId: string, accepted: boolean) => {
    setState(prev => {
      const newState = { ...prev };
      const notif = prev.notifications.find(n => n.id === notificationId);
      newState.notifications = prev.notifications.filter(n => n.id !== notificationId);
      if (accepted && notif && notif.requestData) {
        const newMember: FamilyMember = {
          id: `mem_${Date.now()}`,
          name: notif.requestData.name,
          mobileNumber: notif.requestData.mobile,
          relation: notif.requestData.relation,
          status: 'verified',
          permissions: DEFAULT_PERMISSIONS
        };
        if (!prev.profile.familyMembers.some(m => m.mobileNumber === newMember.mobileNumber)) {
          newState.profile.familyMembers = [...prev.profile.familyMembers, newMember];
        } else {
          newState.profile.familyMembers = prev.profile.familyMembers.map(m => m.mobileNumber === newMember.mobileNumber ? { ...m, status: 'verified' } : m);
        }
      }
      return newState;
    });
  };

  const addTransactionNature = (nature: string) => {
    setState(prev => {
      if (prev.transactionNatures.includes(nature)) return prev;
      return { ...prev, transactionNatures: [...prev.transactionNatures, nature] };
    });
  };

  const deleteTransactionNature = (nature: string) => {
    setState(prev => ({ ...prev, transactionNatures: prev.transactionNatures.filter(n => n !== nature) }));
  };

  const addStaff = (staff: Staff) => {
    setState(prev => {
      const updatedNatures = [...prev.transactionNatures];
      if (!updatedNatures.includes(staff.name)) updatedNatures.push(staff.name);
      
      const updatedLiabilities = [...(prev.liabilities || [])];
      const ledgerName = `Wages Payable - ${staff.name}`;
      if (!updatedLiabilities.some(l => l.name === ledgerName)) {
        updatedLiabilities.push({
          id: `staff_ledger_${staff.id}`,
          name: ledgerName,
          amount: 0,
          type: 'Payable',
          classification: 'Current Liability'
        });
      }

      return { 
        ...prev, 
        staff: [...(prev.staff || []), staff], 
        transactionNatures: updatedNatures,
        liabilities: updatedLiabilities
      };
    });
  };

  const updateStaff = (staff: Staff) => {
    setState(prev => {
      const oldStaff = prev.staff.find(s => s.id === staff.id);
      const updatedNatures = prev.transactionNatures.map(n => n === oldStaff?.name ? staff.name : n);
      if (!updatedNatures.includes(staff.name)) updatedNatures.push(staff.name);
      
      const oldLedgerName = `Wages Payable - ${oldStaff?.name}`;
      const newLedgerName = `Wages Payable - ${staff.name}`;
      const updatedLiabilities = prev.liabilities.map(l => l.name === oldLedgerName ? { ...l, name: newLedgerName } : l);
      
      return { 
        ...prev, 
        staff: (prev.staff || []).map(s => s.id === staff.id ? staff : s),
        transactionNatures: updatedNatures,
        liabilities: updatedLiabilities
      };
    });
  };

  const deleteStaff = (id: string) => {
    setState(prev => {
      const staff = prev.staff.find(s => s.id === id);
      const ledgerName = `Wages Payable - ${staff?.name}`;
      return { 
        ...prev, 
        staff: (prev.staff || []).filter(s => s.id !== id),
        liabilities: prev.liabilities.filter(l => l.name !== ledgerName)
      };
    });
  };

  const logStaffAttendance = (staffId: string, entry: StaffAttendance | { date: string, status: 'None' }) => {
    setState(prev => ({
      ...prev,
      staff: (prev.staff || []).map(s => {
        if (s.id !== staffId) return s;
        const newAttendance = (s.attendance || []).filter(a => a.date !== entry.date);
        if (entry.status !== 'None') {
          newAttendance.push(entry as StaffAttendance);
        }
        return { ...s, attendance: newAttendance };
      })
    }));
  };

  const addTenant = (tenant: Tenant) => {
    setState(prev => {
      const updatedLiabilities = [...prev.liabilities];
      const updatedAssets = [...prev.assets];
      
      // Create Security Deposit Liability
      if (!updatedLiabilities.some(l => l.id === tenant.securityDepositLiabilityAccountId)) {
        updatedLiabilities.push({
          id: tenant.securityDepositLiabilityAccountId,
          name: `Security Deposit - ${tenant.name} (${tenant.propertyNumber})`,
          amount: tenant.securityDeposit,
          type: 'Debt',
          classification: 'Non-Current Liability'
        });
      }

      // Create Receivable Asset
      if (!updatedAssets.some(a => a.id === tenant.receivableAccountId)) {
        updatedAssets.push({
          id: tenant.receivableAccountId,
          name: `Rent Receivable - ${tenant.name}`,
          value: 0,
          type: 'Receivable',
          classification: 'Current Asset'
        });
      }

      return {
        ...prev,
        tenants: [...(prev.tenants || []), tenant],
        liabilities: updatedLiabilities,
        assets: updatedAssets
      };
    });
  };

  const updateTenant = (tenant: Tenant) => {
    setState(prev => ({
      ...prev,
      tenants: (prev.tenants || []).map(t => t.id === tenant.id ? tenant : t)
    }));
  };

  const deleteTenant = (id: string) => {
    setState(prev => ({
      ...prev,
      tenants: (prev.tenants || []).filter(t => t.id !== id)
    }));
  };

  const addNotification = (notification: Notification) => {
    setState(prev => ({
      ...prev,
      notifications: [notification, ...prev.notifications]
    }));
  };

  const filteredState = useMemo(() => {
    if (activeMemberIds.includes('all')) return state;
    const filterIds = activeMemberIds.length > 0 ? activeMemberIds : [undefined, ''];
    const filterFn = (item: any) => filterIds.includes(item.ownerId || '');
    return {
      ...state,
      banks: state.banks.filter(filterFn),
      cards: state.cards.filter(filterFn),
      wallets: state.wallets.filter(filterFn),
      transactions: state.transactions.filter(filterFn),
    };
  }, [state, activeMemberIds]);

  return (
    <FinanceContext.Provider value={{ 
      state, filteredState, isAuthenticated, activeMemberIds, isCloudSyncing, connectionStatus, isNavHidden, setIsNavHidden, setActiveMemberIds, setAuthenticated, updateProfile: (p) => setState(prev => ({...prev, profile: {...p, isBoarded: true}})), 
      addFamilyMember, removeFamilyMember: (id) => setState(prev => ({...prev, profile: {...prev.profile, familyMembers: prev.profile.familyMembers.filter(m => m.id !== id)}})), 
      updateMemberPermissions, verifyFamilyMember, approveTransaction, approveTransactions, rejectTransaction, rejectTransactions,
      addBank: (b) => setState(prev => ({...prev, banks: [...prev.banks, b]})), updateBank: (b) => setState(prev => ({...prev, banks: prev.banks.map(x => x.id === b.id ? b : x)})), deleteBank: (id) => setState(prev => ({...prev, banks: prev.banks.filter(b => b.id !== id)})),
      addCard: (c) => setState(prev => ({...prev, cards: [...prev.cards, c]})), updateCard: (c) => setState(prev => ({...prev, cards: prev.cards.map(x => x.id === c.id ? c : x)})), deleteCard: (id) => setState(prev => ({...prev, cards: prev.cards.filter(c => c.id !== id)})),
      addWallet: (w) => setState(prev => ({...prev, wallets: [...prev.wallets, w]})), updateWallet: (w) => setState(prev => ({...prev, wallets: prev.wallets.map(x => x.id === w.id ? w : x)})), deleteWallet: (id) => setState(prev => ({...prev, wallets: prev.wallets.filter(w => w.id !== id)})),
      addIncome: () => {}, addExpense: () => {}, addAsset: (a) => setState(prev => ({...prev, assets: [...prev.assets, a]})), updateAsset: (a) => setState(prev => ({...prev, assets: prev.assets.map(x => x.id === a.id ? a : x)})), deleteAsset: (id) => setState(prev => ({...prev, assets: prev.assets.filter(a => a.id !== id)})),
      addLiability: (l) => setState(prev => ({...prev, liabilities: [...prev.liabilities, l]})), updateLiability: (l) => setState(prev => ({...prev, liabilities: prev.liabilities.map(x => x.id === l.id ? l : x)})), deleteLiability: (id) => setState(prev => ({...prev, liabilities: prev.liabilities.filter(l => l.id !== id)})),
      addTransaction, addTransactions, updateTransaction, deleteTransaction,
      addBudget: (b) => {
        setState(prev => ({ ...prev, budgets: [...prev.budgets, b] }));
        addTransactionNature(b.category);
      }, 
      updateBudget: (b) => setState(prev => ({...prev, budgets: prev.budgets.map(x => x.id === b.id ? b : x)})), 
      deleteBudget: (id) => setState(prev => ({...prev, budgets: prev.budgets.filter(b => b.id !== id)})),
      addTransactionNature, deleteTransactionNature, 
      addStaff, updateStaff, deleteStaff, logStaffAttendance,
      addTenant, updateTenant, deleteTenant,
      addNotification,
      clearNotifications: () => {}, markNotificationRead: () => {}, 
      simulateSync, resetBoarding, loadStateFromCloud, verifyConnection, importState: () => {}, 
      updateMonitoredApps: (apps: MonitoredApp[]) => setState(prev => ({ ...prev, profile: { ...prev.profile, monitoredApps: apps } })), 
      updateTaxProfile: (p: any) => setState(prev => ({ ...prev, taxProfile: p })),
      simulateIncomingRequest, handleFamilyRequest, uploadToDrive
    }}>
      {children}
    </FinanceContext.Provider>
  );
};
