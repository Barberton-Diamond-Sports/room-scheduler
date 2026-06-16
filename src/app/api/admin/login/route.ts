import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  const formData = await request.formData();

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  // ✅ Missing credentials
  if (!email || !password) {
    return NextResponse.redirect(
      new URL("/admin-login?error=missing", request.url)
    );
  }

  const user = await prisma.adminUser.findUnique({
    where: { email },
  });

  // ✅ User not found
  if (!user) {
    return NextResponse.redirect(
      new URL("/admin-login?error=invalid", request.url)
    );
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);

  // ✅ Invalid password
  if (!passwordValid) {
    return NextResponse.redirect(
      new URL("/admin-login?error=invalid", request.url)
    );
  }

  // ✅ SUCCESS LOGIN

  const next = String(formData.get("next") || "/admin");

  const response = NextResponse.redirect(new URL(next, request.url));

  // ✅ SET COOKIE ON RESPONSE (FINAL CORRECT VERSION)
  response.cookies.set("admin_access", "granted", {
    httpOnly: true,
    sameSite: "lax", // ✅ changed back from "none"
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}