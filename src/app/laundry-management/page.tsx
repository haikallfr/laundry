export const dynamic = 'force-dynamic';

import { AppShell } from "@/components/layout/AppShell";
import { LaundryManagementBoard } from "@/components/tables/LaundryManagementBoard";
import { readSettings, readTransactions } from "@/lib/store";

export default async function LaundryManagementPage() {
  const [settings, transactions] = await Promise.all([readSettings(), readTransactions(500)]);
  return (
    <AppShell>
      <LaundryManagementBoard transactions={transactions} settings={settings} />
    </AppShell>
  );
}
