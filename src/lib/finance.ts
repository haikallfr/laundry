import type { Expense, FinanceSummary, PaymentMethod, Transaction } from "@/types";

export type Period = { start?: Date; end?: Date };

export function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

export function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function resolvePeriod(params?: Record<string, string | string[] | undefined>): { key: string; label: string; period: Period; days: number } {
  const today = new Date();
  const periodKey = typeof params?.period === "string" ? params.period : "month";
  const customStart = typeof params?.start === "string" ? params.start : "";
  const customEnd = typeof params?.end === "string" ? params.end : "";

  if (customStart || customEnd || periodKey === "custom") {
    return {
      key: "custom",
      label: "Custom",
      period: {
        start: customStart ? startOfDay(new Date(customStart)) : undefined,
        end: customEnd ? endOfDay(new Date(customEnd)) : undefined
      },
      days: 30
    };
  }

  if (periodKey === "today") {
    return { key: "today", label: "Hari ini", period: { start: startOfDay(today), end: endOfDay(today) }, days: 1 };
  }

  if (periodKey === "yesterday") {
    const yesterday = new Date(today.getTime() - 86_400_000);
    return { key: "yesterday", label: "Kemarin", period: { start: startOfDay(yesterday), end: endOfDay(yesterday) }, days: 1 };
  }

  if (periodKey === "7d") {
    return { key: "7d", label: "7 hari terakhir", period: { start: startOfDay(new Date(today.getTime() - 6 * 86_400_000)), end: endOfDay(today) }, days: 7 };
  }

  if (periodKey === "lastMonth") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { key: "lastMonth", label: "Bulan lalu", period: { start: startOfDay(start), end: endOfDay(end) }, days: 31 };
  }

  if (periodKey === "year") {
    const start = new Date(today.getFullYear(), 0, 1);
    return { key: "year", label: "Tahun ini", period: { start: startOfDay(start), end: endOfDay(today) }, days: 365 };
  }

  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return { key: "month", label: "Bulan ini", period: { start: startOfDay(start), end: endOfDay(today) }, days: 31 };
}

export function inPeriod(date: string, period?: Period) {
  const value = new Date(date).getTime();
  if (period?.start && value < period.start.getTime()) return false;
  if (period?.end && value > period.end.getTime()) return false;
  return true;
}

export function calculateFinanceSummary(transactions: Transaction[], expenses: Expense[], period?: Period): FinanceSummary {
  const scopedTransactions = transactions.filter((trx) => inPeriod(trx.createdAt, period));
  const scopedExpenses = expenses.filter((expense) => inPeriod(expense.date, period));
  const grossRevenue = scopedTransactions.reduce((sum, trx) => sum + trx.grandTotal, 0);
  const discounts = scopedTransactions.reduce((sum, trx) => sum + trx.discount, 0);
  const paidTransactions = scopedTransactions.filter((trx) => trx.paymentStatus === "PAID");
  const netRevenue = paidTransactions.reduce((sum, trx) => sum + trx.grandTotal, 0);
  const receivables = scopedTransactions.reduce((sum, trx) => {
    if (trx.paymentStatus === "UNPAID" || trx.paymentStatus === "PARTIAL") return sum + Math.max(0, trx.grandTotal - trx.paidAmount);
    return sum;
  }, 0);
  const totalExpenses = scopedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const serviceCost = 0;
  const customerTransactionCount = scopedTransactions.reduce<Record<string, number>>((map, trx) => {
    map[trx.customerId] = (map[trx.customerId] ?? 0) + 1;
    return map;
  }, {});
  const cashInByMethod = scopedTransactions.flatMap((trx) => trx.payments).reduce<Record<PaymentMethod, number>>((map, payment) => {
    map[payment.paymentMethod] += payment.amount;
    return map;
  }, { CASH: 0, QRIS: 0, BANK_TRANSFER: 0, EWALLET: 0, SPLIT: 0 });
  const activeCustomers = Object.keys(customerTransactionCount).length || 1;

  return {
    grossRevenue,
    discounts,
    netRevenue,
    totalPaidTransactions: paidTransactions.length,
    totalUnpaidTransactions: scopedTransactions.filter((trx) => trx.paymentStatus !== "PAID").length,
    receivables,
    expenses: totalExpenses,
    serviceCost,
    grossProfit: netRevenue,
    netProfit: netRevenue - totalExpenses,
    averageTransactionValue: paidTransactions.length ? netRevenue / paidTransactions.length : 0,
    averageRevenuePerCustomer: netRevenue / activeCustomers,
    newCustomers: Object.values(customerTransactionCount).filter((count) => count === 1).length,
    repeatCustomers: Object.values(customerTransactionCount).filter((count) => count > 1).length,
    cashInByMethod,
    outstandingPayment: receivables
  };
}

export function filterTransactionsByPeriod(transactions: Transaction[], period?: Period) {
  return transactions.filter((trx) => inPeriod(trx.createdAt, period));
}

export function filterExpensesByPeriod(expenses: Expense[], period?: Period) {
  return expenses.filter((expense) => inPeriod(expense.date, period));
}

export function revenueDailySeries(transactions: Transaction[], days = 30, endDate = new Date()) {
  return Array.from({ length: days }, (_, offset) => {
    const date = new Date(endDate.getTime() - (days - offset - 1) * 86_400_000);
    const key = date.toISOString().slice(0, 10);
    const rows = transactions.filter((trx) => trx.createdAt.slice(0, 10) === key);
    return {
      date: key.slice(5),
      omzet: rows.reduce((sum, trx) => sum + trx.grandTotal, 0),
      transaksi: rows.length,
      laba: rows.reduce((sum, trx) => sum + trx.grandTotal, 0)
    };
  });
}

export function servicePopularity(transactions: Transaction[]) {
  const map = new Map<string, { layanan: string; jumlah: number; omzet: number }>();
  transactions.forEach((trx) => {
    trx.items.forEach((item) => {
      const current = map.get(item.serviceName) ?? { layanan: item.serviceName, jumlah: 0, omzet: 0 };
      current.jumlah += item.quantity;
      current.omzet += item.subtotal;
      map.set(item.serviceName, current);
    });
  });
  return [...map.values()].sort((a, b) => b.omzet - a.omzet).slice(0, 8);
}
