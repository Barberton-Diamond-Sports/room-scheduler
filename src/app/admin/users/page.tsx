import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";


type PageProps = {
  searchParams: Promise<{
    confirmDelete?: string;
    error?: string;
  }>;
};

const fieldLabelStyle = {
  display: "block",
  marginBottom: "0.4rem",
  fontWeight: 600,
  color: "#334155",
};

const fieldStyle = {
  width: "100%",
  padding: "0.75rem 0.9rem",
  border: "1px solid #cbd5e1",
  borderRadius: "12px",
  backgroundColor: "#f8fafc",
  fontSize: "1rem",
  boxSizing: "border-box" as const,
};

function usersHref(extra?: { confirmDelete?: string; error?: string }) {
  const params = new URLSearchParams();

  if (extra?.confirmDelete) {
    params.set("confirmDelete", extra.confirmDelete);
  }

  if (extra?.error) {
    params.set("error", extra.error);
  }

  const query = params.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

function buttonStyle(bg: string, border: string, color: string) {
  return {
    display: "inline-block",
    padding: "0.65rem 1rem",
    backgroundColor: bg,
    border: `1px solid ${border}`,
    borderRadius: "10px",
    color,
    textDecoration: "none",
    fontWeight: 600,
    textAlign: "center" as const,
  };
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  async function addUser(formData: FormData) {
    "use server";

    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");

    if (!name || !email || !password) return;

const passwordHash = await bcrypt.hash(password, 10);

try {
  await prisma.adminUser.create({
    data: {
      name,
      email,
      passwordHash,
    },
  });
} catch (error) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  ) {
    redirect(usersHref({ error: "duplicate-email" }));
  }

  throw error;
}

redirect("/admin/users");
  }

  async function updateUser(formData: FormData) {
    "use server";

    const id = String(formData.get("id") || "").trim();
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");

    if (!id || !name || !email) return;

    const data: {
      name: string;
      email: string;
      passwordHash?: string;
    } = {
      name,
      email,
    };

    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    try {
  await prisma.adminUser.update({
    where: { id },
    data,
  });
} catch (error) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  ) {
    redirect(usersHref({ error: "duplicate-email" }));
  }

  throw error;
}

redirect("/admin/users");
  }

  async function deleteUser(formData: FormData) {
    "use server";

    const id = String(formData.get("id") || "").trim();
    if (!id) return;

    const cookieStore = await cookies();
    const currentAdminEmail =
      (cookieStore.get("admin_email")?.value || "").trim().toLowerCase();

    const targetUser = await prisma.adminUser.findUnique({
      where: { id },
      select: { email: true },
    });

    if (!targetUser) {
      redirect("/admin/users");
    }

    // ✅ Prevent deleting currently logged-in user
    if (
      currentAdminEmail &&
      targetUser.email.trim().toLowerCase() === currentAdminEmail
    ) {
      redirect("/admin/users");
    }

    await prisma.adminUser.delete({
      where: { id },
    });

    redirect("/admin/users");
  }

  const params = await searchParams;
