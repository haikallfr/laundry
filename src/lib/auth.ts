import { jwtVerify, SignJWT } from "jose";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import type { Role, User } from "@/types";
import { readUserById } from "@/lib/store";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-minimal-32-karakter-laundry-pos");
export const authCookieName = "laundry_pos_session";

export async function signSession(user: User) {
  return new SignJWT({ id: user.id, role: user.role, name: user.name, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
}

export async function verifyToken(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as { id: string; role: Role; name: string; email: string };
  } catch {
    return null;
  }
}

export async function currentUser() {
  const cookieStore = await cookies();
  const session = await verifyToken(cookieStore.get(authCookieName)?.value);
  if (!session) return null;
  return await readUserById(session.id) ?? { id: session.id, name: session.name, email: session.email, role: session.role, status: "ACTIVE" };
}

export async function currentUserFromRequest(request: NextRequest) {
  const session = await verifyToken(request.cookies.get(authCookieName)?.value);
  if (!session) return null;
  return await readUserById(session.id) ?? { id: session.id, name: session.name, email: session.email, role: session.role, status: "ACTIVE" };
}

export function canAccessPath(role: Role, path: string) {
  if (role === "OWNER") return true;
  const cashierAllowed = ["/cashier", "/laundry-management", "/transactions", "/customers", "/print", "/api/customers", "/api/transactions", "/api/auth"];
  return cashierAllowed.some((prefix) => path.startsWith(prefix));
}
