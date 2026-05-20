import { NextResponse } from "next/server";
import { readStore, updateStore } from "@/lib/store";
import { requireOwner } from "@/lib/api-guard";

export async function GET(request: Request) {
  const forbidden = await requireOwner(request);
  if (forbidden) return forbidden;
  const data = await readStore();
  return NextResponse.json({ data: data.users });
}

export async function POST(request: Request) {
  const forbidden = await requireOwner(request);
  if (forbidden) return forbidden;
  const user = { id: `usr-${Date.now()}`, ...(await request.json()) };
  await updateStore((data) => {
    data.users.unshift(user);
  });
  return NextResponse.json({ data: user }, { status: 201 });
}
