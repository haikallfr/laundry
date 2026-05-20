import { NextResponse } from "next/server";
import { readStore } from "@/lib/store";
import { requireOwner } from "@/lib/api-guard";

export async function GET(request: Request) {
  const forbidden = await requireOwner(request);
  if (forbidden) return forbidden;
  const data = await readStore();
  return NextResponse.json({ data: { fileUrl: data.settings.qrisUrl, mimeType: "image/*" } });
}
