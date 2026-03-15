
import { FinancialState, Periodicity, Transaction, CreditCard } from '../types';

export const ANNUAL_MULTIPLIERS: Record<Periodicity, number> = {
  'Daily': 365,
  'Weekly': 52,
  'Fortnightly': 26,
  'Monthly': 12,
  'Quarterly': 4,
  'Half-Yearly': 2,
  'Annually': 1
};

/**
 * Calculates the allocated expense for a given period, considering amortization.
 */
export const calculateAllocatedExpense = (transactions: Transaction[], startDate: Date, endDate: Date): number => {
  let totalAllocated = 0;

  (transactions || []).filter(t => t.type === 'Expense').forEach(tx => {
    const txDate = new Date(tx.date);
    const life = tx.estimatedLife || 1;
    
    if (life <= 1) {
      if (txDate >= startDate && txDate <= endDate) {
        totalAllocated += tx.amount;
      }
    } else {
      const monthlyAmount = tx.amount / life;
      for (let m = 0; m < life; m++) {
        const monthDate = new Date(txDate.getFullYear(), txDate.getMonth() + m, 1);
        if (monthDate >= startDate && monthDate <= endDate) {
          totalAllocated += monthlyAmount;
        }
      }
    }
  });

  return totalAllocated;
};

/**
 * Provides a breakdown of allocated expenses by nature/category.
 */
export const calculateAllocatedExpenseBreakdown = (transactions: Transaction[], startDate: Date, endDate: Date): Record<string, number> => {
  const breakdown: Record<string, number> = {};

  (transactions || []).filter(t => t.type === 'Expense').forEach(tx => {
    const txDate = new Date(tx.date);
    const life = tx.estimatedLife || 1;
    const nature = tx.nature || 'Uncategorized';
    
    if (!breakdown[nature]) breakdown[nature] = 0;

    if (life <= 1) {
      if (txDate >= startDate && txDate <= endDate) {
        breakdown[nature] += tx.amount;
      }
    } else {
      const monthlyAmount = tx.amount / life;
      for (let m = 0; m < life; m++) {
        const monthDate = new Date(txDate.getFullYear(), txDate.getMonth() + m, 1);
        if (monthDate >= startDate && monthDate <= endDate) {
          breakdown[nature] += monthlyAmount;
        }
      }
    }
  });

  return breakdown;
};

/**
 * Calculates the start date of the current annual anniversary cycle based on the card's original anniversary date.
 */
export const getAnnualPeriodStart = (anniversaryDate: string): Date => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const anniv = new Date(anniversaryDate);
  
  const refAnniv = new Date(now.getFullYear(), anniv.getMonth(), anniv.getDate());
  refAnniv.setHours(0, 0, 0, 0);

  let cycleStartBase: Date;
  if (now > refAnniv) {
    cycleStartBase = new Date(refAnniv);
  } else {
    cycleStartBase = new Date(refAnniv);
    cycleStartBase.setFullYear(cycleStartBase.getFullYear() - 1);
  }
  
  const startDate = new Date(cycleStartBase);
  startDate.setDate(startDate.getDate() + 1);
  startDate.setHours(0, 0, 0, 0);
  
  return startDate;
};

export const getAnnualPeriodEnd = (startDate: Date): Date => {
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);
  endDate.setDate(endDate.getDate() - 1);
  endDate.setHours(23, 59, 59, 999);
  return endDate;
};

export const getBillingCycleDates = (billingDay: number, date: Date = new Date()) => {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  let start = new Date(checkDate.getFullYear(), checkDate.getMonth(), billingDay);
  if (checkDate < start) {
    start = new Date(checkDate.getFullYear(), checkDate.getMonth() - 1, billingDay);
  }
  
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setDate(end.getDate() - 1);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};

export const getPreviousBillingCycleDates = (billingDay: number, date: Date = new Date()) => {
  const current = getBillingCycleDates(billingDay, date);
  const prevRefDate = new Date(current.start);
  prevRefDate.setDate(prevRefDate.getDate() - 1);
  return getBillingCycleDates(billingDay, prevRefDate);
};

export const calculateRates = (state: FinancialState) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  // Use whole number day count (e.g., if today is the 15th, 15 days have elapsed in the month unit)
  // This ignores precise millisecond time-of-day offsets as requested.
  const daysInPeriod = now.getDate(); 

  const currentMonthIncome = (state.transactions || [])
    .filter(t => t.type === 'Income' && new Date(t.date) >= startOfMonth && new Date(t.date) <= now)
    .reduce((acc, t) => acc + t.amount, 0);

  const currentMonthExpense = calculateAllocatedExpense(state.transactions || [], startOfMonth, endOfMonth);

  return {
    income: currentMonthIncome,
    expense: currentMonthExpense,
    daysPassed: daysInPeriod, 
    monthlySurplus: currentMonthIncome - currentMonthExpense
  };
};

export const calculateNetWorth = (state: FinancialState) => {
  const manualAssets = (state.assets || []).reduce((acc, a) => acc + a.value, 0);
  const bankBalances = (state.banks || []).reduce((acc, b) => acc + b.balance, 0);
  const walletBalances = (state.wallets || []).reduce((acc, w) => acc + w.balance, 0);
  
  const cardReceivables = (state.cards || [])
    .filter(c => c.balance < 0)
    .reduce((acc, c) => acc + Math.abs(c.balance), 0);
    
  const cardOutstanding = (state.cards || [])
    .filter(c => c.balance > 0)
    .reduce((acc, c) => acc + c.balance, 0);
  
  const manualLiabilities = (state.liabilities || []).reduce((acc, l) => acc + l.amount, 0);

  const totalAssets = manualAssets + bankBalances + walletBalances + cardReceivables;
  const totalLiabilities = manualLiabilities + cardOutstanding;

  return {
    assets: totalAssets,
    liabilities: totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    breakdown: {
      manualAssets,
      bankBalances,
      walletBalances,
      cardReceivables,
      manualLiabilities,
      cardOutstanding
    }
  };
};

export const getTransactionsForPeriod = (transactions: Transaction[], days: number) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return (transactions || []).filter(t => new Date(t.date) >= cutoff);
};
