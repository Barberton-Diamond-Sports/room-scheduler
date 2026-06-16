import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/admin-login", request.url));

  // ✅ Clear cookie on the response (this is critical)
response.cookies.set("admin_access", "", {
  expires: new Date(0),
  sameSite: "none",
  secure: true,
  path: "/",
});

  return response;
}
``