import { NextResponse } from "next/server";
import { updateStore } from "@/lib/store";
import { requireOwner } from "@/lib/api-guard";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const forbidden = await requireOwner(request);
  if (forbidden) return forbidden;
  const { id } = await params;
  const body = await request.json();
  await updateStore((data) => {
    data.users = data.users.map((row) => row.id === id ? { ...row, ...body, id } : row);
  });
  return NextResponse.json({ data: { id, ...body } });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const forbidden = await requireOwner(_request);
  if (forbidden) return forbidden;
  const { id } = await params;
  await updateStore((data) => {
    data.users = data.users.filter((row) => row.id !== id);
  });
  return NextResponse.json({ data: { id }, deleted: true });
}
