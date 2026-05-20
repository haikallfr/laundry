import { NextResponse, type NextRequest } from "next/server";
import { authCookieName, canAccessPath, verifyToken } from "@/lib/auth-edge";

const protectedPrefixes = [
  "/dashboard-owner",
  "/cashier",
  "/assistant",
  "/laundry-management",
  "/transactions",
  "/customers",
  "/services",
  "/expenses",
  "/reports",
  "/settings",
  "/print",
  "/api"
];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/api/auth")) return NextResponse.next();
  const isProtected = protectedPrefixes.some((prefix) => path.startsWith(prefix));
  if (!isProtected) return NextResponse.next();
  const session = await verifyToken(request.cookies.get(authCookieName)?.value);
  if (!session) return NextResponse.redirect(new URL("/login", request.url));
  if (!canAccessPath(session.role, path)) return NextResponse.redirect(new URL("/cashier", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads|qris-demo.svg).*)"]
};
