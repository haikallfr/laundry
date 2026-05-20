import { NextResponse } from "next/server";
import { calculateFinanceSummary, resolvePeriod } from "@/lib/finance";
import { readStore } from "@/lib/store";
import { requireOwner } from "@/lib/api-guard";

export async function GET(request: Request) {
  const forbidden = await requireOwner(request);
  if (forbidden) return forbidden;
  const data = await readStore();
  const resolved = resolvePeriod(Object.fromEntries(new URL(request.url).searchParams.entries()));
  const summary = calculateFinanceSummary(data.transactions, data.expenses, resolved.period);
  return NextResponse.json({ data: { grossRevenue: summary.grossRevenue, netRevenue: summary.netRevenue, serviceCost: summary.serviceCost, expenses: summary.expenses, grossProfit: summary.grossProfit, netProfit: summary.netProfit } });
}
