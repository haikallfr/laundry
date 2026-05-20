"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatRupiah } from "@/lib/utils";

export function RevenueChart({ data }: { data: Array<{ date: string; omzet: number; transaksi: number; laba: number }> }) {
  return (
    <div className="h-80 rounded-lg border border-line bg-white p-4 shadow-subtle">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-ink">Omzet 30 Hari Terakhir</h2>
          <p className="text-sm text-muted">Omzet, transaksi, dan tren laba harian.</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="82%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="omzet" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
          <Tooltip formatter={(value) => formatRupiah(Number(value))} />
          <Area type="monotone" dataKey="omzet" stroke="#2563eb" strokeWidth={3} fill="url(#omzet)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
