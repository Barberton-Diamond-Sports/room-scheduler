import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return NextResponse.redirect(
      new URL("/admin-login?error=missing", request.url)
    );
  }

  const user = await prisma.adminUser.findUnique({
    where: { email },
  });

  if (!user) {
    return NextResponse.redirect(
      new URL("/admin-login?error=invalid", request.url)
    );
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);

  if (!passwordValid) {
    return NextResponse.redirect(
      new URL("/admin-login?error=invalid", request.url)
    );
  }

  // ✅ SUCCESS

  const next = String(formData.get("next") || "/admin");

  const response = NextResponse.redirect(new URL(next, request.url));

  response.cookies.set("admin_access", "granted", {
    httpOnly: true,
    sameSite: "lax",         // ✅ correct for same-site app
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}
``