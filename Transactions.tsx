import { GoogleGenAI } from "@google/genai";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFinance } from '../store/FinanceContext';
import { Transaction, TransactionType, SalaryComponent, AccountClassification } from '../types';
import { formatCurrency } from '../utils/formatters';
import { AccountForm, CLASSIFICATIONS } from './Accounts';
import * as df from 'danfojs';
import * as XLSX from 'xlsx';
import { Edit2, Trash2, Plus, X } from 'lucide-react';

const SearchableNatureSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: string[];
  onCreateNew?: () => void;
}> = ({ value, onChange, options, onCreateNew }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const filteredOptions = useMemo(() => options.filter(opt => opt.toLowerCase().includes(search.toLowerCase())), [options, search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs text-left flex justify-between items-center group">
        <span className={value ? 'text-slate-800' : 'text-slate-300'}>{value || 'Select Nature Head'}</span>
        <span className={`text-[10px] transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {isOpen && (
        <div className="absolute z-[1000] w-full mt-2 bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top">
          <div className="p-3 border-b border-slate-100 bg-slate-50/50">
            <input autoFocus className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-black text-[10px] uppercase tracking-widest placeholder:text-slate-300" placeholder="Search Vault Heads..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
            {onCreateNew && (
              <button type="button" onClick={() => { onCreateNew(); setIsOpen(false); setSearch(''); }} className="w-full p-4 text-left text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-colors hover:bg-slate-50 text-indigo-600 border-b border-slate-100">
                <span className="text-sm">➕</span> Create New Nature
              </button>
            )}
            {filteredOptions.map(opt => (
              <button key={opt} type="button" onClick={() => { onChange(opt); setIsOpen(false); setSearch(''); }} className={`w-full p-4 text-left text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-colors ${value === opt ? 'bg-black text-white' : 'hover:bg-slate-50 text-slate-600'}`}>
                <span className="text-sm">📁</span>{opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SearchableAccountSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: { id: string; name: string; type: string }[];
  onCreateNew?: () => void;
}> = ({ value, onChange, options, onCreateNew }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const filteredOptions = useMemo(() => options.filter(opt => opt.name.toLowerCase().includes(search.toLowerCase())), [options, search]);
  
  const selectedOption = options.find(o => o.id === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs text-left flex justify-between items-center group">
        <span className={value ? 'text-slate-800' : 'text-slate-300'}>{selectedOption ? selectedOption.name : 'Select Account'}</span>
        <span className={`text-[10px] transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {isOpen && (
        <div className="absolute z-[1000] w-full mt-2 bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top">
          <div className="p-3 border-b border-slate-100 bg-slate-50/50">
            <input autoFocus className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-black text-[10px] uppercase tracking-widest placeholder:text-slate-300" placeholder="Search Accounts..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
            {onCreateNew && (
              <button type="button" onClick={() => { onCreateNew(); setIsOpen(false); setSearch(''); }} className="w-full p-4 text-left text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-colors hover:bg-slate-50 text-indigo-600 border-b border-slate-100">
                <span className="text-sm">➕</span> Create New Account
              </button>
            )}
            {filteredOptions.map(opt => (
              <button key={opt.id} type="button" onClick={() => { onChange(opt.id); setIsOpen(false); setSearch(''); }} className={`w-full p-4 text-left text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-colors ${value === opt.id ? 'bg-black text-white' : 'hover:bg-slate-50 text-slate-600'}`}>
                <span className="text-sm">🏦</span>{opt.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Transactions: React.FC<{ initialType?: TransactionType; initialAccountId?: string | null }> = ({ initialType, initialAccountId }) => {
  const { filteredState, state, addTransaction, addTransactions, updateTransaction, deleteTransaction, uploadToDrive, setIsNavHidden, addNotification, addAsset, updateAsset, addLiability, updateLiability, addTransactionNature, addBank, addCard, addWallet, updateProfile } = useFinance();
  const natures = state.transactionNatures || [];
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedQuickType, setSelectedQuickType] = useState<TransactionType>(initialType || 'Expense');
  const [isUploading, setIsUploading] = useState(false);
  const [brokerEngine, setBrokerEngine] = useState<'AI' | 'Excel'>('Excel');
  const [scanResult, setScanResult] = useState<Transaction[] | null>(null);
  const [salaryBreakup, setSalaryBreakup] = useState<{ 
    componentId: string; 
    name: string; 
    amount: number;
    period?: 'Calendar Year' | 'Financial Year' | 'Custom';
    taxDeducted?: boolean;
  }[]>([]);
  const [showComponentSelector, setShowComponentSelector] = useState(false);
  const [filterStart, setFilterStart] = useState<string>('');
  const [filterEnd, setFilterEnd] = useState<string>('');
  const currency = state.profile.currency;

  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [accountTypeToCreate, setAccountTypeToCreate] = useState<'bank' | 'card' | 'wallet' | 'asset' | 'liability'>('bank');
  const [showCreateNatureModal, setShowCreateNatureModal] = useState(false);
  const [newNature, setNewNature] = useState({ name: '', type: 'Expense' as TransactionType, classification: '' as AccountClassification, amount: '' });

  const [isShared, setIsShared] = useState(false);
  const [splitMethod, setSplitMethod] = useState<'Equally' | 'Amount' | 'Percentage' | 'Shares' | 'Adjustment'>('Amount');
  const [mySplitValue, setMySplitValue] = useState<string>('');
  const [sharedContacts, setSharedContacts] = useState<{ name: string; mobile: string; email: string; amount: string; settlementDate: string; splitValue?: string }[]>([]);

  useEffect(() => {
    if (initialType) {
      setSelectedQuickType(initialType);
      if (initialAccountId) {
        setFormData(prev => ({ ...prev, type: initialType, accountId: initialAccountId }));
        setShowModal(true);
      }
    }
  }, [initialType, initialAccountId]);

  const handleAddContact = () => {
    setSharedContacts([...sharedContacts, { name: '', mobile: '', email: '', amount: '', settlementDate: '', splitValue: '' }]);
  };

  const handleRemoveContact = (index: number) => {
    const newContacts = [...sharedContacts];
    newContacts.splice(index, 1);
    setSharedContacts(newContacts);
  };

  const handleUpdateContact = (index: number, field: string, value: string) => {
    const newContacts = [...sharedContacts];
    (newContacts[index] as any)[field] = value;
    setSharedContacts(newContacts);
  };





  const handleCreateNature = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNature.name.trim()) {
      addTransactionNature(newNature.name.trim());
      if (newNature.type === 'Asset' || newNature.type === 'Liability') {
         const amountVal = newNature.amount ? Number(newNature.amount) : 0;
         const classification = newNature.classification || (newNature.type === 'Asset' ? 'Non-Current Asset' : 'Current Liability');
         if (newNature.type === 'Asset') {
            addAsset({ id: `asset_${Date.now()}`, name: newNature.name.trim(), value: amountVal, classification, type: 'Physical' });
         } else {
            addLiability({ id: `liab_${Date.now()}`, name: newNature.name.trim(), amount: amountVal, classification, type: 'Payable' });
         }
      }
      setFormData(prev => ({ ...prev, nature: newNature.name.trim() }));
      setNewNature({ name: '', type: 'Expense', classification: '' as any, amount: '' });
      setShowCreateNatureModal(false);
    }
  };

  useEffect(() => { setIsNavHidden(showModal); return () => setIsNavHidden(false); }, [showModal, setIsNavHidden]);

  // Sync amount with salary breakup
  useEffect(() => {
    if (salaryBreakup.length > 0) {
      const total = salaryBreakup.reduce((sum, item) => sum + item.amount, 0);
      setFormData(prev => ({ ...prev, amount: total.toFixed(2) }));
    }
  }, [salaryBreakup]);

  const handleEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setSalaryBreakup(tx.salaryBreakup || []);
    setFormData({
      type: tx.type,
      amount: tx.amount.toString(),
      nature: tx.nature,
      description: tx.description,
      accountId: tx.accountId,
      relatedAccountId: '', 
      date: tx.date,
      ownerId: tx.ownerId || '',
      estimatedLife: tx.estimatedLife?.toString() || '1',
      followUpDate: '',
      financialYear: tx.financialYear || ''
    });
    if (tx.type === 'Receipt') setSelectedQuickType('Receipt');
    else if (tx.type === 'Payment') setSelectedQuickType('Payment');
    else setSelectedQuickType(tx.type as any);
    
    if (tx.isShared && tx.sharedContacts) {
        setIsShared(true);
        setSharedContacts(tx.sharedContacts.map(c => ({
            name: c.name,
            mobile: c.mobile,
            email: c.email || '',
            amount: c.amount.toString(),
            settlementDate: c.settlementDate || ''
        })));
    } else {
        setIsShared(false);
        setSharedContacts([]);
    }

    setShowModal(true);
  };

  const handleAutoPopulateSalary = () => {
    const structure = state.taxProfile?.salaryStructure || [];
    const applicable = structure.filter(c => c.isApplicable);
    if (applicable.length > 0) {
      const breakup = applicable.map(c => ({
        componentId: c.id,
        name: c.name,
        amount: parseFloat((c.amount / 12).toFixed(2))
      }));
      setSalaryBreakup(breakup);
    }
  };

  const handleNatureChange = (val: string) => {
    setFormData(prev => ({ ...prev, nature: val }));
    
    // Auto-populate salary breakup if nature is Salary and breakup is empty
    if (val === 'Salary' && salaryBreakup.length === 0) {
      handleAutoPopulateSalary();
    }
  };

  const handleUpdateBreakup = (index: number, field: string, val: any) => {
    const newBreakup = [...salaryBreakup];
    (newBreakup[index] as any)[field] = val;
    setSalaryBreakup(newBreakup);
  };

  const handleRemoveComponent = (index: number) => {
    const newBreakup = [...salaryBreakup];
    newBreakup.splice(index, 1);
    setSalaryBreakup(newBreakup);
  };

  const handleAddComponent = (component: SalaryComponent) => {
    setSalaryBreakup(prev => [...prev, {
      componentId: component.id,
      name: component.name,
      amount: 0,
      period: component.id === 'taxes' ? 'Financial Year' : undefined,
      taxDeducted: component.id === 'taxes' ? true : undefined
    }]);
    setShowComponentSelector(false);
  };

  const initialFormState = { 
    type: 'Expense' as TransactionType, 
    amount: '', 
    nature: '', 
    description: '', 
    accountId: '', 
    relatedAccountId: '',
    date: new Date().toISOString().split('T')[0], 
    ownerId: '', 
    estimatedLife: '1',
    followUpDate: '',
    financialYear: ''
  };
  const [formData, setFormData] = useState(initialFormState);
  const isSalary = formData.nature === 'Salary';
  const isTax = (formData.nature || '').toLowerCase().includes('tax');

  // Recalculate amounts when split method or values change
  useEffect(() => {
    if (!isShared) return;
    const total = parseFloat(formData.amount) || 0;
    if (total <= 0) return;

    const newContacts = [...sharedContacts];
    let updated = false;

    if (splitMethod === 'Equally') {
      const count = sharedContacts.length + 1;
      const share = (total / count).toFixed(2);
      newContacts.forEach(c => {
        if (c.amount !== share) {
          c.amount = share;
          updated = true;
        }
      });
    } else if (splitMethod === 'Percentage') {
      newContacts.forEach(c => {
        const pct = parseFloat(c.splitValue || '0');
        const amt = ((total * pct) / 100).toFixed(2);
        if (c.amount !== amt) {
          c.amount = amt;
          updated = true;
        }
      });
    } else if (splitMethod === 'Shares') {
      const myShares = parseFloat(mySplitValue || '1');
      const totalShares = newContacts.reduce((sum, c) => sum + (parseFloat(c.splitValue || '1')), myShares);
      if (totalShares > 0) {
        newContacts.forEach(c => {
          const shares = parseFloat(c.splitValue || '1');
          const amt = ((total * shares) / totalShares).toFixed(2);
          if (c.amount !== amt) {
            c.amount = amt;
            updated = true;
          }
        });
      }
    } else if (splitMethod === 'Adjustment') {
      const myAdj = parseFloat(mySplitValue || '0');
      const totalAdj = newContacts.reduce((sum, c) => sum + (parseFloat(c.splitValue || '0')), myAdj);
      const baseSplit = (total - totalAdj) / (newContacts.length + 1);
      
      newContacts.forEach(c => {
        const adj = parseFloat(c.splitValue || '0');
        const amt = (baseSplit + adj).toFixed(2);
        if (c.amount !== amt) {
          c.amount = amt;
          updated = true;
        }
      });
    }

    if (updated) setSharedContacts(newContacts);
  }, [formData.amount, splitMethod, mySplitValue, JSON.stringify(sharedContacts.map(c => c.splitValue)), isShared]);

  const myShare = useMemo(() => {
    const total = parseFloat(formData.amount) || 0;
    const sharedTotal = sharedContacts.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    return Math.max(0, total - sharedTotal);
  }, [formData.amount, sharedContacts]);

  const allAccounts = useMemo(() => {
    const banks = (state.banks || []).map(b => ({ id: b.id, name: b.name, type: 'bank' as const }));
    const cards = (state.cards || []).map(c => ({ id: c.id, name: c.lenderName, type: 'card' as const }));
    const wallets = (state.wallets || []).map(w => ({ id: w.id, name: w.name, type: 'wallet' as const }));
    const assets = (state.assets || []).map(a => ({ id: a.id, name: a.name, type: 'asset' as const }));
    const liabilities = (state.liabilities || []).map(l => ({ id: l.id, name: l.name, type: 'liability' as const }));
    return [...banks, ...cards, ...wallets, ...assets, ...liabilities];
  }, [state]);

  const transactionList = useMemo(() => {
    const txs = filteredState.transactions || [];
    const seen = new Set();
    return txs.filter(tx => {
      if (seen.has(tx.id)) return false;
      seen.add(tx.id);
      
      if (filterStart && tx.date < filterStart) return false;
      if (filterEnd && tx.date > filterEnd) return false;
      
      return true;
    });
  }, [filteredState.transactions, filterStart, filterEnd]);

  const processExcelWithDanfo = async (file: File) => {
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        
        if (json.length === 0) throw new Error("Empty sheet");

        const df_raw = new df.DataFrame(json);
        const df_clean = df_raw.dropNa({ axis: 1 });

        const columns = df_clean.columns;
        const dateCol = columns.find(c => c.toLowerCase().includes('date')) || columns[0];
        const amountCol = columns.find(c => c.toLowerCase().includes('amount') || c.toLowerCase().includes('value')) || columns[1];
        const descCol = columns.find(c => c.toLowerCase().includes('desc') || c.toLowerCase().includes('particulars') || c.toLowerCase().includes('name')) || columns[2];

        const parsedTxs: Transaction[] = [];
        
        for (let i = 0; i < df_clean.shape[0]; i++) {
          const row = df_clean.iloc({ rows: [i] });
          const dateVal = row[dateCol].values[0];
          const amountVal = Math.abs(Number(row[amountCol].values[0]));
          const descVal = String(row[descCol].values[0]);

          if (!isNaN(amountVal) && amountVal > 0) {
            parsedTxs.push({
              id: `import_${Math.random().toString(36).substr(2, 9)}`,
              type: 'Expense',
              amount: amountVal,
              nature: 'Investment',
              description: descVal,
              accountId: '',
              accountType: 'bank',
              date: new Date(dateVal).toISOString().split('T')[0],
              status: 'active'
            });
          }
        }
        setScanResult(parsedTxs);
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error("Excel Parse Error:", err);
      alert("Failed to parse Excel. Ensure headers like 'Date', 'Amount', 'Description' exist.");
    } finally {
      setIsUploading(false);
    }
  };

  const processDocumentWithAI = async (file: File) => {
    setIsUploading(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-3-flash-preview";
      
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              parts: [
                { text: "Extract transaction data from this document. Return a JSON array of objects with fields: date (YYYY-MM-DD), amount (number), type (Income/Expense), nature (category), description. Focus on broker notes or bank statements." },
                { inlineData: { mimeType: file.type, data: base64Data } }
              ]
            }
          ],
          config: { responseMimeType: "application/json" }
        });

        const results = JSON.parse(response.text || '[]');
        const mapped: Transaction[] = results.map((r: any) => ({
          id: `ai_${Math.random().toString(36).substr(2, 9)}`,
          type: r.type || 'Expense',
          amount: Number(r.amount),
          nature: r.nature || 'General',
          description: r.description || 'AI Extracted',
          accountId: '',
          accountType: 'bank',
          date: r.date || new Date().toISOString().split('T')[0],
          status: 'active'
        }));
        setScanResult(mapped);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("AI Parse Error:", err);
      alert("AI extraction failed. Try Excel mode.");
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const headers = ['Date', 'Description', 'Amount', 'Type', 'Nature'];
    const data = [
      ['2024-01-01', 'Stock Purchase', '1000', 'Expense', 'Investment in Stocks'],
      ['2024-01-05', 'Dividend', '50', 'Income', 'Dividend Income']
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Broker_Import_Template.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (brokerEngine === 'Excel') processExcelWithDanfo(file);
    else processDocumentWithAI(file);
  };

  const handleBatchCommit = () => {
    if (!scanResult) return;
    const targetAccount = formData.accountId;
    if (!targetAccount) return alert("Select a target account for the import.");
    
    const account = allAccounts.find(a => a.id === targetAccount);
    const finalTxs = scanResult.map(tx => ({
      ...tx,
      accountId: targetAccount,
      accountType: account?.type as any
    }));

    addTransactions(finalTxs);
    setScanResult(null);
    setShowModal(false);
  };

  const handleSingleCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    const account = allAccounts.find(a => a.id === formData.accountId);
    if (!account) return alert("Please select an account.");
    
    if ((selectedQuickType === 'Receipt' || selectedQuickType === 'Payment') && !formData.description) return alert("Narration is required.");
    
    if (selectedQuickType === 'Adjustment') {
       if (!formData.relatedAccountId && !formData.nature) return alert("Please select either a secondary account or a nature/category for adjustment.");
    } else if (selectedQuickType !== 'Receipt' && selectedQuickType !== 'Payment' && !formData.nature) {
       return alert("Please select a nature/category.");
    }

    // Update default FY if tax related
    if ((formData.nature || '').toLowerCase().includes('tax') && formData.financialYear) {
      updateProfile({ ...state.profile, defaultFinancialYear: formData.financialYear });
    }

    setIsUploading(true);
    
    const baseTx = {
        id: editingId || Math.random().toString(36).substr(2, 9),
        amount: Number(formData.amount),
        description: formData.description,
        date: formData.date,
        estimatedLife: Number(formData.estimatedLife),
        status: 'active' as const,
        ownerId: formData.ownerId,
        salaryBreakup: salaryBreakup.length > 0 ? salaryBreakup : undefined
    };

    if (isShared && sharedContacts.length > 0) {
        // Shared Transaction Logic
        const totalShared = sharedContacts.reduce((sum, c) => sum + parseFloat(c.amount), 0);
        const myShareAmount = Math.max(0, Number(formData.amount) - totalShared);

        // 1. Record My Share
        if (myShareAmount > 0) {
            const myTx: Transaction = {
                ...baseTx,
                amount: myShareAmount,
                type: formData.type,
                nature: formData.nature,
                accountId: formData.accountId,
                accountType: account.type as any,
                description: `${formData.description} (My Share)`,
                isShared: true,
                sharedContacts: sharedContacts.map(c => ({ ...c, amount: Number(c.amount) }))
            };
            if (editingId) updateTransaction(myTx);
            else addTransaction(myTx);
        } else if (editingId) {
            deleteTransaction(editingId);
        }

        // 2. Process Shared Portions
        sharedContacts.forEach(contact => {
            const contactAmount = parseFloat(contact.amount);
            const isExpense = formData.type === 'Expense' || formData.type === 'Payment';
            const isIncome = formData.type === 'Income' || formData.type === 'Receipt';
            
            // Create Transaction for the flow (Bank -> Friend or Friend -> Bank)
            // If Expense: Money left bank. Type: Asset (Loan Given).
            // If Income: Money entered bank. Type: Liability (Loan Taken).
            
            // Create/Update Asset or Liability Entity
            const settlementDate = new Date(contact.settlementDate || new Date());
            const today = new Date();
            const monthsDiff = (settlementDate.getFullYear() - today.getFullYear()) * 12 + (settlementDate.getMonth() - today.getMonth());
            const classification = monthsDiff > 12 ? (isExpense ? 'Non-Current Asset' : 'Non-Current Liability') : (isExpense ? 'Current Asset' : 'Current Liability');

            let relatedEntityId = '';

            if (isExpense) {
                // Create Receivable
                const existingAsset = state.assets.find(a => a.name === `Receivable - ${contact.name}`);
                if (existingAsset) {
                    relatedEntityId = existingAsset.id;
                    updateAsset({ ...existingAsset, value: existingAsset.value + contactAmount });
                } else {
                     relatedEntityId = `asset_rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                     addAsset({
                        id: relatedEntityId,
                        name: `Receivable - ${contact.name}`,
                        value: contactAmount,
                        type: 'Receivable',
                        classification: classification as any
                     });
                }
            } else if (isIncome) {
                // Create Payable
                const existingLiability = state.liabilities.find(l => l.name === `Payable - ${contact.name}`);
                if (existingLiability) {
                    relatedEntityId = existingLiability.id;
                    updateLiability({ ...existingLiability, amount: existingLiability.amount + contactAmount });
                } else {
                     relatedEntityId = `liab_pay_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                     addLiability({
                        id: relatedEntityId,
                        name: `Payable - ${contact.name}`,
                        amount: contactAmount,
                        type: 'Payable',
                        classification: classification as any
                     });
                }
            }

            const splitTx: Transaction = {
                ...baseTx,
                id: `${baseTx.id}_split_${Math.random().toString(36).substr(2, 5)}`,
                amount: contactAmount,
                type: isExpense ? 'Asset' : 'Liability', // Using Asset/Liability to denote flow type
                nature: isExpense ? 'Shared Expense (Receivable)' : 'Shared Income (Payable)',
                accountId: formData.accountId,
                accountType: account.type as any,
                description: `${formData.description} (Split with ${contact.name})`,
                isShared: true,
                relatedAssetLiabilityId: relatedEntityId
            };
            console.log(`[AddTransaction] Adding split tx ${splitTx.id} with relatedEntityId: ${relatedEntityId}`);
            addTransaction(splitTx);
            
            // Notification
            if (contact.mobile || contact.email) {
                addNotification({
                    id: `split_${Date.now()}_${Math.random()}`,
                    title: 'Shared Transaction',
                    message: `Recorded ${isExpense ? 'receivable' : 'payable'} of ${formatCurrency(contactAmount, currency)} from ${contact.name} (${contact.email || contact.mobile}).`,
                    timestamp: new Date().toISOString(),
                    type: 'system',
                    isRead: false
                });
            }
        });

    } else if (selectedQuickType === 'Receipt') {
        // Tx1: Receipt on Bank (Received In) -> Increases Balance
        const tx1: Transaction = {
            ...baseTx,
            type: 'Receipt',
            nature: 'Receipt',
            accountId: formData.accountId,
            accountType: account.type as any,
        };
        if (editingId) updateTransaction(tx1);
        else addTransaction(tx1);

        // Tx2: Payment on Source (Received From) -> Decreases Balance (e.g. Receivable)
        if (formData.relatedAccountId) {
            const relatedAccount = allAccounts.find(a => a.id === formData.relatedAccountId);
            if (relatedAccount) {
                const tx2: Transaction = {
                    ...baseTx,
                    id: `${baseTx.id}_rel`,
                    type: 'Payment',
                    nature: 'Receipt Source',
                    accountId: formData.relatedAccountId,
                    accountType: relatedAccount.type as any,
                    description: `Source for: ${formData.description}`
                };
                const existingTx2 = state.transactions.find(t => t.id === tx2.id);
                if (existingTx2) updateTransaction(tx2);
                else addTransaction(tx2);
            }
        }
    } else if (selectedQuickType === 'Adjustment') {
        const account = allAccounts.find(a => a.id === formData.accountId);
        if (!account) return alert("Select primary account");
        
        if (formData.relatedAccountId) {
             // Inter-Party Settlement / Transfer
             const secondary = allAccounts.find(a => a.id === formData.relatedAccountId);
             if (secondary) {
                  const txFrom: Transaction = {
                      ...baseTx,
                      type: 'Payment',
                      nature: 'Adjustment Out',
                      accountId: formData.relatedAccountId,
                      accountType: secondary.type as any,
                      description: `Adjustment with ${account.name}`
                  };
                  addTransaction(txFrom);
                  
                  const txTo: Transaction = {
                      ...baseTx,
                      type: 'Receipt',
                      nature: 'Adjustment In',
                      accountId: formData.accountId,
                      accountType: account.type as any,
                      description: `Adjustment from ${secondary.name}`
                  };
                  addTransaction(txTo);
             }
        } else if (formData.nature) {
             // P&L Adjustment (Write-off)
             const realType = (account.type === 'asset' || account.type === 'bank' || account.type === 'wallet') ? 'Expense' : 'Income';
             const tx: Transaction = {
                 ...baseTx,
                 type: realType,
                 nature: formData.nature,
                 accountId: formData.accountId,
                 accountType: account.type as any,
                 description: `Write-off/Adjustment: ${formData.description}`
             };
             addTransaction(tx);
        }
    } else if (selectedQuickType === 'Payment') {
        // Tx1: Payment on Bank (Paid From) -> Decreases Balance
        const tx1: Transaction = {
            ...baseTx,
            type: 'Payment',
            nature: 'Payment',
            accountId: formData.accountId,
            accountType: account.type as any,
        };
        if (editingId) updateTransaction(tx1);
        else addTransaction(tx1);

        // Tx2: Receipt on Destination (Paid To) -> Increases Balance (e.g. Reduces Liability)
        if (formData.relatedAccountId) {
            const relatedAccount = allAccounts.find(a => a.id === formData.relatedAccountId);
            if (relatedAccount) {
                const tx2: Transaction = {
                    ...baseTx,
                    id: `${baseTx.id}_rel`,
                    type: 'Receipt',
                    nature: 'Payment Destination',
                    accountId: formData.relatedAccountId,
                    accountType: relatedAccount.type as any,
                    description: `Destination for: ${formData.description}`
                };
                const existingTx2 = state.transactions.find(t => t.id === tx2.id);
                if (existingTx2) updateTransaction(tx2);
                else addTransaction(tx2);
            }
        }
    } else {
        let finalAmount = Number(formData.amount);
        const taxComponent = salaryBreakup.find(sb => sb.componentId === 'taxes');
        const shouldDeduct = formData.nature === 'Salary' && taxComponent && taxComponent.taxDeducted !== false;
        const taxAmount = (shouldDeduct && taxComponent) ? taxComponent.amount : 0;

        if (shouldDeduct && taxAmount > 0) {
            finalAmount -= taxAmount;
            
            // Record Tax Receivable
            const assetName = `Receivable - Income Tax (${taxComponent.period || 'FY'})`;
            const existingAsset = state.assets.find(a => a.name === assetName);
            let assetId = existingAsset?.id;
            
            if (existingAsset) {
                updateAsset({ ...existingAsset, value: existingAsset.value + taxAmount });
            } else {
                assetId = `asset_tax_${Date.now()}`;
                addAsset({
                    id: assetId,
                    name: assetName,
                    value: taxAmount,
                    type: 'Receivable',
                    classification: 'Current Asset'
                });
            }

            const taxTx: Transaction = {
                ...baseTx,
                id: `${baseTx.id}_tax`,
                amount: taxAmount,
                type: 'Asset',
                nature: 'Tax Receivable',
                description: `Tax deducted from salary (${taxComponent.period})`,
                accountId: assetId!,
                accountType: 'asset'
            };
            addTransaction(taxTx);
        }

        const transactionData: Transaction = {
          ...baseTx,
          amount: finalAmount,
          type: formData.type,
          nature: formData.nature,
          accountId: formData.accountId,
          accountType: account.type as any,
        };
        if (editingId) updateTransaction(transactionData); else addTransaction(transactionData);
    }

    if (formData.followUpDate) {
      addNotification({
        id: `rem_${Date.now()}`,
        title: 'Follow-up Reminder',
        message: `Reminder for ${formData.description}: Follow up due on ${formData.followUpDate}`,
        timestamp: new Date().toISOString(),
        type: 'reminder',
        isRead: false
      });
    }

    setIsUploading(false); 
    setShowModal(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col gap-6">
             <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-center sm:text-left">
                   <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Record Transaction</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Manual Asset/Liability Capture</p>
                </div>
                <div className="p-1.5 bg-slate-50 border border-slate-100 rounded-xl flex flex-col gap-1 w-full sm:w-auto">
                   {['Expense', 'Income', 'Asset', 'Liability', 'Receipt', 'Payment', 'Adjustment'].map((type) => (
                      <button key={type} onClick={() => setSelectedQuickType(type as any)} className={`px-4 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all text-left ${selectedQuickType === type ? 'bg-black text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100'}`}>
                        {type}
                      </button>
                   ))}
                </div>
             </div>
             <button onClick={() => { setFormData({...initialFormState, type: selectedQuickType as TransactionType}); setEditingId(null); setSalaryBreakup([]); setShowModal(true); setScanResult(null); }} className="w-full py-4 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-transform">
                ➕ New {selectedQuickType} Record
             </button>
        </div>

        <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-slate-800 shadow-2xl flex flex-col gap-6">
            <div className="flex justify-between items-center">
               <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Broker Import</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">AI & Excel Data Extraction</p>
               </div>
               <div className="flex bg-slate-800 p-1 rounded-xl items-center">
                  {['Excel', 'AI'].map(mode => (
                    <button key={mode} onClick={() => setBrokerEngine(mode as any)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${brokerEngine === mode ? 'bg-black text-white' : 'text-slate-500'}`}>
                      {mode}
                    </button>
                  ))}
                  {brokerEngine === 'Excel' && (
                    <button onClick={downloadTemplate} className="ml-2 px-2 text-[9px] font-black uppercase text-indigo-400 hover:text-indigo-300 underline">
                      Template
                    </button>
                  )}
               </div>
            </div>
            <label className="relative group cursor-pointer">
               <input type="file" className="hidden" onChange={handleFileUpload} accept={brokerEngine === 'Excel' ? ".xlsx,.xls,.csv" : "image/*,application/pdf"} />
               <div className="w-full py-4 bg-slate-800 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors">
                  <span className="text-2xl">{brokerEngine === 'Excel' ? '📊' : '🤖'}</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {isUploading ? 'Processing...' : `Upload ${brokerEngine} File`}
                  </span>
               </div>
            </label>
        </div>
      </div>

      {scanResult && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-[2.5rem] p-6 animate-in slide-in-from-top-4 duration-500">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="text-sm font-black text-indigo-900 uppercase tracking-tight">Import Preview</h4>
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{scanResult.length} Transactions Detected</p>
            </div>
            <button onClick={() => setScanResult(null)} className="text-indigo-300 hover:text-indigo-600 font-black">✕</button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-2 mb-6 custom-scrollbar">
            {scanResult.map((tx, idx) => (
              <div key={idx} className="bg-white p-3 rounded-xl border border-indigo-100 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase">{tx.date}</span>
                  <span className="text-[10px] font-black text-slate-800 uppercase truncate max-w-[200px]">{tx.description}</span>
                </div>
                <span className="text-xs font-black text-slate-900">{formatCurrency(tx.amount, currency)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">Target Account for Import</label>
            <SearchableAccountSelect value={formData.accountId} onChange={(val) => setFormData({ ...formData, accountId: val })} options={allAccounts} />
            <button onClick={handleBatchCommit} className="w-full py-4 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">
              Confirm & Post {scanResult.length} Transactions
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Transactions</h3>
        <div className="flex items-center gap-2">
           <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 outline-none" />
           <span className="text-slate-300 font-black">-</span>
           <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 outline-none" />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-50">
        {transactionList.length === 0 ? (
          <div className="p-20 text-center">
            <span className="text-4xl block mb-4">📭</span>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Transactions Found</p>
          </div>
        ) : (
          transactionList.map(t => (
            <div key={t.id} className="p-4 hover:bg-slate-50/50 transition-colors flex justify-between items-center group">
              <div className="flex items-center gap-4 truncate flex-1">
                 <span className="text-[10px] font-black text-slate-400 w-20 shrink-0">{t.date.split('-').reverse().join('-')}</span>
                 <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full shrink-0 ${['Income', 'Receipt'].includes(t.type) ? 'bg-emerald-500' : ['Expense', 'Payment'].includes(t.type) ? 'bg-rose-500' : 'bg-slate-500'}`}></div>
                       <span className="text-sm font-black text-slate-800 truncate leading-tight">{t.description}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest leading-none">{t.nature}</span>
                       <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest leading-none">•</span>
                       <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none truncate">
                         {allAccounts.find(a => a.id === t.accountId)?.name || 'Unknown Account'}
                       </span>
                    </div>
                 </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className={`text-[13px] font-black tracking-tighter mr-4 ${['Income', 'Receipt'].includes(t.type) ? 'text-emerald-600' : ['Expense', 'Payment'].includes(t.type) ? 'text-rose-600' : 'text-slate-900'}`}>
                  {['Income', 'Receipt'].includes(t.type) ? '+' : '-'}{formatCurrency(t.amount, currency)}
                </span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); handleEdit(t); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteTransaction(t.id); }} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center bg-slate-900/60 backdrop-blur-xl p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white w-full max-w-xl rounded-[3rem] p-8 md:p-12 border border-slate-200 shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingId ? 'Edit' : 'Record'} {selectedQuickType}</h3>
               <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-slate-800 text-2xl font-black">✕</button>
            </div>
            <form onSubmit={handleSingleCommit} className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                    <input required type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                  </div>
                  {selectedQuickType !== 'Receipt' && selectedQuickType !== 'Payment' && (
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                      <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}>
                        <option value="Expense">Expense</option><option value="Income">Income</option><option value="Asset">Asset</option><option value="Liability">Liability</option>
                      </select>
                    </div>
                  )}
               </div>
               
               <div className="space-y-2">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Amount ({currency})</label>
                 <input 
                    required 
                    type="number" 
                    step="any" 
                    className={`w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-2xl ${salaryBreakup.length > 0 ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                    value={formData.amount} 
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    readOnly={salaryBreakup.length > 0}
                 />
               </div>

               {(formData.type === 'Expense' || formData.type === 'Income') && selectedQuickType !== 'Receipt' && selectedQuickType !== 'Payment' && (
                 <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-center">
                       <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={isShared} onChange={e => setIsShared(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-black focus:ring-black" />
                          <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Split this transaction</span>
                       </label>
                       {isShared && (
                          <button type="button" onClick={handleAddContact} className="text-[9px] font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors">
                            + Add Contact
                          </button>
                       )}
                    </div>

                    {isShared && (
                      <div className="space-y-3 animate-in slide-in-from-top-2">
                         <div className="grid grid-cols-2 gap-2">
                           <div className="space-y-1">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 min-h-[24px] flex items-end">Split Method</label>
                             <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-[10px] uppercase" value={splitMethod} onChange={e => setSplitMethod(e.target.value as any)}>
                               <option value="Amount">Actual Amount</option>
                               <option value="Equally">Split Equally</option>
                               <option value="Percentage">Percentage %</option>
                               <option value="Shares">Parts / Shares</option>
                               <option value="Adjustment">Adjustment (+/-)</option>
                             </select>
                           </div>
                           <div className="space-y-1">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 min-h-[24px] flex items-end">Participants (Inc. You)</label>
                             <input 
                               type="number" 
                               min="1" 
                               className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-[10px]" 
                               value={sharedContacts.length + 1} 
                               onChange={e => {
                                 const val = parseInt(e.target.value) || 1;
                                 if (val > sharedContacts.length + 1) {
                                   const toAdd = val - (sharedContacts.length + 1);
                                   const newContacts = [...sharedContacts];
                                   for(let i=0; i<toAdd; i++) newContacts.push({ name: '', mobile: '', email: '', amount: '', settlementDate: '', splitValue: '' });
                                   setSharedContacts(newContacts);
                                 } else if (val < sharedContacts.length + 1 && val >= 1) {
                                   const toRemove = (sharedContacts.length + 1) - val;
                                   const newContacts = [...sharedContacts];
                                   newContacts.splice(-toRemove);
                                   setSharedContacts(newContacts);
                                 }
                               }} 
                             />
                           </div>
                         </div>

                         {/* My Share Input for specific methods */}
                         {(splitMethod === 'Percentage' || splitMethod === 'Shares' || splitMethod === 'Adjustment') && (
                           <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex justify-between items-center">
                              <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">My Input ({splitMethod})</span>
                              <input 
                                type="number" 
                                placeholder={splitMethod === 'Percentage' ? '%' : splitMethod === 'Shares' ? 'Shares' : '+/-'}
                                className="w-24 p-2 bg-white rounded-lg text-xs font-bold outline-none text-right" 
                                value={mySplitValue} 
                                onChange={e => setMySplitValue(e.target.value)} 
                              />
                           </div>
                         )}

                         {sharedContacts.map((contact, idx) => (
                           <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-white rounded-xl border border-slate-100 shadow-sm relative group">
                              <input placeholder="Name" className="p-2 bg-slate-50 rounded-lg text-xs font-bold outline-none" value={contact.name} onChange={e => handleUpdateContact(idx, 'name', e.target.value)} />
                              <input placeholder="Mobile" className="p-2 bg-slate-50 rounded-lg text-xs font-bold outline-none" value={contact.mobile} onChange={e => handleUpdateContact(idx, 'mobile', e.target.value)} />
                              
                              {splitMethod === 'Amount' ? (
                                <input type="number" placeholder="Amount" className="p-2 bg-slate-50 rounded-lg text-xs font-bold outline-none" value={contact.amount} onChange={e => handleUpdateContact(idx, 'amount', e.target.value)} />
                              ) : (
                                <div className="grid grid-cols-2 gap-1">
                                  <input 
                                    type="number" 
                                    placeholder={splitMethod === 'Percentage' ? '%' : splitMethod === 'Shares' ? 'Shares' : splitMethod === 'Adjustment' ? '+/-' : 'Amt'} 
                                    className="p-2 bg-slate-50 rounded-lg text-xs font-bold outline-none" 
                                    value={contact.splitValue} 
                                    onChange={e => handleUpdateContact(idx, 'splitValue', e.target.value)} 
                                    readOnly={splitMethod === 'Equally'}
                                  />
                                  <div className="p-2 bg-slate-100 rounded-lg text-xs font-bold text-slate-500 flex items-center justify-end">
                                    {formatCurrency(parseFloat(contact.amount) || 0, currency)}
                                  </div>
                                </div>
                              )}

                              <div className="relative">
                                <label className="absolute -top-1.5 left-2 bg-white px-1 text-[8px] font-bold text-slate-400 uppercase">Settlement Date</label>
                                <input type="date" className="w-full p-2 bg-slate-50 rounded-lg text-xs font-bold outline-none" value={contact.settlementDate} onChange={e => handleUpdateContact(idx, 'settlementDate', e.target.value)} />
                              </div>
                              <button type="button" onClick={() => handleRemoveContact(idx)} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                           </div>
                         ))}
                         <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">My Share (Calc)</span>
                            <span className="text-xs font-black text-slate-800 font-mono">{formatCurrency(myShare, currency)}</span>
                         </div>
                      </div>
                    )}
                 </div>
               )}
               
               {selectedQuickType === 'Receipt' || selectedQuickType === 'Payment' || selectedQuickType === 'Adjustment' ? (
                 <>
                   <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Narration</label>
                     <input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder={`Enter ${selectedQuickType.toLowerCase()} details...`} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        {selectedQuickType === 'Adjustment' ? 'Primary Account (Source)' : 
                         (selectedQuickType === 'Receipt' ? 'Account (Received In)' : 'Account (Paid From)')}
                     </label>
                     <SearchableAccountSelect value={formData.accountId} onChange={(val) => setFormData({ ...formData, accountId: val })} options={allAccounts} onCreateNew={() => setShowCreateAccountModal(true)} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        {selectedQuickType === 'Adjustment' ? 'Secondary Account (Optional)' : 
                         (selectedQuickType === 'Receipt' ? 'Received From (Optional)' : 'Paid To (Optional)')}
                     </label>
                     <SearchableAccountSelect value={formData.relatedAccountId} onChange={(val) => setFormData({ ...formData, relatedAccountId: val })} options={allAccounts} onCreateNew={() => setShowCreateAccountModal(true)} />
                   </div>

                   {selectedQuickType === 'Adjustment' && !formData.relatedAccountId && (
                      <div className="space-y-2 animate-in fade-in">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nature (if no secondary account)</label>
                        <SearchableNatureSelect value={formData.nature} onChange={handleNatureChange} options={natures} onCreateNew={() => setShowCreateNatureModal(true)} />
                      </div>
                   )}

                   <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Next Follow Up (Optional)</label>
                     <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs" value={formData.followUpDate} onChange={e => setFormData({ ...formData, followUpDate: e.target.value })} />
                   </div>
                 </>
               ) : (
                 <>
                   <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nature / Category</label>
                     <SearchableNatureSelect value={formData.nature} onChange={handleNatureChange} options={Array.from(new Set([...natures, 'Salary']))} onCreateNew={() => setShowCreateNatureModal(true)} />
                   </div>

                   {formData.nature === 'Salary' && (
                     <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-in slide-in-from-top-2">
                        <div className="flex justify-between items-center mb-2">
                           <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Salary Breakup</h4>
                           <div className="relative">
                             <button type="button" onClick={() => setShowComponentSelector(!showComponentSelector)} className="flex items-center gap-1 text-[9px] font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors">
                               <Plus size={10} /> Add Component
                             </button>
                             {showComponentSelector && (
                               <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto custom-scrollbar p-1">
                                 {(() => {
                                   const structure = [...(state.taxProfile?.salaryStructure || [])];
                                   if (!structure.find(c => c.id === 'other')) {
                                     structure.push({ id: 'other', name: 'Other Allowances', type: 'Allowance', amount: 0, isApplicable: true, exemptionLimit: '' });
                                   }
                                   if (!structure.find(c => c.id === 'taxes')) {
                                     structure.push({ id: 'taxes', name: 'Taxes', type: 'Deduction', amount: 0, isApplicable: true, exemptionLimit: '' });
                                   }
                                   
                                   const available = structure.filter(c => !salaryBreakup.find(sb => sb.componentId === c.id));
                                   
                                   if (available.length === 0) return <p className="text-[9px] text-slate-400 text-center py-2">No more components</p>;
                                   
                                   return available.map(c => (
                                     <button key={c.id} type="button" onClick={() => handleAddComponent(c)} className="w-full text-left px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 rounded-lg truncate">
                                       {c.name}
                                     </button>
                                   ));
                                 })()}
                               </div>
                             )}
                           </div>
                        </div>
                        
                        {salaryBreakup.length === 0 ? (
                          <div className="text-center py-4 border-2 border-dashed border-slate-200 rounded-xl">
                            <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">No components added</p>
                            <button type="button" onClick={handleAutoPopulateSalary} className="text-[9px] font-black text-indigo-500 uppercase underline">
                              Auto-populate from Profile
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {salaryBreakup.map((item, idx) => (
                               <div key={idx} className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2 group">
                                  {item.componentId === 'other' ? (
                                    <input 
                                      type="text"
                                      placeholder="Allowance Name"
                                      value={item.name}
                                      onChange={e => {
                                        const newBreakup = [...salaryBreakup];
                                        newBreakup[idx].name = e.target.value;
                                        setSalaryBreakup(newBreakup);
                                      }}
                                      className="text-[10px] font-bold text-slate-500 flex-1 bg-white border border-slate-200 rounded p-1 outline-none"
                                    />
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-500 flex-1 truncate" title={item.name}>{item.name}</span>
                                  )}
                                  <input
                                     type="number"
                                     value={item.amount}
                                     onChange={e => handleUpdateBreakup(idx, 'amount', parseFloat(e.target.value) || 0)}
                                     className="w-24 p-2 bg-white border border-slate-200 rounded-lg text-right text-xs font-mono focus:border-indigo-500 outline-none transition-colors"
                                     placeholder="0.00"
                                  />
                                  <button type="button" onClick={() => handleRemoveComponent(idx)} className="text-slate-300 hover:text-rose-500 transition-colors p-1">
                                    <X size={12} />
                                  </button>
                               </div>
                               
                               {item.componentId === 'taxes' && (
                                 <div className="flex flex-col gap-2 pl-2 border-l-2 border-indigo-100 mt-2 animate-in slide-in-from-left-2">
                                    <div className="flex items-center justify-between">
                                       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tax Period</label>
                                       <select 
                                         value={item.period} 
                                         onChange={e => handleUpdateBreakup(idx, 'period', e.target.value)}
                                         className="text-[9px] font-black uppercase bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none"
                                       >
                                         <option value="Calendar Year">Calendar Year</option>
                                         <option value="Financial Year">Financial Year</option>
                                         <option value="Custom">Custom Period</option>
                                       </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <input 
                                         type="checkbox" 
                                         id={`tax-deduct-${idx}`}
                                         checked={!item.taxDeducted} 
                                         onChange={e => handleUpdateBreakup(idx, 'taxDeducted', !e.target.checked)}
                                         className="w-3 h-3 rounded border-slate-300 text-indigo-600 focus:ring-0"
                                       />
                                       <label htmlFor={`tax-deduct-${idx}`} className="text-[9px] font-bold text-slate-500 uppercase cursor-pointer">Do not deduct tax from salary income</label>
                                    </div>
                                 </div>
                               )}
                               </div>
                            ))}
                            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                              <span className="text-xs font-black text-slate-800 font-mono">{formatCurrency(salaryBreakup.reduce((sum, item) => sum + item.amount, 0), currency)}</span>
                            </div>
                          </div>
                        )}

                        {isTax && (
                          <div className="space-y-2 pt-4 border-t border-slate-100">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Financial Year</label>
                             <select 
                               className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-black text-sm outline-none"
                               value={formData.financialYear || state.profile.defaultFinancialYear || '2024-25'}
                               onChange={e => setFormData({ ...formData, financialYear: e.target.value })}
                             >
                               <option value="2023-24">2023-24</option>
                               <option value="2024-25">2024-25</option>
                               <option value="2025-26">2025-26</option>
                             </select>
                          </div>
                        )}
                     </div>
                   )}

                   <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                     <input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Account</label>
                     <SearchableAccountSelect value={formData.accountId} onChange={(val) => setFormData({ ...formData, accountId: val })} options={allAccounts} onCreateNew={() => setShowCreateAccountModal(true)} />
                   </div>
                 </>
               )}

               {(formData.type === 'Expense' || formData.type === 'Asset' || formData.type === 'Income') && selectedQuickType !== 'Receipt' && selectedQuickType !== 'Payment' && (
                 <div className="space-y-2 p-6 bg-indigo-50 border border-indigo-100 rounded-3xl">
                    <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block mb-2">Estimated Life (Months)</label>
                    <input required type="number" min="1" className="w-full p-4 bg-white border border-indigo-200 rounded-xl font-black text-xl text-indigo-600" value={formData.estimatedLife} onChange={e => setFormData({ ...formData, estimatedLife: e.target.value })} />
                    <p className="text-[8px] font-bold text-indigo-400 uppercase mt-2">Impact will be spread across {formData.estimatedLife} months in P&L audits.</p>
                 </div>
               )}

               <button disabled={isUploading} type="submit" className="w-full py-5 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl disabled:opacity-50">
                  {isUploading ? 'Syncing...' : editingId ? 'Update Transaction' : 'Record Transaction'}
               </button>
            </form>
          </div>
        </div>
      )}
      {showCreateAccountModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setShowCreateAccountModal(false)}>
          <div className="bg-white w-full max-w-2xl rounded-[3rem] border border-slate-200 shadow-2xl animate-in zoom-in duration-200 flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
             <div className="p-8 border-b border-slate-100 flex justify-between items-center">
               <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Create New Account</h3>
               <button onClick={() => setShowCreateAccountModal(false)} className="text-slate-300 hover:text-slate-800 text-2xl font-black">✕</button>
             </div>
             <div className="p-8 border-b border-slate-50 flex gap-3 overflow-x-auto no-scrollbar bg-slate-50/50">
                {(['bank', 'card', 'wallet', 'asset', 'liability'] as const).map(t => (
                  <button 
                    key={t}
                    onClick={() => setAccountTypeToCreate(t)}
                    className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${accountTypeToCreate === t ? 'bg-black text-white border-black shadow-lg scale-105' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
                  >
                    {t}
                  </button>
                ))}
             </div>
             <div className="p-8 overflow-y-auto custom-scrollbar">
                <AccountForm type={accountTypeToCreate} onCancel={() => setShowCreateAccountModal(false)} onSuccess={() => setShowCreateAccountModal(false)} />
             </div>
          </div>
        </div>
      )}

      {showCreateNatureModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setShowCreateNatureModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-[3rem] border border-slate-200 shadow-2xl animate-in zoom-in duration-200 flex flex-col" onClick={e => e.stopPropagation()}>
             <div className="p-8 border-b border-slate-100 flex justify-between items-center">
               <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Create New Nature</h3>
               <button onClick={() => setShowCreateNatureModal(false)} className="text-slate-300 hover:text-slate-800 text-2xl font-black">✕</button>
             </div>
             <form onSubmit={handleCreateNature} className="p-8 space-y-6">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Nature Name</label>
                    <input autoFocus required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" placeholder="e.g. Freelance Income" value={newNature.name} onChange={e => setNewNature({...newNature, name: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Income', 'Expense', 'Asset', 'Liability'] as TransactionType[]).map(t => (
                        <button key={t} type="button" onClick={() => setNewNature({...newNature, type: t})} className={`py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${newNature.type === t ? 'bg-black text-white border-black' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>{t}</button>
                      ))}
                    </div>
                 </div>
                 {(newNature.type === 'Asset' || newNature.type === 'Liability') && (
                     <div className="space-y-2 animate-in slide-in-from-top-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Classification</label>
                        <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none" value={newNature.classification} onChange={e => setNewNature({...newNature, classification: e.target.value as any})}>
                            <option value="">Select Classification</option>
                            {CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                     </div>
                 )}
                 <button type="submit" className="w-full py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Create Nature</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
