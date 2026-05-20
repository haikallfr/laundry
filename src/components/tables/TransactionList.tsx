"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TransactionTable } from "@/components/tables/TransactionTable";
import { formatDate } from "@/lib/utils";
import type { LaundryStatus, PaymentMethod, PaymentStatus, Transaction } from "@/types";

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [laundryStatus, setLaundryStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState(searchParams.get("paymentStatus") ?? "");
  const [paymentMethod, setPaymentMethod] = useState("");
  const dateRange = useMemo(() => rangeFromParams(searchParams), [searchParams]);
  const weekPages = useMemo(() => buildWeekPages(transactions), [transactions]);
  const [weekPage, setWeekPage] = useState(0);
  const activeWeek = weekPages[Math.min(weekPage, weekPages.length - 1)] ?? fallbackWeek();
  const isOutstandingView = paymentStatus === "outstanding";

  const baseTransactions = useMemo(() => {
    if (dateRange) return transactions.filter((trx) => inRange(trx.createdAt, dateRange.start, dateRange.end));
    if (isOutstandingView) return transactions;
    return transactions.filter((trx) => inRange(trx.createdAt, activeWeek.start, activeWeek.end));
  }, [activeWeek, dateRange, isOutstandingView, transactions]);

  const filtered = useMemo(() => baseTransactions.filter((trx) => {
    const q = query.toLowerCase();
    const matchesQuery = !q || [trx.transactionNumber, trx.customer.name, trx.customer.phone, trx.cashier.name].some((value) => (value ?? "").toLowerCase().includes(q));
    const matchesLaundry = !laundryStatus || trx.laundryStatus === laundryStatus;
    const matchesPayment = !paymentStatus || (paymentStatus === "outstanding" ? trx.paymentStatus === "UNPAID" || trx.paymentStatus === "PARTIAL" : trx.paymentStatus === paymentStatus);
    const matchesMethod = !paymentMethod || trx.payments.some((payment) => payment.paymentMethod === paymentMethod);
    return matchesQuery && matchesLaundry && matchesPayment && matchesMethod;
  }), [baseTransactions, laundryStatus, paymentMethod, paymentStatus, query]);

  return (
    <>
      <div className="mb-3 rounded-lg border border-line bg-white p-3 shadow-subtle md:mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Periode transaksi</p>
            <h2 className="text-base font-black text-ink md:text-lg">
              {dateRange ? `${formatDate(dateRange.start, "dd MMM yyyy")} - ${formatDate(dateRange.end, "dd MMM yyyy")}` : isOutstandingView ? "Semua transaksi belum lunas / DP" : `${formatDate(activeWeek.start, "dd MMM yyyy")} - ${formatDate(activeWeek.end, "dd MMM yyyy")}`}
            </h2>
            <p className="text-xs text-muted md:text-sm">{baseTransactions.length} transaksi aktif</p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:flex">
            <Button className="px-2 text-xs md:text-sm" variant="secondary" size="sm" disabled={Boolean(dateRange) || isOutstandingView || weekPage >= weekPages.length - 1} onClick={() => setWeekPage((current) => Math.min(weekPages.length - 1, current + 1))}>
              <ChevronLeft className="h-4 w-4" /><span className="md:hidden">Prev</span><span className="hidden md:inline">Minggu sebelumnya</span>
            </Button>
            <Button className="px-2 text-xs md:text-sm" variant="secondary" size="sm" disabled={Boolean(dateRange) || isOutstandingView || weekPage === 0} onClick={() => setWeekPage((current) => Math.max(0, current - 1))}>
              <span className="md:hidden">Next</span><span className="hidden md:inline">Minggu berikutnya</span><ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-1.5 md:mb-4 md:grid-cols-5 md:gap-3">
        <input value={query} onChange={(e) => setQuery(e.target.value)} className="col-span-3 h-9 rounded-lg border border-line px-3 text-xs md:col-span-2 md:h-10 md:text-sm" placeholder="Cari nota, pelanggan, HP" />
        <select value={laundryStatus} onChange={(e) => setLaundryStatus(e.target.value)} className="h-9 min-w-0 rounded-lg border border-line px-1.5 text-[11px] md:h-10 md:px-3 md:text-sm">
          <option value="">Laundry</option>
          {(["NEW", "PROCESSING", "DONE", "READY_FOR_PICKUP", "PICKED_UP", "CANCELLED"] as LaundryStatus[]).map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="h-9 min-w-0 rounded-lg border border-line px-1.5 text-[11px] md:h-10 md:px-3 md:text-sm">
          <option value="">Bayar</option>
          <option value="outstanding">Belum/DP</option>
          {(["UNPAID", "PARTIAL", "PAID", "REFUNDED", "CANCELLED"] as PaymentStatus[]).map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="h-9 min-w-0 rounded-lg border border-line px-1.5 text-[11px] md:h-10 md:px-3 md:text-sm">
          <option value="">Metode</option>
          {(["CASH", "QRIS", "BANK_TRANSFER", "EWALLET", "SPLIT"] as PaymentMethod[]).map((method) => <option key={method} value={method}>{method}</option>)}
        </select>
      </div>
      <div className="mb-3 flex items-center justify-between gap-2 text-xs text-muted md:text-sm">
        <span>{filtered.length} dari {baseTransactions.length} transaksi aktif{isOutstandingView ? " yang belum lunas / DP" : ""}</span>
        <Button className="shrink-0 px-2 text-xs md:text-sm" variant="secondary" size="sm" onClick={() => { setQuery(""); setLaundryStatus(""); setPaymentStatus(""); setPaymentMethod(""); }}><Filter className="h-4 w-4" />Reset</Button>
      </div>
      <TransactionTable transactions={filtered} />
    </>
  );
}

function rangeFromParams(searchParams: ReturnType<typeof useSearchParams>) {
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const period = searchParams.get("period");

  if (start || end) {
    return {
      start: start ? startOfDay(new Date(start)) : new Date(0),
      end: end ? endOfDay(new Date(end)) : new Date()
    };
  }

  const today = new Date();
  if (period === "today") return { start: startOfDay(today), end: endOfDay(today) };
  if (period === "yesterday") {
    const yesterday = new Date(today.getTime() - 86_400_000);
    return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
  }
  if (period === "7d") return { start: startOfDay(new Date(today.getTime() - 6 * 86_400_000)), end: endOfDay(today) };
  if (period === "month") return { start: startOfDay(new Date(today.getFullYear(), today.getMonth(), 1)), end: endOfDay(today) };
  if (period === "lastMonth") return { start: startOfDay(new Date(today.getFullYear(), today.getMonth() - 1, 1)), end: endOfDay(new Date(today.getFullYear(), today.getMonth(), 0)) };
  if (period === "year") return { start: startOfDay(new Date(today.getFullYear(), 0, 1)), end: endOfDay(today) };

  return null;
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function startOfWeek(date: Date) {
  const value = new Date(date);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfWeek(date: Date) {
  const value = new Date(date);
  value.setDate(value.getDate() + 6);
  value.setHours(23, 59, 59, 999);
  return value;
}

function buildWeekPages(transactions: Transaction[]) {
  if (!transactions.length) return [fallbackWeek()];
  const sortedDates = transactions.map((trx) => new Date(trx.createdAt).getTime()).sort((a, b) => b - a);
  const latest = startOfWeek(new Date(sortedDates[0]));
  const oldest = startOfWeek(new Date(sortedDates[sortedDates.length - 1]));
  const weeks: Array<{ start: Date; end: Date }> = [];
  for (let cursor = latest; cursor.getTime() >= oldest.getTime(); cursor = new Date(cursor.getTime() - 7 * 86_400_000)) {
    weeks.push({ start: cursor, end: endOfWeek(cursor) });
  }
  return weeks;
}

function fallbackWeek() {
  const start = startOfWeek(new Date());
  return { start, end: endOfWeek(start) };
}

function inRange(date: string, start: Date, end: Date) {
  const value = new Date(date).getTime();
  return value >= start.getTime() && value <= end.getTime();
}
