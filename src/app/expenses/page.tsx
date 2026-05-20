export const dynamic = 'force-dynamic';

import { AppShell } from "@/components/layout/AppShell";
import { OwnerOnlyGuard } from "@/components/layout/RoleGuards";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { readExpenses } from "@/lib/store";

export default async function ExpensesPage() {
  const expenses = await readExpenses();
  return (
    <OwnerOnlyGuard>
      <AppShell>
        <SectionHeader title="Pengeluaran" description="Pengeluaran otomatis masuk ke laporan laba rugi dan cashflow." />
        <ExpenseForm initialExpenses={expenses} />
      </AppShell>
    </OwnerOnlyGuard>
  );
}
