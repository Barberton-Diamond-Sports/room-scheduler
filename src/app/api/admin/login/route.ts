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
const cookieStore = await cookies();
cookieStore.set("admin_access", "granted", {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 8, // ✅ 8 hours
});

// ✅ Use next from form (NOT URL)
const next = String(formData.get("next") || "/admin");

return NextResponse.redirect(new URL(next, request.url));

}
