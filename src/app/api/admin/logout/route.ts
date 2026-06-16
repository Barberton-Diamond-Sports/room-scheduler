import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/admin-login", request.url));

  response.cookies.set("admin_access", "", {
    expires: new Date(0),
    path: "/",
  });

  response.cookies.set("admin_email", "", {
    expires: new Date(0),
    path: "/",
  });

  return response;
}