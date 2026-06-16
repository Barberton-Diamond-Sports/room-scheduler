

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function loginAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/admin");

  if (!email || !password) {
    redirect("/admin-login?error=missing");
  }

  const user = await prisma.adminUser.findUnique({
    where: { email },
  });

  if (!user) {
    redirect("/admin-login?error=invalid");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    redirect("/admin-login?error=invalid");
  }

  const cookieStore = await cookies();

  cookieStore.set("admin_access", "granted", {
	httpOnly: true,
	sameSite: "lax",
	path: "/",
	maxAge: 60 * 60 * 8,
  });

  cookieStore.set("admin_email", user.email, {
	httpOnly: true,
	sameSite: "lax",
	path: "/",
	maxAge: 60 * 60 * 8,
  });

  redirect(next);
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const error = params.error;
  const next = params.next || "/admin";

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fb",
        padding: "2rem",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "#ffffff",
          border: "1px solid #dbe3f0",
          borderRadius: "16px",
          padding: "1.5rem",
          boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
        }}
      >
        <h1 style={{ marginTop: 0 }}>Admin Login</h1>

        {error && (
          <div
            style={{
              marginBottom: "1rem",
              padding: "0.75rem",
              backgroundColor: "#fee2e2",
              border: "1px solid #fca5a5",
              borderRadius: "10px",
              color: "#991b1b",
              fontWeight: 600,
            }}
          >
            Invalid email or password
          </div>
        )}

        <form action={loginAction} style={{ display: "grid", gap: "1rem" }}>
          <div>
            <label style={{ fontWeight: 600 }}>Email</label>
			<input type="hidden" name="next" value={next} />
            <input
              name="email"
              type="email"
              required
              style={{
                width: "100%",
                padding: "0.7rem",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
              }}
            />
          </div>

          <div>
            <label style={{ fontWeight: 600 }}>Password</label>
            <input
              name="password"
              type="password"
              required
              style={{
                width: "100%",
                padding: "0.7rem",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              padding: "0.75rem",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Login
          </button>
        </form>

        <div style={{ marginTop: "1rem" }}>
          <Link href="/" style={{ color: "#1d4ed8", fontWeight: 600 }}>
            Back to site
          </Link>
        </div>
      </div>
    </main>
  );
}
