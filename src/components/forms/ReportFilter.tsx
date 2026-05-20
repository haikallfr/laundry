"use client";

import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function ReportFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [start, setStart] = useState(searchParams.get("start") ?? "");
  const [end, setEnd] = useState(searchParams.get("end") ?? "");
  const active = searchParams.get("period") ?? (start || end ? "custom" : "month");

  const periods = [
    { label: "Hari ini", shortLabel: "Hari", value: "today" },
    { label: "Kemarin", shortLabel: "Kemarin", value: "yesterday" },
    { label: "7 hari", shortLabel: "7 hr", value: "7d" },
    { label: "Bulan ini", shortLabel: "Bulan", value: "month" },
    { label: "Bulan lalu", shortLabel: "Bulan lalu", value: "lastMonth" },
    { label: "Tahun ini", shortLabel: "Tahun", value: "year" }
  ];

  function updatePeriod(period: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    params.delete("start");
    params.delete("end");
    setStart("");
    setEnd("");
    router.push(`${pathname}?${params.toString()}`);
  }

  function applyCustom() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", "custom");
    if (start) params.set("start", start);
    else params.delete("start");
    if (end) params.set("end", end);
    else params.delete("end");
    router.push(`${pathname}?${params.toString()}`);
  }

  function exportReport(format: "pdf" | "xlsx") {
    const params = new URLSearchParams({ format });
    const currentPeriod = searchParams.get("period");
    const currentStart = searchParams.get("start");
    const currentEnd = searchParams.get("end");
    if (currentPeriod) params.set("period", currentPeriod);
    if (currentStart) params.set("start", currentStart);
    if (currentEnd) params.set("end", currentEnd);
    window.location.href = `/api/reports/export?${params.toString()}`;
  }
  return (
    <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto]">
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 2xl:grid-cols-6">
          {periods.map((period) => (
            <button key={period.value} onClick={() => updatePeriod(period.value)} className={`h-8 min-w-0 rounded-lg border px-1.5 text-[11px] font-semibold transition sm:h-10 sm:px-3 sm:text-sm ${active === period.value ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line bg-white text-muted hover:bg-slate-50 hover:text-ink"}`}><span className="sm:hidden">{period.shortLabel}</span><span className="hidden sm:inline">{period.label}</span></button>
          ))}
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-1.5 sm:gap-2">
          <input aria-label="Tanggal mulai" value={start} onChange={(e) => setStart(e.target.value)} type="date" className="h-9 min-w-0 rounded-lg border border-line bg-white px-2 text-xs outline-none focus:border-brand-500 sm:h-10 sm:px-3 sm:text-sm" />
          <input aria-label="Tanggal akhir" value={end} onChange={(e) => setEnd(e.target.value)} type="date" className="h-9 min-w-0 rounded-lg border border-line bg-white px-2 text-xs outline-none focus:border-brand-500 sm:h-10 sm:px-3 sm:text-sm" />
          <Button className="h-9 px-2 text-xs sm:h-10 sm:px-3 sm:text-sm" variant={active === "custom" ? "primary" : "secondary"} onClick={applyCustom}>Custom</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 xl:flex xl:justify-end">
        <Button className="h-9 w-full whitespace-nowrap px-3 text-xs sm:h-10 sm:text-sm xl:w-auto" variant="secondary" onClick={() => exportReport("pdf")}><FileText className="h-4 w-4" />PDF</Button>
        <Button className="h-9 w-full whitespace-nowrap px-3 text-xs sm:h-10 sm:text-sm xl:w-auto" variant="secondary" onClick={() => exportReport("xlsx")}><FileSpreadsheet className="h-4 w-4" />Excel</Button>
      </div>
    </div>
  );
}
