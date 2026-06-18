import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

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
  matcher: ["/admin/:path*"],
};