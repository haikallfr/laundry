export const dynamic = 'force-dynamic';

import { Banknote, CreditCard, ReceiptText, Repeat, TrendingDown, TrendingUp, Users, WalletCards } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { OwnerOnlyGuard } from "@/components/layout/RoleGuards";
import { PaymentMethodChart } from "@/components/charts/PaymentMethodChart";
import { ProfitLossChart } from "@/components/charts/ProfitLossChart";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { ReportFilter } from "@/components/forms/ReportFilter";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { calculateFinanceSummary, filterTransactionsByPeriod, revenueDailySeries, resolvePeriod, servicePopularity } from "@/lib/finance";
import { readStore } from "@/lib/store";
import { formatRupiah } from "@/lib/utils";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { expenses, transactions } = await readStore();
  const resolved = resolvePeriod(await searchParams);
  const scopedTransactions = filterTransactionsByPeriod(transactions, resolved.period);
  const summary = calculateFinanceSummary(transactions, expenses, resolved.period);
  const periodNetProfit = summary.netProfit;
  const netProfitLabel = periodNetProfit < 0 ? "Rugi bersih" : "Laba bersih";
  const financeRows = [
    ["Pendapatan kotor", summary.grossRevenue],
    ["Diskon", summary.discounts],
    ["Pendapatan bersih", summary.netRevenue],
    ["Pengeluaran", summary.expenses],
    [netProfitLabel, periodNetProfit],
    ["Piutang", summary.receivables]
  ] as const;
  return (
    <OwnerOnlyGuard>
      <AppShell>
        <SectionHeader title="Laporan Keuangan" description="Pendapatan, pembayaran, piutang, pelanggan, layanan, laba rugi, dan pengeluaran." />
        <section className="rounded-lg border border-line bg-white p-3 shadow-subtle sm:p-4">
          <div className="mb-2 flex flex-col gap-1 md:mb-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-bold text-ink sm:text-base">Filter Laporan</h2>
              <p className="text-xs text-muted sm:text-sm">Periode: {resolved.label}{resolved.period.start ? `, ${resolved.period.start.toLocaleDateString("id-ID")}` : ""}{resolved.period.end ? ` - ${resolved.period.end.toLocaleDateString("id-ID")}` : ""}</p>
            </div>
          </div>
          <ReportFilter />
        </section>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
          <StatCard label="Pendapatan kotor" value={summary.grossRevenue} money icon={Banknote} />
          <StatCard label="Pendapatan bersih" value={summary.netRevenue} money icon={TrendingUp} tone="green" />
          <StatCard label="Piutang" value={summary.receivables} money icon={CreditCard} tone="amber" />
          <StatCard label={netProfitLabel} value={periodNetProfit} money icon={WalletCards} tone={periodNetProfit < 0 ? "red" : "green"} detail={periodNetProfit < 0 ? "Perusahaan sedang minus" : undefined} />
          <StatCard label="Transaksi lunas" value={summary.totalPaidTransactions} icon={ReceiptText} tone="slate" />
          <StatCard label="Transaksi belum lunas" value={summary.totalUnpaidTransactions} icon={CreditCard} tone="amber" />
          <StatCard label="Pelanggan baru" value={summary.newCustomers} icon={Users} tone="blue" />
          <StatCard label="Repeat customer" value={summary.repeatCustomers} icon={Repeat} tone="green" />
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <RevenueChart data={revenueDailySeries(scopedTransactions, Math.min(resolved.days, 60), resolved.period.end ?? new Date())} />
            <ProfitLossChart data={servicePopularity(scopedTransactions)} />
          </div>
          <div className="space-y-4">
            <PaymentMethodChart data={summary.cashInByMethod} />
            <section className="rounded-lg border border-line bg-white p-3 shadow-subtle sm:p-4">
              <h2 className="text-sm font-bold text-ink sm:text-base">Ringkasan Laba Rugi</h2>
              <p className="text-xs text-muted sm:text-sm">Mengikuti periode aktif.</p>
              <div className="mt-3 space-y-1.5 sm:space-y-2">
                {financeRows.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs sm:text-sm">
                    <span className="text-muted">{label}</span>
                    <strong className="text-right text-ink">{formatRupiah(value)}</strong>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-lg border border-line bg-white p-3 shadow-subtle sm:p-4">
              <h2 className="text-sm font-bold text-ink sm:text-base">Rata-rata</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:text-sm">
                <div className="rounded-lg bg-slate-50 p-2 sm:p-3"><p className="text-muted">Nilai transaksi</p><p className="mt-1 font-black text-ink">{formatRupiah(summary.averageTransactionValue)}</p></div>
                <div className="rounded-lg bg-slate-50 p-2 sm:p-3"><p className="text-muted">Per pelanggan</p><p className="mt-1 font-black text-ink">{formatRupiah(summary.averageRevenuePerCustomer)}</p></div>
              </div>
            </section>
          </div>
        </div>
      </AppShell>
    </OwnerOnlyGuard>
  );
}
