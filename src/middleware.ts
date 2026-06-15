import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const adminAccess = request.cookies.get("admin_access")?.value;

    if (adminAccess !== "granted") {
      const loginUrl = new URL("/admin-login", request.url);

      // ✅ Keep your existing redirect behavior
      loginUrl.searchParams.set("next", `${pathname}${search}`);

      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};