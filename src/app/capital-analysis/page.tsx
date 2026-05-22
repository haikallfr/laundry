export const dynamic = "force-dynamic";

import { AppShell } from "@/components/layout/AppShell";
import { OwnerOnlyGuard } from "@/components/layout/RoleGuards";
import { CapitalAnalysisTool } from "@/components/forms/CapitalAnalysisTool";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { readCapitalPlan, readExpenses, readServices } from "@/lib/store";

export default async function CapitalAnalysisPage() {
  const [capitalPlan, services, expenses] = await Promise.all([
    readCapitalPlan(),
    readServices(),
    readExpenses()
  ]);

  return (
    <OwnerOnlyGuard>
      <AppShell>
        <SectionHeader title="Analisis Modal dan BEP" description="Hitung modal awal, target balik modal, kebutuhan omzet, dan layanan yang paling masuk akal dikejar." />
        <CapitalAnalysisTool initialPlan={capitalPlan} services={services} expenses={expenses} />
      </AppShell>
    </OwnerOnlyGuard>
  );
}
