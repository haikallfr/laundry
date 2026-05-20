"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Customer } from "@/types";

export function CustomerProfileForm({ customer }: { customer: Customer }) {
  const router = useRouter();
  const [form, setForm] = useState(customer);
  const [message, setMessage] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch(`/api/customers/${customer.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone,
        address: form.address,
        notes: form.notes
      })
    });
    setMessage(response.ok ? "Data pelanggan berhasil disimpan." : "Gagal menyimpan pelanggan.");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="mb-4 rounded-lg border border-line bg-white p-4 shadow-subtle">
      <h2 className="text-base font-bold text-ink">Edit Data Pelanggan</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-sm font-semibold">Nama<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-line px-3" /></label>
        <label className="text-sm font-semibold">Nomor HP<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-line px-3" /></label>
        <label className="text-sm font-semibold">Alamat<input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-line px-3" /></label>
        <label className="text-sm font-semibold">Catatan<input value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-line px-3" /></label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button>Simpan pelanggan</Button>
        {message ? <span className="text-sm font-semibold text-emerald-700">{message}</span> : null}
      </div>
    </form>
  );
}
