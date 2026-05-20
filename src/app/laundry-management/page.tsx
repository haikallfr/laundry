export const dynamic = 'force-dynamic';

import { AppShell } from "@/components/layout/AppShell";
import { LaundryManagementBoard } from "@/components/tables/LaundryManagementBoard";
import { readTransactions } from "@/lib/store";

export default async function LaundryManagementPage() {
  const transactions = await readTransactions(500);
  return (
    <AppShell>
      <LaundryManagementBoard transactions={transactions} />
    </AppShell>
  );
}
