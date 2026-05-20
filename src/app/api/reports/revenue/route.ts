import { NextResponse } from "next/server";
import { filterTransactionsByPeriod, resolvePeriod, revenueDailySeries } from "@/lib/finance";
import { readStore } from "@/lib/store";
import { requireOwner } from "@/lib/api-guard";

export async function GET(request: Request) {
  const forbidden = await requireOwner(request);
  if (forbidden) return forbidden;
  const data = await readStore();
  const resolved = resolvePeriod(Object.fromEntries(new URL(request.url).searchParams.entries()));
  const scoped = filterTransactionsByPeriod(data.transactions, resolved.period);
  return NextResponse.json({ data: revenueDailySeries(scoped, Math.min(resolved.days, 60), resolved.period.end ?? new Date()), period: resolved.label });
}
