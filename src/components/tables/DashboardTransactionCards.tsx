"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, ReceiptText } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatDate, formatRupiah, laundryStatusLabel, paymentMethodLabel, paymentStatusLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types";

const pageSize = 5;

export function DashboardTransactionCards({ transactions, className = "" }: { transactions: Transaction[]; className?: string }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(transactions.length / pageSize));
  const rows = useMemo(() => {
    const start = page * pageSize;
    return transactions.slice(start, start + pageSize);
  }, [page, transactions]);

  function previousPage() {
    setPage((current) => Math.max(0, current - 1));
  }

  function nextPage() {
    setPage((current) => Math.min(pageCount - 1, current + 1));
  }

  return (
    <section className={cn("flex flex-col rounded-lg border border-line bg-white p-4 shadow-subtle", className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">Transaksi Terbaru</h2>
          <p className="text-sm text-muted">Maksimal 5 nota per halaman.</p>
        </div>
        <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-black text-ink">{transactions.length}</span>
      </div>

      <div className="mt-3 flex-1 space-y-3">
        {rows.map((trx) => (
          <article key={trx.id} className="rounded-lg border border-line bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/transactions/${trx.id}`} className="block truncate text-sm font-black text-brand-700 hover:underline">
                  {trx.transactionNumber}
                </Link>
                <p className="mt-1 truncate text-sm font-bold text-ink">{trx.customer.name}</p>
                <p className="text-xs text-muted">{trx.customer.phone || "Tanpa HP"} • {formatDate(trx.createdAt)}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-black text-ink">{formatRupiah(trx.grandTotal)}</p>
                <p className="mt-1 text-xs font-semibold text-muted">{trx.cashier.name}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-white px-2.5 py-2">
                <p className="font-semibold text-muted">Pembayaran</p>
                <p className="mt-1 font-bold text-ink">{paymentStatusLabel[trx.paymentStatus]}</p>
                <p className="text-muted">{trx.payments[0] ? paymentMethodLabel[trx.payments[0].paymentMethod] : "-"}</p>
              </div>
              <div className="rounded-lg bg-white px-2.5 py-2">
                <p className="font-semibold text-muted">Laundry</p>
                <p className="mt-1 font-bold text-ink">{laundryStatusLabel[trx.laundryStatus]}</p>
                <Link href={`/transactions/${trx.id}`} className="text-brand-700 hover:underline">Detail</Link>
              </div>
            </div>
          </article>
        ))}

        {rows.length === 0 ? (
          <div className="flex min-h-[220px] h-full flex-col items-center justify-center rounded-lg border border-dashed border-line bg-slate-50 p-5 text-center">
            <ReceiptText className="mx-auto h-7 w-7 text-muted" />
            <p className="mt-2 text-sm font-bold text-ink">Belum ada transaksi</p>
            <p className="text-xs text-muted">Data transaksi periode ini masih kosong.</p>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
        <Button variant="secondary" size="sm" disabled={page === 0} onClick={previousPage}>
          <ChevronLeft className="h-4 w-4" />Prev
        </Button>
        <span className="text-xs font-bold text-muted">Halaman {page + 1} / {pageCount}</span>
        <Button variant="secondary" size="sm" disabled={page >= pageCount - 1} onClick={nextPage}>
          Next<ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
