"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { formatDate, formatRupiah, paymentMethodLabel } from "@/lib/utils";
import type { Expense, PaymentMethod } from "@/types";

const categories = ["Gaji karyawan", "Listrik", "Air", "Deterjen", "Pewangi", "Plastik", "Sewa tempat", "Maintenance mesin"];
const newCategoryValue = "__NEW_CATEGORY__";
const savedCategoriesKey = "laundry_expense_categories";

export function ExpenseForm({ initialExpenses = [] }: { initialExpenses?: Expense[] }) {
  const router = useRouter();
  const [expenses, setExpenses] = useState(initialExpenses);
  const [amount, setAmount] = useState("");
  const [saved, setSaved] = useState(false);
  const [category, setCategory] = useState(categories[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [saveCustomCategory, setSaveCustomCategory] = useState(false);
  const [savedCategories, setSavedCategories] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [editingId, setEditingId] = useState<string | null>(null);
  const resetForm = () => {
    setEditingId(null);
    setAmount("");
    setDescription("");
    setCategory(categories[0]);
    setCustomCategory("");
    setSaveCustomCategory(false);
    setDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod("CASH");
  };
  function edit(expense: Expense) {
    setEditingId(expense.id);
    setAmount(String(expense.amount));
    setDescription(expense.description);
    if ([...categories, ...savedCategories].includes(expense.category)) {
      setCategory(expense.category);
      setCustomCategory("");
    } else {
      setCategory(newCategoryValue);
      setCustomCategory(expense.category);
    }
    setSaveCustomCategory(false);
    setDate(new Date(expense.date).toISOString().slice(0, 10));
    setPaymentMethod(expense.paymentMethod);
  }
  async function remove(id: string) {
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    setExpenses((rows) => rows.filter((row) => row.id !== id));
    setSaved(false);
    router.refresh();
  }
  useEffect(() => {
    const saved = window.localStorage.getItem(savedCategoriesKey);
    if (!saved) return;
    setSavedCategories(JSON.parse(saved).filter((item: unknown) => typeof item === "string" && item.trim()));
  }, []);
  const categoryOptions = [...categories, ...savedCategories.filter((item) => !categories.includes(item))];
  return (
    <div className="grid gap-3 xl:grid-cols-[420px_1fr] xl:gap-4">
      <form className="rounded-lg border border-line bg-white p-3 shadow-subtle sm:p-4" onSubmit={async (event) => {
        event.preventDefault();
        const finalCategory = category === newCategoryValue ? customCategory.trim() : category;
        if (category === newCategoryValue && saveCustomCategory && finalCategory && !categoryOptions.includes(finalCategory)) {
          const nextCategories = [...savedCategories, finalCategory];
          setSavedCategories(nextCategories);
          window.localStorage.setItem(savedCategoriesKey, JSON.stringify(nextCategories));
        }
        const payload = { date: new Date(date).toISOString(), category: finalCategory, description, amount: Number(amount || 0), paymentMethod, createdBy: "usr-owner" };
        const response = await fetch(editingId ? `/api/expenses/${editingId}` : "/api/expenses", {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const json = await response.json();
        if (editingId) setExpenses((rows) => rows.map((row) => row.id === editingId ? { ...row, ...payload, id: editingId } : row));
        else setExpenses((rows) => [json.data, ...rows]);
        setSaved(true);
        resetForm();
        router.refresh();
      }}>
        <h2 className="text-base font-bold text-ink">{editingId ? "Edit Pengeluaran" : "Catat Pengeluaran"}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3 md:grid-cols-2">
          <label className="text-xs font-semibold sm:text-sm">Tanggal<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-line px-2 text-xs sm:h-10 sm:px-3 sm:text-sm" /></label>
          <label className="text-xs font-semibold sm:text-sm">Kategori<select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-line px-2 text-xs sm:h-10 sm:px-3 sm:text-sm">{categoryOptions.map((cat) => <option key={cat} value={cat}>{cat}</option>)}<option value={newCategoryValue}>+ Kategori baru</option></select></label>
          {category === newCategoryValue ? <div className="col-span-2"><label className="flex items-center justify-between gap-3 text-xs font-semibold sm:text-sm"><span>Kategori baru</span><span className="inline-flex items-center gap-2 text-[11px] font-semibold text-muted sm:text-xs"><input type="checkbox" checked={saveCustomCategory} onChange={(e) => setSaveCustomCategory(e.target.checked)} className="h-4 w-4 rounded border-line" />Simpan ke list</span></label><input value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} required className="mt-1 h-9 w-full rounded-lg border border-line px-2 text-xs sm:h-10 sm:px-3 sm:text-sm" placeholder="Tulis kategori pengeluaran" /></div> : null}
          <label className="col-span-2 text-xs font-semibold sm:text-sm">Deskripsi<input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-line px-2 text-xs sm:h-10 sm:px-3 sm:text-sm" placeholder="Contoh: stok deterjen 25 kg" /></label>
          <label className="text-xs font-semibold sm:text-sm">Nominal<input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-line px-2 text-xs sm:h-10 sm:px-3 sm:text-sm" placeholder="Nominal" /></label>
          <label className="text-xs font-semibold sm:text-sm">Dibayar dengan<select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="mt-1 h-9 w-full rounded-lg border border-line px-2 text-xs sm:h-10 sm:px-3 sm:text-sm"><option value="CASH">Cash</option><option value="BANK_TRANSFER">Transfer</option><option value="QRIS">QRIS</option><option value="EWALLET">E-wallet</option></select></label>
          <label className="col-span-2 text-xs font-semibold sm:text-sm">Bukti foto<input type="file" accept="image/png,image/jpeg,image/webp" className="mt-1 block w-full rounded-lg border border-line px-3 py-2 text-xs sm:text-sm" /></label>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-xs text-muted sm:text-sm">Total: <strong className="text-ink">{formatRupiah(Number(amount || 0))}</strong></span>
          <div className="flex gap-2">
            {editingId ? <Button type="button" variant="secondary" onClick={resetForm}>Batal</Button> : null}
            <Button>{editingId ? "Simpan" : "Simpan Pengeluaran"}</Button>
          </div>
        </div>
        {saved ? <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">Pengeluaran berhasil disimpan.</p> : null}
      </form>
      <div className="space-y-2 md:hidden">
        {expenses.map((expense) => (
          <article key={expense.id} className="rounded-lg border border-line bg-white p-3 shadow-subtle">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-ink">{expense.category}</p>
                <p className="mt-0.5 text-xs text-muted">{formatDate(expense.date, "dd MMM yyyy")} - {paymentMethodLabel[expense.paymentMethod]}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{expense.description || "Tanpa deskripsi"}</p>
              </div>
              <strong className="shrink-0 text-right text-sm text-ink">{formatRupiah(expense.amount)}</strong>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="h-9 rounded-lg border border-line text-xs font-semibold text-brand-700" onClick={() => edit(expense)}>Edit</button>
              <button className="h-9 rounded-lg border border-red-100 bg-red-50 text-xs font-semibold text-red-600" onClick={() => remove(expense.id)}>Hapus</button>
            </div>
          </article>
        ))}
        {expenses.length === 0 ? <div className="rounded-lg border border-dashed border-line bg-white p-6 text-center text-sm text-muted">Belum ada pengeluaran.</div> : null}
      </div>
      <div className="hidden overflow-hidden rounded-lg border border-line bg-white shadow-subtle md:block">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-muted">
            <tr><th className="w-[24%] px-3 py-3">Tanggal</th><th className="px-3 py-3">Kategori</th><th className="hidden px-3 py-3 lg:table-cell">Deskripsi</th><th className="px-3 py-3">Nominal</th><th className="px-3 py-3 text-right">Aksi</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {expenses.map((expense) => (
              <tr key={expense.id} className="align-top hover:bg-slate-50">
                <td className="px-3 py-3">{formatDate(expense.date, "dd MMM yyyy")}</td>
                <td className="px-3 py-3"><div className="font-bold text-ink">{expense.category}</div><div className="text-xs text-muted lg:hidden">{expense.description}</div><div className="text-xs text-muted">{paymentMethodLabel[expense.paymentMethod]}</div></td>
                <td className="hidden px-3 py-3 lg:table-cell">{expense.description}</td>
                <td className="px-3 py-3 font-bold">{formatRupiah(expense.amount)}</td>
                <td className="px-3 py-3 text-right"><button className="font-semibold text-brand-700" onClick={() => edit(expense)}>Edit</button><span className="mx-1 text-line">/</span><button className="font-semibold text-red-600" onClick={() => remove(expense.id)}>Hapus</button></td>
              </tr>
            ))}
            {expenses.length === 0 ? <tr><td colSpan={5} className="px-3 py-8 text-center text-muted">Belum ada pengeluaran.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