const confirmDeleteUserId = params.confirmDelete || "";
const errorMessage =
  params.error === "duplicate-email"
    ? "That email address is already being used by another admin user."
    : "";

  const cookieStore = await cookies();
  const currentAdminEmail =
    (cookieStore.get("admin_email")?.value || "").trim().toLowerCase();

  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fb",
        padding: "1rem",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <style>{`
        .admin-users-shell {
          max-width: 1000px;
          margin: 0 auto;
        }

        .admin-users-card {
          background-color: #ffffff;
          border: 1px solid #dbe3f0;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
        }

        .admin-users-header-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .admin-users-form-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }

        .admin-users-user-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background-color: #f8fafc;
          padding: 1rem;
        }

        .admin-users-user-header {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
          align-items: flex-start;
          margin-bottom: 0.75rem;
        }

        .admin-users-user-meta {
          color: #64748b;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .admin-users-user-name {
          font-weight: 700;
          color: #0f172a;
          line-height: 1.35;
        }

        .admin-users-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-top: 0.75rem;
        }

        @media (max-width: 768px) {
          .admin-users-card {
            padding: 1rem;
            border-radius: 14px;
          }

          .admin-users-header-actions,
          .admin-users-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .admin-users-header-actions a,
          .admin-users-actions a,
          .admin-users-actions button,
          .admin-users-actions form {
            width: 100%;
            box-sizing: border-box;
          }

          .admin-users-user-header {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>

      <div className="admin-users-shell">
        {/* HEADER */}
        <div className="admin-users-card" style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
            <div>
              <h1 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "1.9rem" }}>
                Manage Admin Users
              </h1>
              <p style={{ marginTop: 0, color: "#4b5563", marginBottom: 0 }}>
                Add, update, and manage administrator accounts.
              </p>
            </div>

            <div className="admin-users-header-actions">
              <Link
                href="/admin"
                style={buttonStyle("#eef2ff", "#c7d2fe", "#1e3a8a")}
              >
                Back to Admin Dashboard
              </Link>
            </div>
          </div>
        </div>


{errorMessage && (
  <div
    className="admin-users-card"
    style={{
      marginBottom: "1.5rem",
      border: "1px solid #fca5a5",
      backgroundColor: "#fef2f2",
    }}
  >
    <div
      style={{
        color: "#991b1b",
        fontWeight: 700,
        lineHeight: 1.45,
      }}
    >
      {errorMessage}
    </div>
  </div>
)}


        {/* ADD USER */}
        <div className="admin-users-card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>Add Admin User</h2>

          <form action={addUser} style={{ display: "grid", gap: "1rem" }}>
            <div className="admin-users-form-grid">
              <div>
                <label htmlFor="name" style={fieldLabelStyle}>
                  Name
                </label>
                <input id="name" name="name" required style={fieldStyle} />
              </div>

              <div>
                <label htmlFor="email" style={fieldLabelStyle}>
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  style={fieldStyle}
                />
              </div>

              <div>
                <label htmlFor="password" style={fieldLabelStyle}>
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  style={fieldStyle}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                style={{
                  padding: "0.85rem 1.25rem",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.22)",
                }}
              >
                Add Admin User
              </button>
            </div>
          </form>
        </div>

        {/* USER LIST */}
        <div className="admin-users-card">
          <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>Admin User List</h2>

          {users.length === 0 ? (
            <div
              style={{
                padding: "1rem",
                border: "1px dashed #cbd5e1",
                borderRadius: "12px",
                color: "#64748b",
              }}
            >
              No admin users found.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "0.85rem" }}>
              {users.map((user) => {
                const isCurrentUser =
                  !!currentAdminEmail &&
                  user.email.trim().toLowerCase() === currentAdminEmail;

                const isConfirmingDelete = confirmDeleteUserId === user.id;

                return (
                  <div key={user.id} className="admin-users-user-card">
                    <div className="admin-users-user-header">
                      <div>
                        <div className="admin-users-user-name">{user.name}</div>
                        <div className="admin-users-user-meta">{user.email}</div>
                        {isCurrentUser && (
                          <div
                            style={{
                              marginTop: "0.35rem",
                              color: "#1d4ed8",
                              fontWeight: 700,
                              fontSize: "0.86rem",
                            }}
                          >
                            Current logged-in user
                          </div>
                        )}
                      </div>
                    </div>

                    <form action={updateUser} style={{ display: "grid", gap: "1rem" }}>
                      <input type="hidden" name="id" value={user.id} />

                      <div className="admin-users-form-grid">
                        <div>
                          <label htmlFor={`name-${user.id}`} style={fieldLabelStyle}>
                            Name
                          </label>
                          <input
                            id={`name-${user.id}`}
                            name="name"
                            defaultValue={user.name}
                            required
                            style={fieldStyle}
                          />
                        </div>

                        <div>
                          <label htmlFor={`email-${user.id}`} style={fieldLabelStyle}>
                            Email
                          </label>
                          <input
                            id={`email-${user.id}`}
                            name="email"
                            type="email"
                            defaultValue={user.email}
                            required
                            style={fieldStyle}
                          />
                        </div>

                        <div>
                          <label htmlFor={`password-${user.id}`} style={fieldLabelStyle}>
                            New Password
                          </label>
                          <input
                            id={`password-${user.id}`}
                            name="password"
                            type="password"
                            placeholder="Leave blank to keep current password"
                            style={fieldStyle}
                          />
                        </div>
                      </div>

                      <div className="admin-users-actions">
                        <button
                          type="submit"
                          style={{
                            padding: "0.8rem 1.2rem",
                            backgroundColor: "#2563eb",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Save Changes
                        </button>

                        {!isCurrentUser && (
                          <Link
                            href={usersHref({ confirmDelete: user.id })}
                            style={buttonStyle("#fee2e2", "#fca5a5", "#991b1b")}
                          >
                            Delete
                          </Link>
                        )}
                      </div>
                    </form>

                    {isConfirmingDelete && !isCurrentUser && (
                      <div
                        style={{
                          marginTop: "1rem",
                          padding: "1rem",
                          border: "1px solid #fca5a5",
                          borderRadius: "12px",
                          backgroundColor: "#fff1f2",
                        }}
                      >
                        <div
                          style={{
                            color: "#991b1b",
                            fontWeight: 700,
                            marginBottom: "0.5rem",
                          }}
                        >
                          Are you sure you want to permanently delete this admin user?
                        </div>

                        <div style={{ color: "#7f1d1d", marginBottom: "0.9rem" }}>
                          This action cannot be undone.
                        </div>

                        <div className="admin-users-actions">
                          <form action={deleteUser}>
                            <input type="hidden" name="id" value={user.id} />
                            <button
                              type="submit"
                              style={{
                                padding: "0.75rem 1rem",
                                backgroundColor: "#b91c1c",
                                border: "1px solid #991b1b",
                                borderRadius: "10px",
                                color: "#ffffff",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Yes, Delete User
                            </button>
                          </form>

                          <Link
                            href={usersHref()}
                            style={buttonStyle("#f8fafc", "#dbe3f0", "#475569")}
                          >
                            Cancel
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}