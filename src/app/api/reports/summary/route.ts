import { NextResponse } from "next/server";
import { calculateFinanceSummary, resolvePeriod } from "@/lib/finance";
import { readStore } from "@/lib/store";
import { requireOwner } from "@/lib/api-guard";

export async function GET(request: Request) {
  const forbidden = await requireOwner(request);
  if (forbidden) return forbidden;
  const data = await readStore();
  const resolved = resolvePeriod(Object.fromEntries(new URL(request.url).searchParams.entries()));
  return NextResponse.json({ data: calculateFinanceSummary(data.transactions, data.expenses, resolved.period), period: resolved.label });
}
