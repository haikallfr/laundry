export const dynamic = 'force-dynamic';

import { AppShell } from "@/components/layout/AppShell";
import { TransactionTable } from "@/components/tables/TransactionTable";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { formatRupiah } from "@/lib/utils";
import { readCustomerDetailData } from "@/lib/store";
import { CustomerProfileForm } from "@/components/forms/CustomerProfileForm";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { customer, transactions: rows } = await readCustomerDetailData(id);
  if (!customer) return null;
  return (
    <AppShell>
      <SectionHeader title={customer.name} description={`${customer.phone} - ${customer.address || "Alamat belum diisi"}`} />
      <CustomerProfileForm customer={customer} />
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Box label="Total transaksi" value={String(rows.length)} />
        <Box label="Total omzet" value={formatRupiah(rows.reduce((s, trx) => s + trx.grandTotal, 0))} />
        <Box label="Piutang" value={formatRupiah(rows.reduce((s, trx) => s + Math.max(0, trx.grandTotal - trx.paidAmount), 0))} />
        <Box label="Catatan" value={customer.notes || "-"} />
      </div>
      <TransactionTable transactions={rows} />
    </AppShell>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-line bg-white p-4 shadow-subtle"><p className="text-sm text-muted">{label}</p><p className="mt-1 font-black text-ink">{value}</p></div>;
}
