
export type Periodicity = 'Daily' | 'Weekly' | 'Fortnightly' | 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Annually';
export type AccountClassification = 'Current Asset' | 'Non-Current Asset' | 'Current Liability' | 'Non-Current Liability' | 'Equity';

export interface MonitoredApp {
  id: string;
  name: string;
  icon: string;
  isEnabled: boolean;
  category: 'Banking' | 'UPI' | 'Investment' | 'Wallet';
}

export interface MemberPermissions {
  viewDashboard: boolean;
  viewStatements: boolean;
  viewBudget: boolean;
  viewTransactions: boolean;
  viewCalendar: boolean;
  viewAccounts: boolean;
  canCreateTransactions: boolean;
}

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  mobileNumber?: string;
  email?: string;
  status: 'pending_invitation' | 'verified';
  permissions: MemberPermissions;
}

export interface GoogleDriveConfig {
  folderName: string;
  folderId: string;
  isConnected: boolean;
  linkedEmail?: string;
  clientId?: string;
  apiKey?: string;
}

export interface UserProfile {
  name: string;
  designation: string;
  age: number;
  city: string;
  country: string;
  currency: string;
  mobileNumber?: string;
  email?: string;
  profilePicture?: string;
  isBoarded: boolean;
  familyMembers: FamilyMember[];
  cloudDatabaseName?: string;
  monitoredApps: MonitoredApp[];
  remindersEnabled: boolean;
  reminderTime?: string;
  googleDriveConfig?: GoogleDriveConfig;
  defaultFinancialYear?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'transaction' | 'system' | 'sync' | 'reminder' | 'approval_request' | 'family_request';
  isRead: boolean;
  transactionId?: string;
  requestData?: {
    name: string;
    mobile?: string;
    email?: string;
    relation: string;
  };
}

export interface BankAccount {
  id: string;
  name: string;
  accountNumber?: string;
  ifsc?: string;
  balance: number;
  ownerId?: string;
  accountType?: 'Savings' | 'Current' | 'Salary' | 'Others';
  customAccountType?: string;
  classification?: AccountClassification;
}

export interface CreditCard {
  id: string;
  lenderName: string;
  balance: number;
  last4: string;
  limit?: number;
  annualLimit?: number; 
  anniversaryDate?: string;
  billingDay?: number;
  dueDate?: string;
  offers: {
    movie: boolean;
    dining: boolean;
    concierge: boolean;
    lounge: boolean;
  };
  ownerId?: string;
  classification?: AccountClassification;
  cashbackPct?: number;
  movieOffers?: {
    onePlusOne: boolean;
    amountBased: number;
  };
  loungeAccess?: {
    count: number;
    spendLimit: number;
    period: string;
  };
  fuelSurchargeWaiver?: boolean;
  forexMarkup?: number;
  pointsConversion?: string;
  otherBenefits?: {
    condition: string;
    benefitName: string;
    linkedNatures: string[];
  }[];
}

export interface Wallet {
  id: string;
  name: string;
  balance: number;
  ownerId?: string;
  classification?: AccountClassification;
}

export interface StaffAttendance {
  date: string;
  status: 'Present' | 'Absent' | 'Half-Day';
  rate: number;
  isSubstitute: boolean;
  substituteName?: string;
  note?: string;
  hoursWorked?: number;
}

export type WageType = 'Monthly' | 'Daily' | 'Hourly' | 'Task';

export interface Staff {
  id: string;
  name: string;
  role: string;
  baseRate: number;
  wageType: WageType;
  attendance: StaffAttendance[];
  mobile?: string;
  joiningDate: string;
  exitDate?: string;
}

export interface IncomeStream {
  id: string;
  name: string;
  amount: number;
  periodicity: Periodicity;
  dateOfReceipt: string;
  ownerId?: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  periodicity: Periodicity;
  date: string;
  ownerId?: string;
}

export interface Asset {
  id: string;
  name: string;
  value: number;
  type?: 'Physical' | 'Receivable';
  ownerId?: string;
  classification?: AccountClassification;
  isin?: string;
  units?: number;
}

