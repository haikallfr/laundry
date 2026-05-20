import { NextResponse } from "next/server";
import { readStore, updateStore } from "@/lib/store";
import { customerSchema } from "@/lib/validations";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await readStore();
  return NextResponse.json({ data: data.customers.find((row) => row.id === id) ?? null });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = customerSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const updated = { id, ...parsed.data, updatedAt: new Date().toISOString() };
  await updateStore((data) => {
    data.customers = data.customers.map((row) => row.id === id ? { ...row, ...updated } : row);
  });
  return NextResponse.json({ data: updated });
}
