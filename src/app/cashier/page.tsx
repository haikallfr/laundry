export const dynamic = 'force-dynamic';

import { AppShell } from "@/components/layout/AppShell";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { currentUser } from "@/lib/auth";
import { readStore } from "@/lib/store";

export default async function CashierPage() {
  const { customers, services, settings, users } = await readStore();
  const user = await currentUser();
  return (
    <AppShell>
      <TransactionForm customers={customers} services={services} settings={settings} cashier={user ?? users[1]} />
    </AppShell>
  );
}
