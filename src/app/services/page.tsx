export const dynamic = 'force-dynamic';

import { AppShell } from "@/components/layout/AppShell";
import { OwnerOnlyGuard } from "@/components/layout/RoleGuards";
import { ServiceManager } from "@/components/forms/ServiceManager";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { readServices } from "@/lib/store";

export default async function ServicesPage() {
  const services = await readServices();
  return (
    <OwnerOnlyGuard>
      <AppShell>
        <SectionHeader title="Layanan dan Harga" description="Atur satuan kg, pcs, paket, meter, harga dasar, estimasi selesai, dan status aktif. Biaya operasional dicatat di pengeluaran." />
        <ServiceManager initialServices={services} />
      </AppShell>
    </OwnerOnlyGuard>
  );
}
