import { NextResponse } from "next/server";
import { readStore, updateStore } from "@/lib/store";
import { requireOwner } from "@/lib/api-guard";

export async function GET(request: Request) {
  const forbidden = await requireOwner(request);
  if (forbidden) return forbidden;
  const data = await readStore();
  return NextResponse.json({ data: data.settings });
}

export async function PUT(request: Request) {
  const forbidden = await requireOwner(request);
  if (forbidden) return forbidden;
  const body = await request.json();
  const data = await updateStore((store) => {
    store.settings = { ...store.settings, ...body };
  });
  return NextResponse.json({ data: data.settings });
}
