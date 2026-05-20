"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatRupiah } from "@/lib/utils";

export function ProfitLossChart({ data }: { data: Array<{ layanan: string; omzet: number }> }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-subtle">
      <h2 className="text-base font-bold text-ink">Layanan Paling Laris</h2>
      <p className="text-sm text-muted">Omzet per layanan. Biaya operasional dicatat di pengeluaran.</p>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="layanan" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <Tooltip formatter={(value) => formatRupiah(Number(value))} />
            <Bar dataKey="omzet" fill="#2563eb" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
