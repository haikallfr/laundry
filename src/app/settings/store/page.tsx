export const dynamic = 'force-dynamic';

import { AppShell } from "@/components/layout/AppShell";
import { OwnerOnlyGuard } from "@/components/layout/RoleGuards";
import { StoreSettingsForm } from "@/components/forms/StoreSettingsForm";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { readStore } from "@/lib/store";

export default async function StoreSettingsPage() {
  const { settings } = await readStore();
  return (
    <OwnerOnlyGuard>
      <AppShell>
        <SectionHeader title="Pengaturan Toko" description="Informasi toko, pajak opsional, dan printer nota thermal." />
        <StoreSettingsForm settings={settings} />
      </AppShell>
    </OwnerOnlyGuard>
  );
}
