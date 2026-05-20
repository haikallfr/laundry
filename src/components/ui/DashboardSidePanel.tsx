import { CheckCircle2, Clock3, PackageCheck, RotateCw } from "lucide-react";
import { laundryStatusLabel } from "@/lib/utils";
import type { StoreSettings, Transaction } from "@/types";

export function DashboardSidePanel({ transactions, settings }: { transactions: Transaction[]; settings: StoreSettings }) {
  const statusRows = [
    { status: "NEW", icon: Clock3, color: "text-amber-600 bg-amber-50" },
    { status: "PROCESSING", icon: RotateCw, color: "text-blue-600 bg-blue-50" },
    { status: "READY_FOR_PICKUP", icon: PackageCheck, color: "text-emerald-600 bg-emerald-50" },
    { status: "PICKED_UP", icon: CheckCircle2, color: "text-slate-600 bg-slate-100" }
  ] as const;

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-line bg-white p-4 shadow-subtle">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-ink">Status Laundry</h2>
          <span className="text-xs font-semibold text-brand-700">Live</span>
        </div>
        <div className="mt-3 space-y-3">
          {statusRows.map(({ status, icon: Icon, color }) => (
            <div key={status} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
              <div className="flex items-center gap-3">
                <span className={`rounded-lg p-2 ${color}`}><Icon className="h-4 w-4" /></span>
                <div>
                  <p className="text-sm font-bold text-ink">{laundryStatusLabel[status]}</p>
                  <p className="text-xs text-muted">Antrian operasional</p>
                </div>
              </div>
              <span className="rounded-lg bg-white px-2.5 py-1 text-sm font-black text-ink">{transactions.filter((trx) => trx.laundryStatus === status).length}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-lg border border-line bg-white p-4 shadow-subtle">
        <h2 className="text-base font-bold text-ink">QRIS Aktif</h2>
        <p className="text-sm text-muted">Ditampilkan saat kasir memilih pembayaran QRIS.</p>
        <img src={settings.qrisUrl} alt="QRIS aktif" className="mt-3 h-64 w-full rounded-lg border border-line object-contain p-3" />
      </section>
    </div>
  );
}
