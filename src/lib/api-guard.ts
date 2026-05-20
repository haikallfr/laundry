import { NextResponse } from "next/server";
import { authCookieName, verifyToken } from "@/lib/auth";
import { readUserById } from "@/lib/store";

export async function requireOwner(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${authCookieName}=`))?.split("=")[1];
  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await readUserById(session.id);
  if (!user || user.role !== "OWNER") return NextResponse.json({ error: "Owner only" }, { status: 403 });
  return null;
}
