"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { StoreSettings } from "@/types";

export function StoreSettingsForm({ settings }: { settings: StoreSettings }) {
  const router = useRouter();
  const [form, setForm] = useState(settings);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/settings/store", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, receiptWidth: Number(form.receiptWidth), taxRate: Number(form.taxRate) })
    });
    setSaving(false);
    if (!response.ok) {
      setMessage("Gagal menyimpan pengaturan.");
      return;
    }
    setMessage("Pengaturan toko berhasil disimpan.");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="max-w-3xl rounded-lg border border-line bg-white p-4 shadow-subtle">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold">Nama toko<input value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-line px-3" /></label>
        <label className="text-sm font-semibold">WhatsApp<input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-line px-3" /></label>
        <label className="text-sm font-semibold md:col-span-2">Alamat<textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1 min-h-24 w-full rounded-lg border border-line px-3 py-2" /></label>
        <label className="text-sm font-semibold">Ukuran nota<select value={form.receiptWidth} onChange={(e) => setForm({ ...form, receiptWidth: Number(e.target.value) as 58 | 80 })} className="mt-1 h-10 w-full rounded-lg border border-line px-3"><option value="58">58mm</option><option value="80">80mm</option></select></label>
        <label className="text-sm font-semibold">Pajak (%)<input value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })} type="number" className="mt-1 h-10 w-full rounded-lg border border-line px-3" /></label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button disabled={saving}>{saving ? "Menyimpan..." : "Simpan pengaturan"}</Button>
        {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
      </div>
    </form>
  );
}
