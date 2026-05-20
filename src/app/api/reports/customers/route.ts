import { NextResponse } from "next/server";
import { readStore } from "@/lib/store";
import { requireOwner } from "@/lib/api-guard";
import { filterTransactionsByPeriod, resolvePeriod } from "@/lib/finance";

export async function GET(request: Request) {
  const forbidden = await requireOwner(request);
  if (forbidden) return forbidden;
  const data = await readStore();
  const resolved = resolvePeriod(Object.fromEntries(new URL(request.url).searchParams.entries()));
  const transactions = filterTransactionsByPeriod(data.transactions, resolved.period);
  return NextResponse.json({ data: data.customers.map((customer) => {
    const rows = transactions.filter((trx) => trx.customerId === customer.id);
    return { customer, transactionCount: rows.length, revenue: rows.reduce((sum, trx) => sum + trx.grandTotal, 0), receivable: rows.reduce((sum, trx) => sum + Math.max(0, trx.grandTotal - trx.paidAmount), 0) };
  }) });
}
