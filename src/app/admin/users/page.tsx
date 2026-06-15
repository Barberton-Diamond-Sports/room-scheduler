import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export default async function AdminUsersPage() {
  async function addUser(formData: FormData) {
    "use server";

    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");

    if (!name || !email || !password) return;

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.adminUser.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    redirect("/admin/users");
  }

  async function updateUser(formData: FormData) {
    "use server";

    const id = String(formData.get("id") || "");
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");

    if (!id || !name || !email) return;

    const data: any = {
      name,
      email,
    };

    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    await prisma.adminUser.update({
      where: { id },
      data,
    });

    redirect("/admin/users");
  }

  async function deleteUser(formData: FormData) {
    "use server";

    const id = String(formData.get("id") || "");
    if (!id) return;

    await prisma.adminUser.delete({
      where: { id },
    });

    redirect("/admin/users");
  }

  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <main style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>Admin Users</h1>

      {/* ADD USER */}
      <div
        style={{
          marginBottom: "2rem",
          padding: "1.5rem",
          backgroundColor: "#ffffff",
          border: "1px solid #dbe3f0",
          borderRadius: "12px",
        }}
      >
        <h2>Add Admin User</h2>

        <form action={addUser} style={{ display: "grid", gap: "0.75rem" }}>
          <input name="name" placeholder="Name" required />
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Password" required />

          <button type="submit">Add User</button>
        </form>
      </div>

      {/* USER LIST */}
      {users.map((user) => (
        <div
          key={user.id}
          style={{
            marginBottom: "1rem",
            padding: "1rem",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            backgroundColor: "#ffffff",
          }}
        >
          <form action={updateUser} style={{ display: "grid", gap: "0.5rem" }}>
            <input type="hidden" name="id" value={user.id} />

            <input name="name" defaultValue={user.name} required />

            <input name="email" defaultValue={user.email} required />

            <input
              name="password"
              type="password"
              placeholder="New password (leave blank to keep)"
            />

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit">Save</button>
            </div>
          </form>

          <form action={deleteUser} style={{ marginTop: "0.5rem" }}>
            <input type="hidden" name="id" value={user.id} />
            <button type="submit" style={{ color: "red" }}>
              Delete
            </button>
          </form>
        </div>
      ))}
    </main>
  );
}