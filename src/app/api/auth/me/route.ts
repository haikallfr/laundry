import { NextRequest, NextResponse } from "next/server";
import { currentUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await currentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ user });
}
