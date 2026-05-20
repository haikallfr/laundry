export const dynamic = 'force-dynamic';

import { AppShell } from "@/components/layout/AppShell";
import { OwnerOnlyGuard } from "@/components/layout/RoleGuards";
import { QrisSettingsClient } from "@/components/forms/QrisSettingsClient";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { readStore } from "@/lib/store";

export default async function QrisSettingsPage() {
  const { settings } = await readStore();
  return (
    <OwnerOnlyGuard>
      <AppShell>
        <SectionHeader title="Pengaturan QRIS" description="QRIS adalah gambar statis milik owner, bukan generate payment gateway." />
        <QrisSettingsClient settings={settings} />
      </AppShell>
    </OwnerOnlyGuard>
  );
}