export interface Liability {
  id: string;
  name: string;
  amount: number;
  type?: 'Debt' | 'Payable';
  ownerId?: string;
  classification?: AccountClassification;
}

export type TransactionType = 'Income' | 'Expense' | 'Asset' | 'Liability' | 'Receipt' | 'Payment' | 'Adjustment';

export interface SharedContact {
  name: string;
  mobile: string;
  email?: string;
  amount: number;
  settlementDate?: string;
}

export interface TransactionAttachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  uploadDate: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  nature: string; 
  description: string;
  accountId: string;
  accountType: 'bank' | 'card' | 'wallet' | 'liability' | 'asset';
  date: string;
  category?: string;
  status: 'active' | 'pending_approval';
  createdBy?: string; 
  isShared?: boolean;
  sharedAmount?: number;
  numberOfPeople?: number;
  includeSelf?: boolean;
  sharedContacts?: SharedContact[];
  ownerId?: string; 
  isin?: string;
  stockName?: string;
  units?: number; 
  stt?: number; 
  brokerage?: number; 
  billingPeriod?: string; 
  isSettled?: boolean;
  estimatedLife?: number;
  attachments?: TransactionAttachment[];
  salaryBreakup?: { 
    componentId: string; 
    name: string; 
    amount: number;
    period?: 'Calendar Year' | 'Financial Year' | 'Custom';
    taxDeducted?: boolean;
  }[];
  relatedAssetLiabilityId?: string;
  financialYear?: string;
}

export interface HoldingItem {
  isin: string;
  name: string;
  value: number;
  units: number;
  count: number;
}

export interface Budget {
  id: string;
  category: string;
  type?: TransactionType;
  amount: number;
  frequency: Periodicity;
  startDate: string;
  endDate: string;
  dueDate?: string;
  periodType: 'Financial' | 'Calendar' | 'Custom';
  ownerId?: string;
}

export interface Tenant {
  id: string;
  name: string;
  idProofType: 'Aadhar' | 'Driving License' | 'Voter ID' | 'Passport' | 'Other';
  idProofNumber?: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  rentDueDate: number;
  propertyAddress: string;
  propertyType: 'Flat' | 'Shop';
  propertyNumber: string;
  squareFeet: number;
  incrementRate: number;
  securityDeposit: number;
  depositReceiptMode: string;
  securityDepositLiabilityAccountId: string;
  receivableAccountId: string;
  lastRentGenerated?: string;
  status: 'Active' | 'Vacated';
}

export interface FinancialState {
  profile: UserProfile;
  banks: BankAccount[];
  cards: CreditCard[];
  wallets: Wallet[];
  incomes: IncomeStream[];
  expenses: Expense[];
  assets: Asset[];
  liabilities: Liability[];
  transactions: Transaction[];
  budgets: Budget[]; 
  notifications: Notification[];
  transactionNatures: string[]; 
  staff: Staff[];
  tenants: Tenant[];
  capital: number; 
  taxProfile?: TaxProfile;
}

export interface Employer {
  id: string;
  name: string;
  nature: 'Central Government' | 'State Government' | 'Public Sector Undertaking (PSU)' | 'Pensioners – Central Government' | 'Pensioners – State Government' | 'Pensioners – PSU' | 'Pensioners – Others' | 'Others';
  tan?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface SalaryComponent {
  id: string;
  name: string;
  type: 'Allowance' | 'Perquisite' | 'Retirement' | 'Contribution' | 'Other' | 'Deduction';
  amount: number;
  isApplicable: boolean;
  exemptionLimit?: string; // Description for the info button
  taxableAmount?: number;
}

export interface TaxProfile {
  primarySource: 'Salary' | 'Business/Profession';
  employers: Employer[];
  salaryStructure: SalaryComponent[];
  advanceTaxPaid: {
    q1: number;
    q2: number;
    q3: number;
    q4: number;
  };
  tdsDeducted: number; // By employer
  otherTds: number; // Added by user
}
