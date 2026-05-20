import { redirect } from "next/navigation";
import { AppFrame } from "@/components/layout/AppFrame";
import { currentUser } from "@/lib/auth";
import { buildNotifications } from "@/lib/notifications";
import { readShellData } from "@/lib/store";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { settings, transactions } = await readShellData(user);
  const notifications = buildNotifications(transactions, user);
  return (
    <AppFrame role={user.role} storeName={settings.storeName} user={user} notifications={notifications}>
      {children}
    </AppFrame>
  );
}
