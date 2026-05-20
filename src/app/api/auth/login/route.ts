import { NextResponse } from "next/server";
import { authCookieName, signSession } from "@/lib/auth";
import { readUserByEmail } from "@/lib/store";
import { loginSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 422 });
  const user = await readUserByEmail(parsed.data.email);
  if (!user || parsed.data.password !== "password") return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  const token = await signSession(user);
  const response = NextResponse.json({ user });
  response.cookies.set(authCookieName, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  return response;
}
