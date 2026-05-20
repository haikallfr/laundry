import { NextResponse } from "next/server";
import { updateStore } from "@/lib/store";
import { requireOwner } from "@/lib/api-guard";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const forbidden = await requireOwner(request);
  if (forbidden) return forbidden;
  const { id } = await params;
  const body = await request.json();
  const payload = { ...body, cost: 0 };
  await updateStore((data) => {
    data.services = data.services.map((row) => row.id === id ? { ...row, ...payload, id } : row);
  });
  return NextResponse.json({ data: { id, ...payload } });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const forbidden = await requireOwner(_request);
  if (forbidden) return forbidden;
  const { id } = await params;
  await updateStore((data) => {
    data.services = data.services.filter((row) => row.id !== id);
  });
  return NextResponse.json({ data: { id }, deleted: true });
}
