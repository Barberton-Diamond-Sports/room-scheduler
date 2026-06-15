import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const cookieStore = await cookies();

  cookieStore.set("admin_access", "", {
    expires: new Date(0),
    path: "/",
  });

  return NextResponse.redirect(new URL("/admin-login", request.url));
}