export const dynamic = 'force-dynamic';

import { AppShell } from "@/components/layout/AppShell";
import { LaundryManagementBoard } from "@/components/tables/LaundryManagementBoard";
import { readStore } from "@/lib/store";

export default async function LaundryManagementPage() {
  const { transactions } = await readStore();
  return (
    <AppShell>
      <LaundryManagementBoard transactions={transactions} />
    </AppShell>
  );
}
