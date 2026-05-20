export const dynamic = 'force-dynamic';

import { Banknote, Clock, CreditCard, PackageCheck, Receipt, TrendingUp, WalletCards } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { OwnerOnlyGuard } from "@/components/layout/RoleGuards";
import { PaymentMethodChart } from "@/components/charts/PaymentMethodChart";
import { ProfitLossChart } from "@/components/charts/ProfitLossChart";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { ReportFilter } from "@/components/forms/ReportFilter";
import { StatCard } from "@/components/ui/StatCard";
import { DashboardSidePanel } from "@/components/ui/DashboardSidePanel";
import { DashboardTransactionCards } from "@/components/tables/DashboardTransactionCards";
import { calculateFinanceSummary, filterTransactionsByPeriod, revenueDailySeries, resolvePeriod, servicePopularity } from "@/lib/finance";
import { readStore } from "@/lib/store";

export default async function DashboardOwnerPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { expenses, settings, transactions } = await readStore();
  const params = await searchParams;
  const resolved = resolvePeriod(params);
  const scopedTransactions = filterTransactionsByPeriod(transactions, resolved.period);
  const summary = calculateFinanceSummary(transactions, expenses, resolved.period);
  const periodNetProfit = summary.netProfit;
  const netProfitLabel = periodNetProfit < 0 ? "Rugi bersih" : "Laba bersih";
  const label = resolved.label.toLowerCase();
  const outstandingParams = new URLSearchParams();
  outstandingParams.set("paymentStatus", "outstanding");
  const currentPeriod = typeof params.period === "string" ? params.period : "";
  const currentStart = typeof params.start === "string" ? params.start : "";
  const currentEnd = typeof params.end === "string" ? params.end : "";
  outstandingParams.set("period", currentPeriod || "month");
  if (currentStart) outstandingParams.set("start", currentStart);
  if (currentEnd) outstandingParams.set("end", currentEnd);
  return (
    <OwnerOnlyGuard>
      <AppShell>
        <ReportFilter />
        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
          Periode aktif: {resolved.label}
          {resolved.period.start ? ` mulai ${resolved.period.start.toLocaleDateString("id-ID")}` : ""}
          {resolved.period.end ? ` sampai ${resolved.period.end.toLocaleDateString("id-ID")}` : ""}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
          <StatCard label={`Omzet ${label}`} value={summary.grossRevenue} money icon={Banknote} tone="blue" />
          <StatCard label={`Pendapatan bersih ${label}`} value={summary.netRevenue} money icon={TrendingUp} tone="green" />
          <StatCard label={`Transaksi ${label}`} value={scopedTransactions.length} icon={Receipt} tone="slate" />
          <StatCard label={`Pengeluaran ${label}`} value={summary.expenses} money icon={WalletCards} tone="red" />
          <StatCard label="Belum lunas" value={summary.totalUnpaidTransactions} icon={Clock} tone="amber" detail="Klik untuk lihat nota belum lunas" href={`/transactions?${outstandingParams.toString()}`} />
          <StatCard label="Siap diambil" value={scopedTransactions.filter((trx) => trx.laundryStatus === "READY_FOR_PICKUP").length} icon={PackageCheck} tone="green" />
          <StatCard label="Piutang" value={summary.receivables} money icon={CreditCard} tone="red" />
          <StatCard label={netProfitLabel} value={periodNetProfit} money icon={WalletCards} tone={periodNetProfit < 0 ? "red" : "green"} detail={periodNetProfit < 0 ? "Perusahaan sedang minus" : undefined} />
        </div>
        <div className="mt-4 grid items-stretch gap-4 xl:grid-cols-[1fr_360px]">
          <div className="flex h-full flex-col gap-4">
            <RevenueChart data={revenueDailySeries(scopedTransactions, Math.min(resolved.days, 60), resolved.period.end ?? new Date())} />
            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <ProfitLossChart data={servicePopularity(scopedTransactions)} />
              <div className="rounded-lg border border-line bg-white p-4 shadow-subtle">
                <h2 className="text-base font-bold text-ink">Manajemen Keuangan</h2>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["Pendapatan kotor", summary.grossRevenue],
                    ["Diskon", summary.discounts],
                    ["Pendapatan bersih", summary.netRevenue],
                    ["Pengeluaran", summary.expenses],
                    [netProfitLabel, periodNetProfit],
                    ["Outstanding payment", summary.outstandingPayment]
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-slate-50 p-3">
                      <p className="text-muted">{label}</p>
                      <p className="mt-1 font-black text-ink">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value))}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DashboardTransactionCards transactions={scopedTransactions} className="flex-1" />
          </div>
          <div className="space-y-4">
            <PaymentMethodChart data={summary.cashInByMethod} />
            <DashboardSidePanel transactions={scopedTransactions} settings={settings} />
          </div>
        </div>
      </AppShell>
    </OwnerOnlyGuard>
  );
}
