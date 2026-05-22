"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatRupiah } from "@/lib/utils";
import type { CapitalItem, CapitalPlan, Expense, LaundryService } from "@/types";

const categories = ["Mesin", "Renovasi", "Inventaris", "Stok awal", "Lainnya"];
const fixedCostKeywords = ["gaji", "sewa", "listrik", "air", "gas", "wifi", "internet", "aplikasi", "penyusutan", "maintenance", "servis", "perawatan"];
const materialKeywords = ["deterjen", "pewangi", "parfum", "plastik", "packing", "label", "nota", "bahan"];

export function CapitalAnalysisTool({ initialPlan, services, expenses }: { initialPlan: CapitalPlan; services: LaundryService[]; expenses: Expense[] }) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [capitalOpen, setCapitalOpen] = useState(false);
  const [hppOpen, setHppOpen] = useState(false);
  const [monthlyCostOpen, setMonthlyCostOpen] = useState(false);
  const [marginOpen, setMarginOpen] = useState(false);
  const analysis = useMemo(() => calculateFinancials(plan, services, expenses), [plan, services, expenses]);
  const primaryServiceId = plan.assumptions.primaryServiceId || analysis.primaryService?.id || "";

  function updateItem(id: string, patch: Partial<CapitalItem>) {
    setPlan((current) => ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  }

function addItem() {
    setPlan((current) => ({
      ...current,
      items: [{ id: `cap-${Date.now()}`, name: "", category: "Mesin", amount: 0, quantity: 1, purchasedAt: new Date().toISOString() }, ...current.items]
    }));
  }

  function updateAssumption(key: "targetDailyVolume" | "workingDaysPerMonth", value: number) {
    setPlan((current) => ({ ...current, assumptions: { ...current.assumptions, [key]: value } }));
  }

  function updatePrimaryService(serviceId: string) {
    setPlan((current) => ({ ...current, assumptions: { ...current.assumptions, primaryServiceId: serviceId } }));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/settings/capital", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan)
    });
    setSaving(false);
    setMessage(response.ok ? "Tersimpan." : "Gagal menyimpan.");
    if (response.ok) router.refresh();
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <section className="rounded-lg border border-line bg-white p-4 shadow-subtle">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-ink">Modal Awal</h2>
              <p className="text-sm font-semibold text-muted">{formatRupiah(analysis.totalCapital)}</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setCapitalOpen((current) => !current)}>{capitalOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}{capitalOpen ? "Tutup" : "Buka"}</Button>
              {capitalOpen ? <Button type="button" variant="secondary" onClick={addItem}><Plus className="h-4 w-4" />Tambah</Button> : null}
              <Button type="button" onClick={save} disabled={saving}><Save className="h-4 w-4" />{saving ? "Simpan..." : "Simpan"}</Button>
            </div>
          </div>
          {message ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
          {capitalOpen ? <div className="mt-4 space-y-2">
            {plan.items.map((item) => (
              <div key={item.id} className="grid gap-2 rounded-lg border border-line bg-slate-50 p-3 grid-cols-1 sm:grid-cols-[minmax(0,1fr)_100px_80px_110px_110px_36px]">
                <input value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value })} className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm" placeholder="Contoh: Mesin cuci" />
                <select value={item.category} onChange={(event) => updateItem(item.id, { category: event.target.value })} className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm">
                  {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
                <input type="number" min="1" value={item.quantity || ""} onChange={(event) => updateItem(item.id, { quantity: Number(event.target.value || 1) })} className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm" placeholder="Jumlah" />
                <CurrencyInput value={item.amount} onChange={(value) => updateItem(item.id, { amount: value })} placeholder="Harga satuan" />
                <div className="flex h-10 items-center rounded-lg border border-line bg-white px-3 text-sm font-bold text-ink">{formatRupiah(Number(item.amount || 0) * Number(item.quantity || 1))}</div>
                <button type="button" aria-label="Hapus" onClick={() => setPlan((current) => ({ ...current, items: current.items.filter((row) => row.id !== item.id) }))} className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div> : null}
        </section>

        <section className="rounded-lg border border-line bg-white p-4 shadow-subtle">
          <div className="space-y-3">
            <div className="min-w-0 rounded-lg bg-slate-50 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-ink">HPP</h2>
                  <p className="text-sm font-semibold text-muted">{formatRupiah(analysis.materialHppPerUnit)}</p>
                </div>
                <Button type="button" variant="secondary" onClick={() => setHppOpen((current) => !current)}>{hppOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}{hppOpen ? "Tutup" : "Buka"}</Button>
              </div>
              {hppOpen ? <div className="mt-2 overflow-hidden rounded-lg bg-white">
                <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-2 border-b border-line px-3 py-2 text-xs font-bold uppercase tracking-[0.06em] text-muted">
                  <span>Bahan</span>
                  <span className="text-right">HPP</span>
                </div>
                <div className="divide-y divide-line">
                  {analysis.materialRows.map((row) => (
                    <div key={row.category} className="grid grid-cols-[minmax(0,1fr)_140px] gap-2 px-3 py-2 text-sm">
                      <span className="min-w-0 break-words font-bold text-ink">{row.category}</span>
                      <span className="text-right font-bold text-ink">{formatRupiah(row.costPerKg)}</span>
                    </div>
                  ))}
                  {analysis.materialRows.length === 0 ? <div className="px-3 py-4 text-sm text-muted">Belum ada pengeluaran bahan yang bisa dihitung.</div> : null}
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-2 border-t border-line bg-slate-50 px-3 py-2 text-sm font-black text-ink">
                  <span>Total HPP bahan</span>
                  <span className="text-right">{formatRupiah(analysis.materialHppPerUnit)}</span>
                </div>
              </div> : null}
            </div>

            <div className="min-w-0 rounded-lg bg-slate-50 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-ink">Biaya Bulanan</h2>
                  <p className="text-sm font-semibold text-muted">Total {formatRupiah(analysis.monthlyFixedCost)} - HPP {formatRupiah(analysis.fixedCostPerUnit)}</p>
                </div>
                <Button type="button" variant="secondary" onClick={() => setMonthlyCostOpen((current) => !current)}>{monthlyCostOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}{monthlyCostOpen ? "Tutup" : "Buka"}</Button>
              </div>
              {monthlyCostOpen ? <div className="mt-2 overflow-hidden rounded-lg bg-white">
                <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-2 border-b border-line px-3 py-2 text-xs font-bold uppercase tracking-[0.06em] text-muted">
                  <span>Kategori</span>
                  <span className="text-right">Nominal</span>
                </div>
                <div className="divide-y divide-line">
                  {analysis.fixedExpenses.map((expense) => (
                    <div key={expense.id} className="grid grid-cols-[minmax(0,1fr)_140px] gap-2 px-3 py-2 text-sm">
                      <span className="min-w-0 break-words font-bold text-ink">{expense.category}</span>
                      <span className="text-right font-bold text-ink">{formatRupiah(expense.amount)}</span>
                    </div>
                  ))}
                  {analysis.fixedExpenses.length === 0 ? <div className="px-3 py-4 text-sm text-muted">Belum ada pengeluaran tetap bulan ini.</div> : null}
                </div>
                <div className="border-t border-line bg-slate-50">
                  <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-2 px-3 py-2 text-sm font-black text-ink">
                    <span>Total biaya bulanan</span>
                    <span className="text-right">{formatRupiah(analysis.monthlyFixedCost)}</span>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-2 px-3 pb-2 text-sm font-black text-ink">
                    <span>HPP biaya bulanan</span>
                    <span className="text-right">{formatRupiah(analysis.fixedCostPerUnit)}</span>
                  </div>
                </div>
              </div> : null}
            </div>

            <div className="min-w-0 rounded-lg bg-slate-50 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-ink">Margin Layanan</h2>
                  <p className="text-sm font-semibold text-muted">Margin utama {formatRupiah(analysis.marginPerUnit)}</p>
                </div>
                <Button type="button" variant="secondary" onClick={() => setMarginOpen((current) => !current)}>{marginOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}{marginOpen ? "Tutup" : "Buka"}</Button>
              </div>
              {marginOpen ? <div className="mt-2 overflow-hidden rounded-lg bg-white">
                <div className="grid grid-cols-[minmax(0,1fr)_110px_110px_120px] gap-2 border-b border-line px-3 py-2 text-xs font-bold uppercase tracking-[0.06em] text-muted">
                  <span>Layanan</span>
                  <span className="text-right">Harga</span>
                  <span className="text-right">HPP</span>
                  <span className="text-right">Margin</span>
                </div>
                <div className="divide-y divide-line">
                {analysis.serviceMargins.map((service) => (
                  <div key={service.id} className="grid grid-cols-[minmax(0,1fr)_110px_110px_120px] gap-2 px-3 py-2 text-sm">
                    <span className="min-w-0 break-words font-bold text-ink">{service.name}</span>
                    <span className="text-right text-ink">{formatRupiah(service.price)}</span>
                    <span className="text-right text-ink">{formatRupiah(analysis.hppPerUnit)}</span>
                    <span className="text-right font-bold text-ink">{formatRupiah(service.margin)}</span>
                  </div>
                ))}
                </div>
              </div> : null}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-4 shadow-subtle">
          <h2 className="text-base font-bold text-ink">Target Operasional</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="text-sm font-semibold text-ink">
              Layanan utama
              <select value={primaryServiceId} onChange={(event) => updatePrimaryService(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line px-3">
                {services.filter((service) => service.isActive && service.price > 0).map((service) => (
                  <option key={service.id} value={service.id}>{service.name} - {formatRupiah(service.price)}</option>
                ))}
              </select>
            </label>
            <NumberField label="Target kg / hari" value={plan.assumptions.targetDailyVolume} onChange={(value) => updateAssumption("targetDailyVolume", value)} />
            <NumberField label="Hari kerja / bulan" value={plan.assumptions.workingDaysPerMonth} onChange={(value) => updateAssumption("workingDaysPerMonth", value)} />
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <SmallResult label="Harga jual dari layanan" value={formatRupiah(analysis.sellingPrice)} />
            <SmallResult label="Margin / kg" value={formatRupiah(analysis.marginPerUnit)} />
            <SmallResult label="Margin %" value={`${analysis.marginPercent.toFixed(1)}%`} />
          </div>
        </section>
      </div>

      <aside className="space-y-3">
        <Metric title="Total modal awal" value={formatRupiah(analysis.totalCapital)} />
        <Metric title="Omzet" value={formatRupiah(analysis.monthlyRevenueTarget)} detail={`${analysis.monthlyVolume.toLocaleString("id-ID")} kg`} />
        <Metric title="HPP Bahan" value={formatRupiah(analysis.materialHppPerUnit)} />
        <Metric title="HPP Biaya Tetap" value={formatRupiah(analysis.fixedCostPerUnit)} />
        <Metric title="HPP" value={formatRupiah(analysis.hppPerUnit)} detail={`${analysis.hppPercent.toFixed(1)}%`} />
        <Metric title="Laba Bersih" value={formatRupiah(analysis.monthlyNetProfit)} tone={analysis.monthlyNetProfit <= 0 ? "red" : "green"} />
        <Metric title="Balik Modal" value={analysis.monthsToBreakEven === Infinity ? "Belum bisa" : `${analysis.monthsToBreakEven.toFixed(1)} bulan`} tone={analysis.monthlyNetProfit <= 0 ? "red" : "slate"} />
        <section className="rounded-lg border border-line bg-white p-4 shadow-subtle">
          <h2 className="text-base font-bold text-ink">Layanan Prioritas</h2>
          <div className="mt-3 space-y-2">
            {analysis.serviceMargins.slice(0, 3).map((service, index) => (
              <div key={service.id} className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-sm font-bold text-ink">{index + 1}. {service.name}</p>
                <p className="text-xs text-muted">Margin {formatRupiah(service.margin)} / {service.unit.toLowerCase()}</p>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="text-sm font-semibold text-ink">
      {label}
      <input type="number" value={value || ""} onChange={(event) => onChange(Number(event.target.value || 0))} className="mt-1 h-10 w-full rounded-lg border border-line px-3" />
    </label>
  );
}

function CurrencyInput({ value, onChange, placeholder }: { value: number; onChange: (value: number) => void; placeholder: string }) {
  return (
    <input
      inputMode="numeric"
      value={formatNumberInput(value)}
      onChange={(event) => onChange(parseNumberInput(event.target.value))}
      className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm"
      placeholder={placeholder}
    />
  );
}

function SmallResult({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 px-3 py-2"><p className="text-xs text-muted">{label}</p><p className="font-black text-ink">{value}</p></div>;
}

function MiniMetric({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-[120px] flex-1 rounded-lg bg-white px-2 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">{label}</p>
      <p className={`mt-1 break-words text-xs ${strong ? "font-black text-ink" : "font-bold text-ink"}`}>{value}</p>
    </div>
  );
}

function Metric({ title, value, detail, tone = "slate" }: { title: string; value: string; detail?: string; tone?: "green" | "red" | "slate" }) {
  const toneClass = tone === "green" ? "text-emerald-700" : tone === "red" ? "text-red-700" : "text-ink";
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-subtle">
      <p className="text-xs font-semibold text-muted">{title}</p>
      <p className={`mt-1 text-xl font-black ${toneClass}`}>{value}</p>
      {detail ? <p className="mt-1 text-xs text-muted">{detail}</p> : null}
    </section>
  );
}

function calculateFinancials(plan: CapitalPlan, services: LaundryService[], expenses: Expense[]) {
  const activeServices = services.filter((service) => service.isActive && service.price > 0);
  const primaryService = activeServices.find((service) => service.id === plan.assumptions.primaryServiceId) ?? activeServices.find((service) => service.unit === "KG") ?? activeServices[0];
  const totalCapital = plan.items.reduce((sum, item) => sum + (Number(item.amount || 0) * Number(item.quantity || 1)), 0);
  const materialSummary = calculateMaterialSummary(expenses);
  const materialHppPerUnit = materialSummary.hppPerKg;
  const fixedExpenses = getCurrentMonthFixedExpenses(expenses);
  const monthlyFixedCost = fixedExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const sellingPrice = Number(primaryService?.price || 0);
  const targetDailyVolume = Number(plan.assumptions.targetDailyVolume || 0);
  const workingDaysPerMonth = Number(plan.assumptions.workingDaysPerMonth || 0);
  const monthlyVolume = targetDailyVolume * workingDaysPerMonth;
  const fixedCostPerUnit = monthlyVolume > 0 ? monthlyFixedCost / monthlyVolume : 0;
  const hppPerUnit = materialHppPerUnit + fixedCostPerUnit;
  const marginPerUnit = sellingPrice - hppPerUnit;
  const hppPercent = sellingPrice > 0 ? (hppPerUnit / sellingPrice) * 100 : 0;
  const marginPercent = sellingPrice > 0 ? (marginPerUnit / sellingPrice) * 100 : 0;
  const monthlyRevenueTarget = monthlyVolume * sellingPrice;
  const monthlyGrossProfit = (sellingPrice - materialHppPerUnit) * monthlyVolume;
  const monthlyNetProfit = marginPerUnit * monthlyVolume;
  const monthsToBreakEven = monthlyNetProfit > 0 ? totalCapital / monthlyNetProfit : Infinity;

  return {
    primaryService,
    totalCapital,
    materialHppPerUnit,
    hppPerUnit,
    materialRows: materialSummary.rows,
    fixedExpenses,
    monthlyFixedCost,
    fixedCostPerUnit,
    sellingPrice,
    marginPerUnit,
    hppPercent,
    marginPercent,
    monthlyVolume,
    monthlyRevenueTarget,
    monthlyGrossProfit,
    monthlyNetProfit,
    monthsToBreakEven,
    serviceMargins: activeServices
      .map((service) => {
        const margin = service.price - hppPerUnit;
        return {
          id: service.id,
          name: service.name,
          unit: service.unit,
          price: service.price,
          margin,
          marginPercent: service.price > 0 ? (margin / service.price) * 100 : 0
        };
      })
      .sort((a, b) => b.margin - a.margin)
  };
}

function parseNumberInput(value: string) {
  return Number(value.replace(/\D/g, "") || 0);
}

function formatNumberInput(value: number) {
  return value ? value.toLocaleString("id-ID") : "";
}

function calculateMaterialSummary(expenses: Expense[]) {
  const grouped = new Map<string, { totalCost: number; coverage: number }>();
  for (const expense of expenses) {
    if (expense.amount <= 0 || !expense.materialCoverageKg || expense.materialCoverageKg <= 0) continue;
    const text = `${expense.category} ${expense.description}`.toLowerCase();
    if (!materialKeywords.some((keyword) => text.includes(keyword))) continue;
    const current = grouped.get(expense.category) ?? { totalCost: 0, coverage: 0 };
    current.totalCost += expense.amount;
    current.coverage += expense.materialCoverageKg;
    grouped.set(expense.category, current);
  }

  const rows = Array.from(grouped.entries()).map(([category, value]) => ({
    category,
    costPerKg: value.coverage > 0 ? value.totalCost / value.coverage : 0
  }));

  return {
    rows,
    hppPerKg: rows.reduce((sum, row) => sum + row.costPerKg, 0)
  };
}

function getCurrentMonthFixedExpenses(expenses: Expense[]) {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  return expenses.filter((expense) => {
    const date = new Date(expense.date);
    if (date.getMonth() !== month || date.getFullYear() !== year) return false;
    const text = `${expense.category} ${expense.description}`.toLowerCase();
    return fixedCostKeywords.some((keyword) => text.includes(keyword));
  });
}
