import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import type { Role } from "@/types";

export async function OwnerOnlyGuard({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/cashier");
  return children;
}

export async function RoleBasedRoute({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect("/cashier");
  return children;
}
