import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/api-guard";
import { readCapitalPlan, writeCapitalPlan } from "@/lib/store";
import type { CapitalPlan } from "@/types";

export async function GET(request: Request) {
  const forbidden = await requireOwner(request);
  if (forbidden) return forbidden;

  return NextResponse.json({ data: await readCapitalPlan() });
}

export async function PUT(request: Request) {
  const forbidden = await requireOwner(request);
  if (forbidden) return forbidden;

  const body = (await request.json()) as CapitalPlan;
  const data = await writeCapitalPlan(body);
  return NextResponse.json({ data });
}
