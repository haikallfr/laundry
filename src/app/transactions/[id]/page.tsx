export const dynamic = 'force-dynamic';

import Link from "next/link";
import { Printer } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ReceiptPreview } from "@/components/receipt/ReceiptPrintLayout";
import { formatDate, formatRupiah, laundryStatusLabel, paymentStatusLabel } from "@/lib/utils";
import { readStore } from "@/lib/store";
import { TransactionStatusActions } from "@/components/forms/TransactionStatusActions";
import { TransactionPaymentActions } from "@/components/forms/TransactionPaymentActions";

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { settings, transactions } = await readStore();
  const transaction = transactions.find((trx) => trx.id === id) ?? transactions[0];
  return (
    <AppShell>
      <SectionHeader title={transaction.transactionNumber} description="Detail transaksi, status pembayaran, update laundry, dan re-print nota." action={<Link href={`/print/receipt/${transaction.id}?autoprint=1`}><Button><Printer className="h-4 w-4" />Print nota</Button></Link>} />
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <section className="rounded-lg border border-line bg-white p-4 shadow-subtle">
            <h2 className="text-base font-bold">Informasi Transaksi</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <Info label="Pelanggan" value={`${transaction.customer.name} - ${transaction.customer.phone}`} />
              <Info label="Kasir" value={transaction.cashier.name} />
              <Info label="Tanggal" value={formatDate(transaction.createdAt)} />
              <Info label="Pembayaran" value={paymentStatusLabel[transaction.paymentStatus]} />
              <Info label="Laundry" value={laundryStatusLabel[transaction.laundryStatus]} />
              <Info label="Estimasi selesai" value={transaction.estimatedDoneAt ? formatDate(transaction.estimatedDoneAt, "dd MMM yyyy") : "-"} />
            </div>
          </section>
          <section className="rounded-lg border border-line bg-white p-4 shadow-subtle">
            <h2 className="text-base font-bold">Item Laundry</h2>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.08em] text-muted"><tr><th className="py-2">Layanan</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead>
              <tbody className="divide-y divide-line">{transaction.items.map((item) => <tr key={item.id}><td className="py-3 font-semibold">{item.serviceName}</td><td>{item.quantity}</td><td>{formatRupiah(item.price)}</td><td className="font-bold">{formatRupiah(item.subtotal)}</td></tr>)}</tbody>
            </table>
          </section>
          <section className="rounded-lg border border-line bg-white p-4 shadow-subtle">
            <h2 className="text-base font-bold">Update Operasional</h2>
            <TransactionStatusActions transactionId={transaction.id} />
          </section>
          <TransactionPaymentActions transaction={transaction} />
        </div>
        <ReceiptPreview transaction={transaction} settings={settings} />
      </div>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs uppercase tracking-[0.08em] text-muted">{label}</p><p className="mt-1 font-bold text-ink">{value}</p></div>;
}
