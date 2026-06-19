import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // -----------------------------
  // 1. BLOCK OBVIOUS BOT / SCANNER PATHS
  // -----------------------------
  const blockedPaths = [
    ".env",
    "wp-admin",
    "wp-login",
    "xmlrpc.php",
    "phpinfo",
    ".git",
  ];

  if (blockedPaths.some((p) => pathname.includes(p))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // -----------------------------
  // 2. EXISTING ADMIN PROTECTION
  // -----------------------------
  const isAdminRoute =
    pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdminRoute) {
    const adminAccess = request.cookies.get("admin_access")?.value;

    if (adminAccess !== "granted") {
      const loginUrl = new URL("/admin-login", request.url);

      loginUrl.searchParams.set("next", `${pathname}${search}`);

      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};