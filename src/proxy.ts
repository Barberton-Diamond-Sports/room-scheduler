import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const blockedPaths = [
    ".env",
    "wp-admin",
    "phpinfo",
    ".git",
  ];

  if (blockedPaths.some((p) => pathname.includes(p))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown";

  const { allowed } = rateLimit(ip, 100);

  if (!allowed) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

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
  matcher: ["/:path*"],
};
