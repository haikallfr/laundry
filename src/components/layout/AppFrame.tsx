"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import type { AppNotification } from "@/lib/notifications";
import type { Role, User } from "@/types";

export function AppFrame({ children, role, storeName, user, notifications }: { children: React.ReactNode; role: Role; storeName: string; user: User; notifications: AppNotification[] }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-[#f6f8fb]">
      <Sidebar role={role} storeName={storeName} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-w-0 flex-1">
        <Topbar user={user} storeName={storeName} notifications={notifications} onMenu={() => setSidebarOpen(true)} />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
