export const dynamic = 'force-dynamic';

import { AppShell } from "@/components/layout/AppShell";
import { CustomerList } from "@/components/tables/CustomerList";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { readCustomersData } from "@/lib/store";

export default async function CustomersPage() {
  const { customers, transactions } = await readCustomersData();
  return (
    <AppShell>
      <SectionHeader title="Pelanggan" description="Riwayat transaksi, omzet, repeat order, dan status piutang pelanggan." />
      <CustomerList customers={customers} transactions={transactions} />
    </AppShell>
  );
}
