

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const formData = await request.formData();

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return NextResponse.redirect("/admin-login?error=missing");
  }

  const user = await prisma.adminUser.findUnique({
    where: { email },
  });

  if (!user) {
    return NextResponse.redirect("/admin-login?error=invalid");
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);

  if (!passwordValid) {
    return NextResponse.redirect("/admin-login?error=invalid");
  }

// ✅ Set login cookie (PERSISTENT)
const next = String(formData.get("next") || "/admin");

const response = NextResponse.redirect(new URL(next, request.url));

// ✅ SET COOKIE ON RESPONSE (this is the fix)
response.cookies.set("admin_access", "granted", {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 8,
});

return response;

}
