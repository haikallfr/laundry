import Link from "next/link";
import { formatDate, formatRupiah, laundryStatusLabel, paymentMethodLabel, paymentStatusLabel } from "@/lib/utils";
import type { Transaction } from "@/types";

export function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  return (
    <>
      <div className="space-y-2 md:hidden">
        {transactions.map((trx) => (
          <article key={trx.id} className="rounded-lg border border-line bg-white p-3 shadow-subtle">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/transactions/${trx.id}`} className="block truncate text-sm font-black text-brand-700">{trx.transactionNumber}</Link>
                <p className="mt-1 truncate text-base font-black text-ink">{trx.customer.name}</p>
                <p className="text-xs text-muted">{trx.customer.phone || "Tanpa HP"}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-semibold text-muted">{formatDate(trx.createdAt, "dd MMM")}</p>
                <p className="mt-1 text-sm font-black text-ink">{formatRupiah(trx.grandTotal)}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-muted">Pembayaran</p>
                <p className="mt-0.5 font-bold text-ink">{paymentStatusLabel[trx.paymentStatus]}</p>
                <p className="text-muted">{trx.payments[0] ? paymentMethodLabel[trx.payments[0].paymentMethod] : "-"}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-muted">Laundry</p>
                <p className="mt-0.5 font-bold text-ink">{laundryStatusLabel[trx.laundryStatus]}</p>
                <p className="text-muted">Kasir: {trx.cashier.name}</p>
              </div>
            </div>
            <Link className="mt-3 flex h-9 items-center justify-center rounded-lg border border-line text-xs font-semibold text-brand-700" href={`/transactions/${trx.id}`}>Detail</Link>
          </article>
        ))}
        {transactions.length === 0 ? <div className="rounded-lg border border-dashed border-line bg-white p-6 text-center text-sm text-muted">Belum ada transaksi.</div> : null}
      </div>
      <div className="hidden overflow-hidden rounded-lg border border-line bg-white shadow-subtle md:block">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-muted">
            <tr>
              <th className="px-4 py-3">No Nota</th>
              <th className="px-4 py-3">Pelanggan</th>
              <th className="px-4 py-3">Kasir</th>
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Pembayaran</th>
              <th className="px-4 py-3">Laundry</th>
              <th className="px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {transactions.map((trx) => (
              <tr key={trx.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-bold text-brand-700">{trx.transactionNumber}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-ink">{trx.customer.name}</div>
                  <div className="text-xs text-muted">{trx.customer.phone}</div>
                </td>
                <td className="px-4 py-3 text-muted">{trx.cashier.name}</td>
                <td className="px-4 py-3 text-muted">{formatDate(trx.createdAt)}</td>
                <td className="px-4 py-3 font-semibold">{formatRupiah(trx.grandTotal)}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold">{paymentStatusLabel[trx.paymentStatus]}</div>
                  <div className="text-xs text-muted">{trx.payments[0] ? paymentMethodLabel[trx.payments[0].paymentMethod] : "-"}</div>
                </td>
                <td className="px-4 py-3">{laundryStatusLabel[trx.laundryStatus]}</td>
                <td className="px-4 py-3">
                  <Link className="font-semibold text-brand-700 hover:underline" href={`/transactions/${trx.id}`}>Detail</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
