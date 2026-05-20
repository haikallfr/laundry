import { NextResponse } from "next/server";
import { readStore, updateStore } from "@/lib/store";
import { requireOwner } from "@/lib/api-guard";

export async function GET(request: Request) {
  const forbidden = await requireOwner(request);
  if (forbidden) return forbidden;
  const data = await readStore();
  return NextResponse.json({ data: data.services });
}

export async function POST(request: Request) {
  const forbidden = await requireOwner(request);
  if (forbidden) return forbidden;
  const body = await request.json();
  const service = { id: `srv-${Date.now()}`, ...body, cost: 0 };
  await updateStore((data) => {
    data.services.unshift(service);
  });
  return NextResponse.json({ data: service }, { status: 201 });
}
