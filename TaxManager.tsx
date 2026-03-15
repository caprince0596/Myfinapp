import React, { useState, useMemo } from 'react';
import { useFinance } from '../store/FinanceContext';
import { formatCurrency } from '../utils/formatters';
import { Employer, SalaryComponent, TaxProfile } from '../types';
import { Info } from 'lucide-react';

const INITIAL_SALARY_COMPONENTS: SalaryComponent[] = [
  { id: 'basic', name: 'Basic Salary', type: 'Allowance', amount: 0, isApplicable: true, exemptionLimit: 'Fully Taxable' },
  { id: 'hra', name: 'House Rent Allowance', type: 'Allowance', amount: 0, isApplicable: false, exemptionLimit: 'Exempt up to min of: 1) Actual HRA, 2) 50% of Basic (Metros) or 40% (Non-Metros), 3) Rent paid minus 10% of Basic' },
  { id: 'lta', name: 'Leave Travel Allowance', type: 'Allowance', amount: 0, isApplicable: false, exemptionLimit: 'Exempt for 2 journeys in a block of 4 years (Current Block: 2022-25) subject to actual travel expenses within India' },
  { id: 'cea', name: 'Children Education Allowance', type: 'Allowance', amount: 0, isApplicable: false, exemptionLimit: '₹100 per month per child up to max 2 children' },
  { id: 'hostel', name: 'Hostel Allowance', type: 'Allowance', amount: 0, isApplicable: false, exemptionLimit: '₹300 per month per child up to max 2 children' },
  { id: 'transport', name: 'Transport Allowance', type: 'Allowance', amount: 0, isApplicable: false, exemptionLimit: 'Exempt only for differently-abled employees up to ₹3,200/month' },
  { id: 'uniform', name: 'Uniform Allowance', type: 'Allowance', amount: 0, isApplicable: false, exemptionLimit: 'Exempt to the extent of actual expenditure incurred for official purposes' },
  { id: 'research', name: 'Research Allowance', type: 'Allowance', amount: 0, isApplicable: false, exemptionLimit: 'Exempt to the extent of actual expenditure incurred for official purposes' },
  { id: 'conveyance', name: 'Travel/Conveyance Allowance', type: 'Allowance', amount: 0, isApplicable: false, exemptionLimit: 'Exempt to the extent of actual expenditure incurred for official purposes' },
  { id: 'helper', name: 'Helper Allowance', type: 'Allowance', amount: 0, isApplicable: false, exemptionLimit: 'Exempt to the extent of actual expenditure incurred for official purposes' },
  { id: 'academic', name: 'Academic Allowance', type: 'Allowance', amount: 0, isApplicable: false, exemptionLimit: 'Exempt to the extent of actual expenditure incurred for official purposes' },
  { id: 'perq_rent', name: 'Rent-free Accommodation', type: 'Perquisite', amount: 0, isApplicable: false, exemptionLimit: 'Taxable value depends on city population and salary' },
  { id: 'perq_car', name: 'Car Facility', type: 'Perquisite', amount: 0, isApplicable: false, exemptionLimit: 'Taxable value depends on engine capacity and usage (official/personal)' },
  { id: 'perq_med', name: 'Medical Facilities', type: 'Perquisite', amount: 0, isApplicable: false, exemptionLimit: 'Fully Taxable unless in Govt/Approved hospitals' },
  { id: 'perq_meal', name: 'Meal Coupons/Vouchers', type: 'Perquisite', amount: 0, isApplicable: false, exemptionLimit: 'Exempt up to ₹50 per meal' },
  { id: 'perq_laptop', name: 'Laptop/Computer', type: 'Perquisite', amount: 0, isApplicable: false, exemptionLimit: 'Fully Exempt if used for official purposes' },
  { id: 'perq_loan', name: 'Interest-free Loans', type: 'Perquisite', amount: 0, isApplicable: false, exemptionLimit: 'Taxable as interest savings (SBI Rate) if loan > ₹20,000' },
  { id: 'ret_gratuity', name: 'Gratuity', type: 'Retirement', amount: 0, isApplicable: false, exemptionLimit: 'Govt: Fully Exempt. Others: Min of (20L, Actual, 15 days salary/year)' },
  { id: 'ret_leave', name: 'Leave Encashment', type: 'Retirement', amount: 0, isApplicable: false, exemptionLimit: 'Govt: Fully Exempt. Others: Max ₹25L (New Limit)' },
  { id: 'ret_pension_un', name: 'Pension (Uncommuted)', type: 'Retirement', amount: 0, isApplicable: false, exemptionLimit: 'Fully Taxable as Salary' },
  { id: 'ret_pension_com', name: 'Pension (Commuted)', type: 'Retirement', amount: 0, isApplicable: false, exemptionLimit: 'Govt: Fully Exempt. Others: 1/3 (if Gratuity) or 1/2 (if no Gratuity) exempt' },
  { id: 'ret_vrs', name: 'Voluntary Retirement Comp.', type: 'Retirement', amount: 0, isApplicable: false, exemptionLimit: 'Exempt up to ₹5L' },
  { id: 'ret_retrench', name: 'Retrenchment Compensation', type: 'Retirement', amount: 0, isApplicable: false, exemptionLimit: 'Exempt up to ₹5L' },
  { id: 'cont_pf', name: 'Provident Fund (Employer)', type: 'Contribution', amount: 0, isApplicable: false, exemptionLimit: 'Exempt up to 12% of Salary. Interest taxable if contribution > ₹2.5L' },
  { id: 'cont_nps', name: 'NPS (Employer)', type: 'Contribution', amount: 0, isApplicable: false, exemptionLimit: 'Exempt up to 10% of Salary (14% for Central/State Govt)' },
  { id: 'cont_super', name: 'Superannuation Fund', type: 'Contribution', amount: 0, isApplicable: false, exemptionLimit: 'Exempt up to ₹1.5L per year' },
  { id: 'adv_salary', name: 'Advance Salary', type: 'Other', amount: 0, isApplicable: false, exemptionLimit: 'Taxable in the year of receipt' },
  { id: 'arr_salary', name: 'Arrears of Salary', type: 'Other', amount: 0, isApplicable: false, exemptionLimit: 'Taxable in year of receipt (Relief u/s 89 available)' },
  { id: 'bonus', name: 'Bonus/Incentives', type: 'Other', amount: 0, isApplicable: false, exemptionLimit: 'Fully Taxable' },
  { id: 'taxes', name: 'Taxes', type: 'Deduction', amount: 0, isApplicable: true, exemptionLimit: 'TDS/Income Tax deducted at source' },
];

