"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, CreditCard, FileText, Home, ReceiptText, Settings, Shirt, UserCog, Users, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

const nav = [
  { href: "/dashboard-owner", label: "Dashboard Owner", icon: Home, ownerOnly: true },
  { href: "/cashier", label: "Kasir", icon: CreditCard },
  { href: "/laundry-management", label: "Kelola Laundry", icon: ClipboardList },
  { href: "/transactions", label: "Transaksi", icon: ReceiptText },
  { href: "/customers", label: "Pelanggan", icon: Users },
  { href: "/services", label: "Layanan", icon: Shirt, ownerOnly: true },
  { href: "/expenses", label: "Pengeluaran", icon: WalletCards, ownerOnly: true },
  { href: "/reports", label: "Laporan", icon: BarChart3, ownerOnly: true },
  { href: "/settings/store", label: "Info Toko", icon: Settings, ownerOnly: true },
  { href: "/settings/qris", label: "QRIS", icon: FileText, ownerOnly: true },
  { href: "/settings/users", label: "Kasir", icon: UserCog, ownerOnly: true }
];

export function Sidebar({ role = "OWNER", storeName = "LaundryPro", mobileOpen = false, onClose }: { role?: Role; storeName?: string; mobileOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const items = nav.filter((item) => role === "OWNER" || !item.ownerOnly);
  const initials = storeName.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "LP";
  return (
    <>
    {mobileOpen ? <button aria-label="Tutup menu" className="fixed inset-0 z-40 bg-slate-900/35 lg:hidden" onClick={onClose} /> : null}
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 w-72 shrink-0 border-r border-line bg-white px-4 py-5 transition-transform lg:static lg:z-auto lg:block lg:min-h-screen lg:w-64 lg:translate-x-0",
      mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
    )}>
      <Link href={role === "OWNER" ? "/dashboard-owner" : "/cashier"} className="flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-sm font-black text-white">{initials}</div>
        <div>
          <p className="max-w-40 truncate text-base font-bold text-ink">{storeName}</p>
          <p className="text-xs text-muted">POS Profesional</p>
        </div>
      </Link>
      <nav className="mt-8 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted transition hover:bg-slate-50 hover:text-ink",
                active && "bg-brand-50 text-brand-700"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
    </>
  );
}
