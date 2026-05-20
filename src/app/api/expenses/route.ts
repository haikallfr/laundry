import { NextResponse } from "next/server";
import { readStore, updateStore } from "@/lib/store";
import { requireOwner } from "@/lib/api-guard";

export async function GET(request: Request) {
  const forbidden = await requireOwner(request);
  if (forbidden) return forbidden;
  const data = await readStore();
  return NextResponse.json({ data: data.expenses });
}

export async function POST(request: Request) {
  const forbidden = await requireOwner(request);
  if (forbidden) return forbidden;
  const expense = { id: `exp-${Date.now()}`, ...(await request.json()) };
  await updateStore((data) => {
    data.expenses.unshift(expense);
  });
  return NextResponse.json({ data: expense }, { status: 201 });
}
