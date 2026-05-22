export type Role = "OWNER" | "CASHIER";
export type UserStatus = "ACTIVE" | "INACTIVE";
export type ServiceUnit = "KG" | "PCS" | "PACKAGE" | "METER";
export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID" | "REFUNDED" | "CANCELLED";
export type LaundryStatus = "NEW" | "PROCESSING" | "DONE" | "READY_FOR_PICKUP" | "PICKED_UP" | "CANCELLED";
export type PaymentMethod = "CASH" | "QRIS" | "BANK_TRANSFER" | "EWALLET" | "SPLIT";

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  status: UserStatus;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type LaundryService = {
  id: string;
  name: string;
  category: string;
  unit: ServiceUnit;
  price: number;
  cost: number;
  estimatedDuration: string;
  isActive: boolean;
};

export type TransactionItem = {
  id: string;
  serviceId: string;
  serviceName: string;
  unit: ServiceUnit;
  quantity: number;
  price: number;
  cost: number;
  subtotal: number;
  notes?: string;
};

export type Payment = {
  id: string;
  transactionId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  paidAt: string;
  referenceNumber?: string;
  notes?: string;
  createdBy: string;
};

export type Transaction = {
  id: string;
  transactionNumber: string;
  customerId: string;
  cashierId: string;
  customer: Customer;
  cashier: User;
  items: TransactionItem[];
  payments: Payment[];
  subtotal: number;
  discount: number;
  additionalFee: number;
  tax: number;
  grandTotal: number;
  paidAmount: number;
  changeAmount: number;
  paymentStatus: PaymentStatus;
  laundryStatus: LaundryStatus;
  estimatedDoneAt?: string;
  completedAt?: string;
  pickedUpAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  cancelReason?: string;
};

export type Expense = {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  materialCoverageKg?: number;
  paymentMethod: PaymentMethod;
  proofImage?: string;
  createdBy: string;
};

export type StoreSettings = {
  storeName: string;
  address: string;
  whatsapp: string;
  receiptWidth: 58 | 80;
  taxRate: number;
  qrisUrl: string;
};

export type FinanceSummary = {
  grossRevenue: number;
  discounts: number;
  netRevenue: number;
  totalPaidTransactions: number;
  totalUnpaidTransactions: number;
  receivables: number;
  expenses: number;
  serviceCost: number;
  grossProfit: number;
  netProfit: number;
  averageTransactionValue: number;
  averageRevenuePerCustomer: number;
  newCustomers: number;
  repeatCustomers: number;
  cashInByMethod: Record<PaymentMethod, number>;
  outstandingPayment: number;
};

export type CapitalItem = {
  id: string;
  name: string;
  category: string;
  amount: number;
  quantity?: number;
  purchasedAt: string;
  notes?: string;
};

export type CapitalAssumptions = {
  workingDaysPerMonth: number;
  targetDailyVolume: number;
  primaryServiceId?: string;
};

export type CapitalPlan = {
  items: CapitalItem[];
  assumptions: CapitalAssumptions;
};
