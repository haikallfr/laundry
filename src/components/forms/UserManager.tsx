"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Role, User, UserStatus } from "@/types";

const blank: Omit<User, "id"> = {
  name: "",
  email: "",
  phone: "",
  role: "CASHIER",
  status: "ACTIVE"
};

export function UserManager({ initialUsers }: { initialUsers: User[] }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState<Omit<User, "id">>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch(editingId ? `/api/users/${editingId}` : "/api/users", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const json = await response.json();
    if (editingId) setUsers((rows) => rows.map((row) => row.id === editingId ? { ...row, ...form, id: editingId } : row));
    else setUsers((rows) => [json.data, ...rows]);
    setEditingId(null);
    setForm(blank);
    setMessage("User berhasil disimpan.");
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    setUsers((rows) => rows.filter((row) => row.id !== id));
    router.refresh();
  }

  function edit(user: User) {
    setEditingId(user.id);
    setForm({ name: user.name, email: user.email, phone: user.phone, role: user.role, status: user.status });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
      <form onSubmit={save} className="rounded-lg border border-line bg-white p-4 shadow-subtle">
        <h2 className="text-base font-bold">{editingId ? "Edit user" : "Tambah user"}</h2>
        <div className="mt-4 grid gap-3">
          <label className="text-sm font-semibold">Nama<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1 h-10 w-full rounded-lg border border-line px-3" /></label>
          <label className="text-sm font-semibold">Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="mt-1 h-10 w-full rounded-lg border border-line px-3" /></label>
          <label className="text-sm font-semibold">HP<input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-line px-3" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold">Role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className="mt-1 h-10 w-full rounded-lg border border-line px-3"><option value="OWNER">Owner</option><option value="CASHIER">Kasir</option></select></label>
            <label className="text-sm font-semibold">Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as UserStatus })} className="mt-1 h-10 w-full rounded-lg border border-line px-3"><option value="ACTIVE">Aktif</option><option value="INACTIVE">Nonaktif</option></select></label>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button>{editingId ? "Simpan perubahan" : "Tambah user"}</Button>
          {editingId ? <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm(blank); }}>Batal</Button> : null}
        </div>
        {message ? <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      </form>
      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-subtle">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-muted"><tr><th className="px-4 py-3">Nama</th><th>Email</th><th>HP</th><th>Role</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody className="divide-y divide-line">{users.map((user) => <tr key={user.id}><td className="px-4 py-3 font-bold">{user.name}</td><td>{user.email}</td><td>{user.phone}</td><td>{user.role}</td><td><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">{user.status}</span></td><td className="space-x-2"><button className="font-semibold text-brand-700" onClick={() => edit(user)}>Edit</button><button className="font-semibold text-red-600" onClick={() => remove(user.id)}>Hapus</button></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
