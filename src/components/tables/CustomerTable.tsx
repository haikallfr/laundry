import Link from "next/link";
import { formatDate, formatRupiah } from "@/lib/utils";
import type { Customer, Transaction } from "@/types";

export function CustomerTable({ customers, transactions }: { customers: Customer[]; transactions: Transaction[] }) {
  return (
    <>
    <div className="space-y-2 md:hidden">
      {customers.map((customer) => {
        const rows = transactions.filter((trx) => trx.customerId === customer.id);
        const omzet = rows.reduce((sum, trx) => sum + trx.grandTotal, 0);
        return (
          <article key={customer.id} className="rounded-lg border border-line bg-white p-3 shadow-subtle">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-black text-ink">{customer.name}</p>
                <p className="text-xs text-muted">{customer.phone || "Tanpa HP"}</p>
                <p className="mt-1 line-clamp-1 text-xs text-muted">{customer.address || "-"}</p>
              </div>
              <Link className="shrink-0 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-brand-700" href={`/customers/${customer.id}`}>Detail</Link>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg bg-slate-50 p-2"><p className="text-muted">Trx</p><p className="font-black text-ink">{rows.length}</p></div>
              <div className="rounded-lg bg-slate-50 p-2"><p className="text-muted">Omzet</p><p className="font-black text-ink">{formatRupiah(omzet)}</p></div>
              <div className="rounded-lg bg-slate-50 p-2"><p className="text-muted">Terakhir</p><p className="font-black text-ink">{rows[0] ? formatDate(rows[0].createdAt, "dd MMM") : "-"}</p></div>
            </div>
          </article>
        );
      })}
      {customers.length === 0 ? <div className="rounded-lg border border-dashed border-line bg-white p-6 text-center text-sm text-muted">Belum ada pelanggan.</div> : null}
    </div>
    <div className="hidden overflow-hidden rounded-lg border border-line bg-white shadow-subtle md:block">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-muted">
          <tr><th className="px-4 py-3">Pelanggan</th><th className="px-4 py-3">Kontak</th><th className="px-4 py-3">Total Transaksi</th><th className="px-4 py-3">Omzet</th><th className="px-4 py-3">Terakhir</th><th className="px-4 py-3">Aksi</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {customers.map((customer) => {
            const rows = transactions.filter((trx) => trx.customerId === customer.id);
            return (
              <tr key={customer.id}>
                <td className="px-4 py-3 font-bold text-ink">{customer.name}</td>
                <td className="px-4 py-3"><div>{customer.phone}</div><div className="text-xs text-muted">{customer.address || "-"}</div></td>
                <td className="px-4 py-3">{rows.length}</td>
                <td className="px-4 py-3 font-semibold">{formatRupiah(rows.reduce((sum, trx) => sum + trx.grandTotal, 0))}</td>
                <td className="px-4 py-3 text-muted">{rows[0] ? formatDate(rows[0].createdAt, "dd MMM yyyy") : "-"}</td>
                <td className="px-4 py-3"><Link className="font-semibold text-brand-700" href={`/customers/${customer.id}`}>Detail</Link></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </>
  );
}
