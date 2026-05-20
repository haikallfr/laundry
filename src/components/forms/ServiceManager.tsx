"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ServiceTable } from "@/components/tables/ServiceTable";
import type { LaundryService, ServiceUnit } from "@/types";

const blank: Omit<LaundryService, "id"> = {
  name: "",
  category: "Reguler",
  unit: "KG",
  price: 0,
  cost: 0,
  estimatedDuration: "2 hari",
  isActive: true
};

export function ServiceManager({ initialServices }: { initialServices: LaundryService[] }) {
  const router = useRouter();
  const [services, setServices] = useState(initialServices);
  const [form, setForm] = useState<Omit<LaundryService, "id">>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const payload = { ...form, price: Number(form.price), cost: 0, isActive: Boolean(form.isActive) };
    const response = await fetch(editingId ? `/api/services/${editingId}` : "/api/services", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await response.json();
    if (editingId) setServices((rows) => rows.map((row) => row.id === editingId ? { ...row, ...payload, id: editingId } : row));
    else setServices((rows) => [json.data, ...rows]);
    setEditingId(null);
    setForm(blank);
    setMessage("Layanan berhasil disimpan.");
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/services/${id}`, { method: "DELETE" });
    setServices((rows) => rows.filter((row) => row.id !== id));
    setMessage("Layanan berhasil dihapus.");
    router.refresh();
  }

  function edit(service: LaundryService) {
    setEditingId(service.id);
    setForm({ name: service.name, category: service.category, unit: service.unit, price: service.price, cost: 0, estimatedDuration: service.estimatedDuration, isActive: service.isActive });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <form onSubmit={save} className="rounded-lg border border-line bg-white p-4 shadow-subtle">
        <h2 className="text-base font-bold text-ink">{editingId ? "Edit layanan" : "Tambah layanan"}</h2>
        <div className="mt-4 grid gap-3">
          <label className="text-sm font-semibold">Nama layanan<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1 h-10 w-full rounded-lg border border-line px-3" /></label>
          <label className="text-sm font-semibold">Kategori<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-line px-3" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold">Satuan<select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as ServiceUnit })} className="mt-1 h-10 w-full rounded-lg border border-line px-3"><option value="KG">Kg</option><option value="PCS">Pcs</option><option value="PACKAGE">Paket</option><option value="METER">Meter</option></select></label>
            <label className="text-sm font-semibold">Estimasi<input value={form.estimatedDuration} onChange={(e) => setForm({ ...form, estimatedDuration: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-line px-3" /></label>
          </div>
          <label className="text-sm font-semibold">Harga<input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="mt-1 h-10 w-full rounded-lg border border-line px-3" /></label>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />Aktif</label>
        </div>
        <div className="mt-4 flex gap-2">
          <Button>{editingId ? "Simpan perubahan" : "Tambah layanan"}</Button>
          {editingId ? <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm(blank); }}>Batal</Button> : null}
        </div>
        {message ? <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      </form>
      <div>
        <div className="mb-3 rounded-lg border border-line bg-white p-4 shadow-subtle">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-bold text-ink">Daftar layanan</h2>
              <p className="text-sm text-muted">{services.length} layanan tersimpan.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{services.filter((service) => service.isActive).length} aktif</span>
              <span className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-muted">{services.filter((service) => !service.isActive).length} nonaktif</span>
            </div>
          </div>
        </div>
        <ServiceTable services={services} onEdit={edit} onDelete={remove} />
      </div>
    </div>
  );
}
