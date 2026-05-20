export const dynamic = 'force-dynamic';

import { AppShell } from "@/components/layout/AppShell";
import { OwnerOnlyGuard } from "@/components/layout/RoleGuards";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { UserManager } from "@/components/forms/UserManager";
import { readStore } from "@/lib/store";

export default async function UsersSettingsPage() {
  const { users } = await readStore();
  return (
    <OwnerOnlyGuard>
      <AppShell>
        <SectionHeader title="Manajemen Kasir" description="Owner mengelola akun owner dan kasir beserta status aktif." />
        <UserManager initialUsers={users} />
      </AppShell>
    </OwnerOnlyGuard>
  );
}