const TaxManager: React.FC = () => {
  const { state, updateTaxProfile } = useFinance();
  const [step, setStep] = useState<'source' | 'employers' | 'salary-config' | 'computation'>('source');
  const [primarySource, setPrimarySource] = useState<'Salary' | 'Business/Profession' | null>(state.taxProfile?.primarySource || null);
  const [numEmployers, setNumEmployers] = useState(state.taxProfile?.employers.length || 1);
  const [employers, setEmployers] = useState<Employer[]>(state.taxProfile?.employers || []);
  const [salaryStructure, setSalaryStructure] = useState<SalaryComponent[]>(state.taxProfile?.salaryStructure || INITIAL_SALARY_COMPONENTS);
  const [tdsDeducted, setTdsDeducted] = useState(state.taxProfile?.tdsDeducted || 0);
  const [otherTds, setOtherTds] = useState(state.taxProfile?.otherTds || 0);
  const [advanceTax, setAdvanceTax] = useState(state.taxProfile?.advanceTaxPaid || { q1: 0, q2: 0, q3: 0, q4: 0 });

  const handleEmployerChange = (index: number, field: keyof Employer, value: any) => {
    setEmployers(prev => {
      const newEmployers = [...prev];
      if (!newEmployers[index]) {
        // Use index as part of ID to be deterministic enough for this context, or just a simple counter if needed.
        // Since this is an event handler, it's technically safe, but let's be cleaner.
        newEmployers[index] = { id: `emp_${index}_${new Date().getTime()}`, name: '', nature: 'Others' };
      }
      newEmployers[index] = { ...newEmployers[index], [field]: value };
      return newEmployers;
    });
  };

  const handleSalaryConfigChange = (id: string, field: keyof SalaryComponent, value: any) => {
    setSalaryStructure(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const calculateTax = React.useCallback(() => {
    // Simplified Tax Calculation for New Regime FY 2024-25
    const grossSalary = salaryStructure.filter(c => c.isApplicable).reduce((sum, c) => sum + (c.amount || 0), 0);
    
    // Exemptions (Simplified logic - in reality this is complex)
    const exemptions = 0;
    // HRA, LTA etc logic would go here. For now, we assume user enters taxable amounts or we take full amount
    // Standard Deduction
    const stdDeduction = 75000;
    
    const netSalary = Math.max(0, grossSalary - stdDeduction);
    const totalIncome = netSalary; // Assuming only salary for now

    let tax = 0;
    if (totalIncome <= 300000) tax = 0;
    else if (totalIncome <= 700000) tax = (totalIncome - 300000) * 0.05;
    else if (totalIncome <= 1000000) tax = (400000 * 0.05) + (totalIncome - 700000) * 0.10;
    else if (totalIncome <= 1200000) tax = (400000 * 0.05) + (300000 * 0.10) + (totalIncome - 1000000) * 0.15;
    else if (totalIncome <= 1500000) tax = (400000 * 0.05) + (300000 * 0.10) + (200000 * 0.15) + (totalIncome - 1200000) * 0.20;
    else tax = (400000 * 0.05) + (300000 * 0.10) + (200000 * 0.15) + (300000 * 0.20) + (totalIncome - 1500000) * 0.30;

    // Rebate 87A
    if (totalIncome <= 700000) tax = 0;

    // Cess
    const cess = tax * 0.04;
    const totalTaxPayable = tax + cess;

    return {
      grossSalary,
      netSalary,
      totalTaxPayable,
      stdDeduction
    };
  }, [salaryStructure]);

  const taxData = useMemo(() => calculateTax(), [calculateTax]);

  const saveProfile = () => {
    if (primarySource) {
      updateTaxProfile({
        primarySource,
        employers,
        salaryStructure,
        advanceTaxPaid: advanceTax,
        tdsDeducted,
        otherTds
      });
    }
  };

  if (step === 'source') {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Tax Planner</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={() => { setPrimarySource('Salary'); setStep('employers'); }}
            className="p-8 bg-black border border-slate-800 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all text-left group"
          >
            <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform">💼</span>
            <h3 className="text-lg font-black text-white uppercase">Salary</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Salaried Individuals</p>
          </button>
          <button 
            onClick={() => setPrimarySource('Business/Profession')}
            className="p-8 bg-black border border-slate-800 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all text-left group"
          >
            <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform">📈</span>
            <h3 className="text-lg font-black text-white uppercase">Business / Profession</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Self-Employed & Freelancers</p>
          </button>
        </div>
        {primarySource === 'Business/Profession' && (
          <div className="p-6 bg-indigo-50 text-indigo-800 rounded-2xl text-center font-bold text-sm">
            We are coming up soon with an app for business/profession
          </div>
        )}
      </div>
    );
  }

  if (step === 'employers') {
    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6 pb-20">
        <div className="flex items-center gap-4">
          <button onClick={() => setStep('source')} className="text-slate-400 hover:text-slate-800">← Back</button>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Employer Details</h2>
        </div>
        
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Number of Employers (Current FY)</label>
          <input 
            type="number" 
            min="1" 
            max="5" 
            value={numEmployers} 
            onChange={(e) => {
              const num = parseInt(e.target.value) || 1;
              setNumEmployers(num);
              setEmployers(prev => {
                const newArr = [...prev];
                while (newArr.length < num) newArr.push({ id: `emp_${Date.now()}_${newArr.length}`, name: '', nature: 'Others' });
                return newArr.slice(0, num);
              });
            }}
            className="w-full p-4 bg-slate-50 border-none rounded-xl font-black text-lg outline-none"
          />
        </div>

        {Array.from({ length: numEmployers }).map((_, idx) => (
          <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest">Employer #{idx + 1}</h3>
            
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Name of Employer</label>
              <input 
                value={employers[idx]?.name || ''} 
                onChange={(e) => handleEmployerChange(idx, 'name', e.target.value)}
                className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none"
                placeholder="Company Name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nature of Employer</label>
              <select 
                value={employers[idx]?.nature || 'Others'} 
                onChange={(e) => handleEmployerChange(idx, 'nature', e.target.value)}
                className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none"
              >
                <option>Central Government</option>
                <option>State Government</option>
                <option>Public Sector Undertaking (PSU)</option>
                <option>Pensioners – Central Government</option>
                <option>Pensioners – State Government</option>
                <option>Pensioners – PSU</option>
                <option>Pensioners – Others</option>
                <option>Others</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">TAN</label>
                  <input 
                    value={employers[idx]?.tan || ''} 
                    onChange={(e) => handleEmployerChange(idx, 'tan', e.target.value)}
                    className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none uppercase"
                    placeholder="ABCD12345E"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Pincode</label>
                  <input 
                    value={employers[idx]?.pincode || ''} 
                    onChange={(e) => handleEmployerChange(idx, 'pincode', e.target.value)}
                    className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none"
                    placeholder="110001"
                  />
               </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Address</label>
              <textarea 
                value={employers[idx]?.address || ''} 
                onChange={(e) => handleEmployerChange(idx, 'address', e.target.value)}
                className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none"
                rows={2}
                placeholder="Full Address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">City</label>
                  <input 
                    value={employers[idx]?.city || ''} 
                    onChange={(e) => handleEmployerChange(idx, 'city', e.target.value)}
                    className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">State</label>
                  <select 
                    value={employers[idx]?.state || ''} 
                    onChange={(e) => handleEmployerChange(idx, 'state', e.target.value)}
                    className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none"
                  >
                    <option value="">Select State</option>
                    <option>Andhra Pradesh</option><option>Arunachal Pradesh</option><option>Assam</option><option>Bihar</option><option>Chhattisgarh</option><option>Goa</option><option>Gujarat</option><option>Haryana</option><option>Himachal Pradesh</option><option>Jharkhand</option><option>Karnataka</option><option>Kerala</option><option>Madhya Pradesh</option><option>Maharashtra</option><option>Manipur</option><option>Meghalaya</option><option>Mizoram</option><option>Nagaland</option><option>Odisha</option><option>Punjab</option><option>Rajasthan</option><option>Sikkim</option><option>Tamil Nadu</option><option>Telangana</option><option>Tripura</option><option>Uttar Pradesh</option><option>Uttarakhand</option><option>West Bengal</option><option>Delhi</option>
                  </select>
               </div>
            </div>
          </div>
        ))}

        <button 
          onClick={() => { saveProfile(); setStep('salary-config'); }}
          className="w-full py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all active:scale-95"
        >
          Proceed to Salary Config
        </button>
      </div>
    );
  }

  if (step === 'salary-config') {
    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6 pb-20">
        <div className="flex items-center gap-4">
          <button onClick={() => setStep('employers')} className="text-slate-400 hover:text-slate-800">← Back</button>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Salary Structure</h2>
        </div>
        
        <div className="bg-indigo-50 p-4 rounded-2xl text-xs text-indigo-800 font-medium">
          Select applicable components. This is a one-time setup and will be used for future salary records.
        </div>

        <div className="space-y-3">
          {salaryStructure.map((comp) => (
            <div key={comp.id} className={`bg-white p-4 rounded-2xl border transition-all ${comp.isApplicable ? 'border-indigo-500 shadow-md' : 'border-slate-100'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={comp.isApplicable} 
                    onChange={(e) => handleSalaryConfigChange(comp.id, 'isApplicable', e.target.checked)}
                    className="w-5 h-5 rounded-md accent-indigo-600"
                  />
                  <div>
                    <h4 className={`text-sm font-black uppercase ${comp.isApplicable ? 'text-slate-800' : 'text-slate-400'}`}>{comp.name}</h4>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{comp.type}</span>
                  </div>
                </div>
                {comp.exemptionLimit && (
                  <div className="group relative">
                    <Info size={16} className="text-slate-300 hover:text-indigo-500 cursor-help" />
                    <div className="absolute right-0 top-6 w-64 bg-slate-800 text-white text-[10px] p-3 rounded-xl z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl">
                      {comp.exemptionLimit}
                    </div>
                  </div>
                )}
              </div>
              
              {comp.isApplicable && (
                <div className="mt-3 pl-8 animate-in slide-in-from-top-2">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Annual Amount</label>
                  <input 
                    type="number" 
                    value={comp.amount || ''} 
                    onChange={(e) => handleSalaryConfigChange(comp.id, 'amount', Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border-b border-slate-200 font-mono text-sm outline-none focus:border-indigo-500 transition-colors"
                    placeholder="0.00"
                  />
                </div>
              )}
            </div>
          ))}
          
          <div className="bg-white p-4 rounded-2xl border border-slate-100">
             <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-black text-slate-800 uppercase">Tax Deducted by Employer</h4>
             </div>
             <input 
                type="number" 
                value={tdsDeducted || ''} 
                onChange={(e) => setTdsDeducted(Number(e.target.value))}
                className="w-full p-3 bg-slate-50 rounded-xl font-mono text-sm outline-none"
                placeholder="Total TDS"
             />
          </div>
        </div>

        <button 
          onClick={() => { saveProfile(); setStep('computation'); }}
          className="w-full py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all active:scale-95"
        >
          Compute Tax
        </button>
      </div>
    );
  }

  if (step === 'computation') {
    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6 pb-20">
        <div className="flex items-center gap-4">
          <button onClick={() => setStep('salary-config')} className="text-slate-400 hover:text-slate-800">← Back</button>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Tax Computation</h2>
        </div>

        <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="relative z-10">
            <h3 className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-6">Executive Summary (FY 24-25)</h3>
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Salary</p>
                <p className="text-xl font-black">{formatCurrency(taxData.grossSalary, state.profile.currency)}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cash-in-Hand</p>
                <p className="text-xl font-black text-emerald-400">{formatCurrency(taxData.grossSalary - tdsDeducted - otherTds, state.profile.currency)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tax Payable</p>
                <p className="text-xl font-black text-rose-400">{formatCurrency(taxData.totalTaxPayable, state.profile.currency)}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tax Deducted</p>
                <p className="text-xl font-black text-indigo-400">{formatCurrency(tdsDeducted + otherTds, state.profile.currency)}</p>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black uppercase tracking-widest">Net Tax Due / (Refund)</p>
                <p className={`text-2xl font-black ${taxData.totalTaxPayable > (tdsDeducted + otherTds) ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {formatCurrency(Math.abs(taxData.totalTaxPayable - (tdsDeducted + otherTds)), state.profile.currency)}
                  <span className="text-[10px] ml-2 text-slate-400">{taxData.totalTaxPayable > (tdsDeducted + otherTds) ? 'PAYABLE' : 'REFUND'}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
           <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Advance Tax Liability</h3>
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead>
                 <tr className="border-b border-slate-100">
                   <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Quarter</th>
                   <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Liability (Cum.)</th>
                   <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Paid/TDS</th>
                   <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Shortfall</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {[
                   { q: 'Q1 (15 Jun)', pct: 0.15 },
                   { q: 'Q2 (15 Sep)', pct: 0.45 },
                   { q: 'Q3 (15 Dec)', pct: 0.75 },
                   { q: 'Q4 (15 Mar)', pct: 1.00 },
                 ].map((row, i) => {
                   const liability = taxData.totalTaxPayable * row.pct;
                   const paid = (tdsDeducted + otherTds) * row.pct; // Simplified assumption: TDS is deducted evenly
                   const shortfall = Math.max(0, liability - paid);
                   return (
                     <tr key={i}>
                       <td className="py-3 text-[10px] font-black text-slate-700 uppercase">{row.q}</td>
                       <td className="py-3 text-[10px] font-bold text-slate-500 text-right">{formatCurrency(liability, state.profile.currency)}</td>
                       <td className="py-3 text-[10px] font-bold text-emerald-600 text-right">{formatCurrency(paid, state.profile.currency)}</td>
                       <td className="py-3 text-[10px] font-bold text-rose-500 text-right">{formatCurrency(shortfall, state.profile.currency)}</td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
           <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-2">Interest u/s 234</h3>
           <p className="text-[10px] text-slate-400 mb-4">Interest for default in payment of advance tax (234B) and deferment of advance tax (234C).</p>
           <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
             <span className="text-xs font-black text-slate-600 uppercase">Total Interest Est.</span>
             <span className="text-sm font-black text-rose-500">₹0.00</span>
           </div>
           <p className="text-[8px] text-slate-400 mt-2 text-center uppercase tracking-widest">Calculation requires exact dates of payment</p>
        </div>
      </div>
    );
  }

  return null;
};

export default TaxManager;
