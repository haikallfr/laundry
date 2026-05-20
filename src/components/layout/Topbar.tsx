"use client";

import Link from "next/link";
import { AlertTriangle, Bell, CheckCircle2, Clock3, CreditCard, LogOut, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import type { AppNotification, NotificationTone } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

export function Topbar({ user, storeName = "LaundryPro", notifications = [], onMenu }: { user: User; storeName?: string; notifications?: AppNotification[]; onMenu?: () => void }) {
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const actionableCount = notifications.filter((item) => item.tone !== "slate").length;
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    if (query.trim()) window.location.href = `/transactions?q=${encodeURIComponent(query.trim())}`;
  }

  function runNotificationAction(href: string) {
    setNotificationOpen(false);
    if (href.startsWith("https://wa.me")) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    window.location.href = href;
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/95 px-4 py-3 backdrop-blur lg:px-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="secondary" size="sm" className="shrink-0 lg:hidden" aria-label="Buka menu" onClick={onMenu}><Menu className="h-4 w-4" /></Button>
        <div className="flex min-w-0 items-center gap-2 lg:hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-xs font-black text-white">
            {storeName.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "LP"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-ink">{storeName}</p>
            <p className="text-xs text-muted">POS</p>
          </div>
        </div>
        <form onSubmit={submitSearch} className="relative hidden w-full max-w-xl md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="h-10 w-full rounded-lg border border-line bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-brand-500 focus:bg-white" placeholder="Cari nota, pelanggan, nomor HP, layanan..." />
        </form>
        <div className="ml-auto flex items-center gap-2">
          {notice ? <span className="hidden rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 lg:inline">{notice}</span> : null}
          <ThemeToggle onChange={(nextDark) => setNotice(nextDark ? "Dark mode aktif." : "Dark mode nonaktif.")} />
          <div className="relative">
            <Button variant="secondary" size="sm" aria-label="Notifikasi" onClick={() => setNotificationOpen((current) => !current)}>
              <span className="relative">
                <Bell className="h-4 w-4" />
                {actionableCount ? <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black leading-none text-white">{actionableCount > 9 ? "9+" : actionableCount}</span> : null}
              </span>
            </Button>
            {notificationOpen ? (
              <div className="fixed inset-x-3 top-[72px] z-50 flex max-h-[calc(100dvh-88px)] flex-col overflow-hidden rounded-xl border border-line bg-white shadow-xl sm:absolute sm:inset-auto sm:right-0 sm:top-12 sm:max-h-[min(70vh,640px)] sm:w-[420px] sm:max-w-[420px]">
                <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
                  <div>
                    <h2 className="text-sm font-black text-ink">Notifikasi</h2>
                    <p className="text-xs text-muted">{actionableCount ? `${actionableCount} perlu tindakan` : "Tidak ada tindakan mendesak"}</p>
                  </div>
                  <button className="rounded-lg p-1 text-muted hover:bg-slate-100 hover:text-ink" aria-label="Tutup notifikasi" onClick={() => setNotificationOpen(false)}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                  {notifications.length ? (
                    notifications.map((item) => (
                      <div key={item.id} className="rounded-lg p-2 transition hover:bg-slate-50">
                        <div className="flex gap-2 sm:gap-3">
                          <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", notificationToneClass[item.tone])}>
                            <NotificationIcon tone={item.tone} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <Link href={item.href} onClick={() => setNotificationOpen(false)} className="block break-words text-sm font-black leading-snug text-ink hover:text-brand-700 hover:underline">{item.title}</Link>
                            <p className="mt-1 break-words text-xs leading-relaxed text-muted">{item.description}</p>
                            <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                              <Link href={item.href} onClick={() => setNotificationOpen(false)} className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-white px-3 text-xs font-semibold text-ink hover:bg-slate-50 sm:h-8">Detail</Link>
                              {item.actionHref && item.actionLabel ? (
                                <button type="button" onClick={() => runNotificationAction(item.actionHref!)} className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-700 sm:h-8">
                                  {item.actionLabel}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-line bg-slate-50 p-6 text-center">
                      <Bell className="mx-auto h-8 w-8 text-muted" />
                      <p className="mt-2 text-sm font-bold text-ink">Belum ada notifikasi</p>
                      <p className="text-xs text-muted">Status laundry dan pembayaran masih aman.</p>
                    </div>
                  )}
                </div>
                <div className="shrink-0 border-t border-line bg-slate-50 px-4 py-3">
                  <Link href="/laundry-management" onClick={() => setNotificationOpen(false)} className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-line bg-white text-xs font-bold text-brand-700 hover:bg-slate-50 sm:h-auto sm:w-auto sm:border-0 sm:bg-transparent sm:hover:bg-transparent sm:hover:underline">Buka Kelola Laundry</Link>
                </div>
              </div>
            ) : null}
          </div>
          <div className="hidden rounded-lg border border-line px-3 py-1.5 sm:block">
            <p className="text-sm font-bold text-ink">{user.name}</p>
            <p className="text-xs text-muted">{user.role === "OWNER" ? "Owner" : "Kasir"}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4" />Keluar</Button>
        </div>
      </div>
    </header>
  );
}

const notificationToneClass: Record<NotificationTone, string> = {
  amber: "bg-amber-50 text-amber-700",
  blue: "bg-blue-50 text-blue-700",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
  slate: "bg-slate-100 text-slate-700"
};

function NotificationIcon({ tone }: { tone: NotificationTone }) {
  if (tone === "green") return <CheckCircle2 className="h-4 w-4" />;
  if (tone === "amber") return <CreditCard className="h-4 w-4" />;
  if (tone === "red") return <AlertTriangle className="h-4 w-4" />;
  if (tone === "blue") return <Clock3 className="h-4 w-4" />;
  return <Bell className="h-4 w-4" />;
}
