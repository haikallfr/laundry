"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatRupiah, paymentMethodLabel } from "@/lib/utils";
import type { PaymentMethod } from "@/types";

const colors = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#64748b"];

export function PaymentMethodChart({ data }: { data: Record<PaymentMethod, number> }) {
  const total = Object.values(data).reduce((sum, value) => sum + value, 0);
  const rows = Object.entries(data)
    .map(([method, value]) => ({
      method: paymentMethodLabel[method as PaymentMethod],
      value,
      percent: total > 0 ? (value / total) * 100 : 0
    }))
    .filter((row) => row.value > 0 || total === 0);
  const chartRows = rows.filter((row) => row.value > 0);
  const topRows = chartRows.slice(0, 2);
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-subtle">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">Metode Pembayaran</h2>
          <p className="text-sm text-muted">Cash in berdasarkan metode.</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-right">
          <p className="text-xs font-semibold text-muted">Total</p>
          <p className="text-sm font-black text-ink">{formatRupiah(total)}</p>
        </div>
      </div>
      <div className="relative mt-3 h-56">
        {chartRows.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartRows}
                  dataKey="value"
                  nameKey="method"
                  innerRadius={58}
                  outerRadius={84}
                  paddingAngle={4}
                  labelLine={false}
                  stroke="#ffffff"
                  strokeWidth={3}
                >
                  {chartRows.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip formatter={(value, _name, item) => [`${formatRupiah(Number(value))} (${Number(item.payload.percent).toFixed(1)}%)`, "Cash in"]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-full bg-white/95 px-3 py-2 text-center shadow-subtle">
                <p className="text-xs font-semibold text-muted">Cash in</p>
                <p className="text-sm font-black text-ink">{formatRupiah(total)}</p>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-2">
              {topRows.map((row, index) => (
                <div key={row.method} className="rounded-lg border border-line bg-white/95 px-2.5 py-1 text-xs font-black shadow-subtle" style={{ color: colors[index % colors.length] }}>
                  {row.method} {row.percent.toFixed(0)}%
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-line bg-slate-50 text-sm font-semibold text-muted">
            Belum ada pembayaran
          </div>
        )}
      </div>
      <div className="mt-3 space-y-3">
        {rows.map((row, index) => (
          <div key={row.method} className="rounded-lg bg-slate-50 p-2.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-semibold text-muted"><span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[index % colors.length] }} />{row.method}</span>
              <strong className="text-right text-ink">{row.percent.toFixed(1)}%</strong>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full" style={{ width: `${row.percent}%`, background: colors[index % colors.length] }} />
            </div>
            <div className="mt-1 text-right text-xs font-semibold text-muted">{formatRupiah(row.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
