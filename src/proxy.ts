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
  if (pathname.startsWith("/admin")) {
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
    /*
      Run proxy for application pages/routes,
      but avoid Next.js internals and static assets.
    */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};