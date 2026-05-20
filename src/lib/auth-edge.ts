import { jwtVerify } from "jose";
import type { Role } from "@/types";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-minimal-32-karakter-laundry-pos");
export const authCookieName = "laundry_pos_session";

export async function verifyToken(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as { id: string; role: Role; name: string; email: string };
  } catch {
    return null;
  }
}

export function canAccessPath(role: Role, path: string) {
  if (role === "OWNER") return true;
  const cashierAllowed = ["/cashier", "/laundry-management", "/transactions", "/customers", "/print", "/api/customers", "/api/transactions", "/api/auth"];
  return cashierAllowed.some((prefix) => path.startsWith(prefix));
}
