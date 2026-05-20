export const dynamic = 'force-dynamic';

import { AppShell } from "@/components/layout/AppShell";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { readTransactions } from "@/lib/store";
import { TransactionList } from "@/components/tables/TransactionList";

export default async function TransactionsPage() {
  const transactions = await readTransactions(500);
  return (
    <AppShell>
      <SectionHeader title="Transaksi" description="Cari nota, filter status laundry, metode pembayaran, dan re-print nota." />
      <TransactionList transactions={transactions} />
    </AppShell>
  );
}
