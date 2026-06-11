
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type UmpireItem = {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  doesBaseball: boolean;
  doesSoftball: boolean;
  isActive: boolean;
  bookingCount: number;
};

type Props = {
  items: UmpireItem[];
};

type FormState = {
  name: string;
  phone: string;
  email: string;
  notes: string;
  doesBaseball: boolean;
  doesSoftball: boolean;
  isActive: boolean;
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

function emptyForm(): FormState {
  return {
    name: "",
    phone: "",
    email: "",
    notes: "",
    doesBaseball: true,
    doesSoftball: false,
    isActive: true,
  };
}

export default function UmpireManagementPanel({ items }: Props) {
  const router = useRouter();
  const [createForm, setCreateForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm());
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [sportFilter, setSportFilter] = useState<"all" | "baseball" | "softball">("all");

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter === "active" && !item.isActive) return false;
      if (statusFilter === "inactive" && item.isActive) return false;
      if (sportFilter === "baseball" && !item.doesBaseball) return false;
      if (sportFilter === "softball" && !item.doesSoftball) return false;
      return true;
    });
  }, [items, statusFilter, sportFilter]);

  function setCreateValue<K extends keyof FormState>(key: K, value: FormState[K]) {
    setCreateForm((current) => ({ ...current, [key]: value }));
  }

  function setEditValue<K extends keyof FormState>(key: K, value: FormState[K]) {
    setEditForm((current) => ({ ...current, [key]: value }));
  }

  function startEdit(item: UmpireItem) {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      phone: item.phone,
      email: item.email,
      notes: item.notes,
      doesBaseball: item.doesBaseball,
      doesSoftball: item.doesSoftball,
      isActive: item.isActive,
    });
    setMessage("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyForm());
    setMessage("");
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!createForm.name.trim()) {
      setMessage("Umpire name is required.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/umpires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const result = await response.json();
      if (result.success) {
        setCreateForm(emptyForm());
        router.refresh();
      } else {
        setMessage(result.message || "Unable to add umpire.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong while adding the umpire.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveEdit(id: string) {
    if (!editForm.name.trim()) {
      setMessage("Umpire name is required.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/umpires/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const result = await response.json();
      if (result.success) {
        setEditingId(null);
        setEditForm(emptyForm());
        router.refresh();
      } else {
        setMessage(result.message || "Unable to update umpire.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong while updating the umpire.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(item: UmpireItem) {
    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/umpires/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      const result = await response.json();
      if (result.success) {
        if (editingId === item.id) {
          setEditingId(null);
          setEditForm(emptyForm());
        }
        router.refresh();
      } else {
        setMessage(result.message || "Unable to update umpire status.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong while updating umpire status.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div style={{ border: "1px solid #e2e8f0", borderRadius: "14px", padding: "1rem", backgroundColor: "#f8fafc" }}>
        <h2 style={{ marginTop: 0 }}>Add Umpire</h2>
        <form onSubmit={handleCreate} style={{ display: "grid", gap: "1rem" }}>
          <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600, color: "#334155" }}>Name</label>
              <input value={createForm.name} onChange={(e) => setCreateValue("name", e.target.value)} style={fieldStyle} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600, color: "#334155" }}>Phone</label>
              <input value={createForm.phone} onChange={(e) => setCreateValue("phone", e.target.value)} style={fieldStyle} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600, color: "#334155" }}>Email</label>
              <input value={createForm.email} onChange={(e) => setCreateValue("email", e.target.value)} style={fieldStyle} />
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600, color: "#334155" }}>Notes</label>
            <textarea value={createForm.notes} onChange={(e) => setCreateValue("notes", e.target.value)} style={{ ...fieldStyle, minHeight: "96px", resize: "vertical" as const }} />
          </div>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontWeight: 600, color: "#334155" }}>
              <input type="checkbox" checked={createForm.doesBaseball} onChange={(e) => setCreateValue("doesBaseball", e.target.checked)} />
              Baseball
            </label>
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontWeight: 600, color: "#334155" }}>
              <input type="checkbox" checked={createForm.doesSoftball} onChange={(e) => setCreateValue("doesSoftball", e.target.checked)} />
              Softball
            </label>
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontWeight: 600, color: "#334155" }}>
              <input type="checkbox" checked={createForm.isActive} onChange={(e) => setCreateValue("isActive", e.target.checked)} />
              Active
            </label>
          </div>

          <div>
            <button type="submit" disabled={isSaving} style={{ padding: "0.85rem 1.25rem", backgroundColor: "#2563eb", color: "#ffffff", border: "none", borderRadius: "12px", fontWeight: 700, cursor: isSaving ? "default" : "pointer" }}>
              {isSaving ? "Saving..." : "Add Umpire"}
            </button>
          </div>
        </form>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Umpire List</h2>
        <div style={{ display: "grid", gap: "0.6rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {(["all", "active", "inactive"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStatusFilter(option)}
                style={{
                  padding: "0.55rem 0.85rem",
                  borderRadius: "999px",
                  border: statusFilter === option ? "1px solid #93c5fd" : "1px solid #dbe3f0",
                  backgroundColor: statusFilter === option ? "#dbeafe" : "#f8fafc",
                  color: statusFilter === option ? "#1d4ed8" : "#475569",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {option === "all" ? "All Statuses" : option === "active" ? "Active" : "Inactive"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {(["all", "baseball", "softball"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSportFilter(option)}
                style={{
                  padding: "0.55rem 0.85rem",
                  borderRadius: "999px",
                  border: sportFilter === option ? "1px solid #93c5fd" : "1px solid #dbe3f0",
                  backgroundColor: sportFilter === option ? "#dbeafe" : "#f8fafc",
                  color: sportFilter === option ? "#1d4ed8" : "#475569",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {option === "all" ? "All Sports" : option === "baseball" ? "Baseball" : "Softball"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {message && <div style={{ color: "#991b1b", fontWeight: 700 }}>{message}</div>}

      {filteredItems.length === 0 ? (
        <div style={{ padding: "1rem", border: "1px dashed #cbd5e1", borderRadius: "12px", color: "#64748b", backgroundColor: "#ffffff" }}>
          No umpires match the current filters.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.9rem" }}>
          {filteredItems.map((item) => {
            const editing = editingId === item.id;
            return (
              <div key={item.id} style={{ border: "1px solid #e2e8f0", borderRadius: "14px", backgroundColor: "#ffffff", padding: "1rem" }}>
                <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1.1fr) minmax(0, 1fr) auto", alignItems: "start" }}>
                  <div>
                    <div style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "0.25rem" }}>Umpire</div>
                    {editing ? (
                      <div style={{ display: "grid", gap: "0.6rem" }}>
                        <input value={editForm.name} onChange={(e) => setEditValue("name", e.target.value)} style={fieldStyle} />
                        <input value={editForm.phone} onChange={(e) => setEditValue("phone", e.target.value)} style={fieldStyle} placeholder="Phone" />
                        <input value={editForm.email} onChange={(e) => setEditValue("email", e.target.value)} style={fieldStyle} placeholder="Email" />
                      </div>
                    ) : (
                      <>
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>{item.name}</div>
                        <div style={{ color: "#475569", marginTop: "0.2rem" }}>{item.phone || "—"}</div>
                        <div style={{ color: "#475569", marginTop: "0.2rem" }}>{item.email || "—"}</div>
                      </>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "0.25rem" }}>Notes / Sports</div>
                    {editing ? (
                      <div style={{ display: "grid", gap: "0.6rem" }}>
                        <textarea value={editForm.notes} onChange={(e) => setEditValue("notes", e.target.value)} style={{ ...fieldStyle, minHeight: "96px", resize: "vertical" as const }} />
                        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                          <label style={{ display: "flex", gap: "0.45rem", alignItems: "center", fontWeight: 600, color: "#334155" }}>
                            <input type="checkbox" checked={editForm.doesBaseball} onChange={(e) => setEditValue("doesBaseball", e.target.checked)} />
                            Baseball
                          </label>
                          <label style={{ display: "flex", gap: "0.45rem", alignItems: "center", fontWeight: 600, color: "#334155" }}>
                            <input type="checkbox" checked={editForm.doesSoftball} onChange={(e) => setEditValue("doesSoftball", e.target.checked)} />
                            Softball
                          </label>
                          <label style={{ display: "flex", gap: "0.45rem", alignItems: "center", fontWeight: 600, color: "#334155" }}>
                            <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditValue("isActive", e.target.checked)} />
                            Active
                          </label>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ color: "#475569" }}>{item.notes || "—"}</div>
                        <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", marginTop: "0.6rem" }}>
                          {item.doesBaseball && <span style={{ display: "inline-block", padding: "0.3rem 0.55rem", borderRadius: "999px", backgroundColor: "#dbeafe", color: "#1d4ed8", fontWeight: 700, fontSize: "0.8rem" }}>Baseball</span>}
                          {item.doesSoftball && <span style={{ display: "inline-block", padding: "0.3rem 0.55rem", borderRadius: "999px", backgroundColor: "#fce7f3", color: "#be185d", fontWeight: 700, fontSize: "0.8rem" }}>Softball</span>}
                          {!item.doesBaseball && !item.doesSoftball && <span style={{ color: "#94a3b8" }}>—</span>}
                        </div>
                      </>
                    )}
                  </div>

                  <div>
					  <div style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "0.25rem" }}>
						Status / Assignments
					  </div>

					  <div
						style={{
						  display: "inline-block",
						  padding: "0.35rem 0.65rem",
						  borderRadius: "999px",
						  backgroundColor: item.isActive ? "#dcfce7" : "#fee2e2",
						  color: item.isActive ? "#166534" : "#991b1b",
						  fontWeight: 700,
						  fontSize: "0.82rem",
						}}
					  >
						{item.isActive ? "Active" : "Inactive"}
					  </div>

					  <div style={{ marginTop: "0.45rem" }}>
						<a
						  href={`/admin/umpire-schedule?umpireId=${item.id}&assignment=assigned`}
						  style={{
							color: "#1d4ed8",
							fontWeight: 600,
							textDecoration: "none",
						  }}
						>
						  Upcoming Games: {item.bookingCount}
						</a>
					  </div>
					</div>

                  <div style={{ display: "grid", gap: "0.5rem", minWidth: "180px" }}>
                    {!editing ? (
                      <button type="button" onClick={() => startEdit(item)} disabled={isSaving} style={{ padding: "0.6rem 0.85rem", backgroundColor: "#dbeafe", border: "1px solid #93c5fd", borderRadius: "8px", color: "#1d4ed8", fontWeight: 700, cursor: isSaving ? "default" : "pointer" }}>
                        Edit
                      </button>
                    ) : (
                      <>
                        <button type="button" onClick={() => handleSaveEdit(item.id)} disabled={isSaving} style={{ padding: "0.6rem 0.85rem", backgroundColor: "#dcfce7", border: "1px solid #86efac", borderRadius: "8px", color: "#166534", fontWeight: 700, cursor: isSaving ? "default" : "pointer" }}>
                          {isSaving ? "Saving..." : "Save"}
                        </button>
                        <button type="button" onClick={cancelEdit} disabled={isSaving} style={{ padding: "0.6rem 0.85rem", backgroundColor: "#f8fafc", border: "1px solid #dbe3f0", borderRadius: "8px", color: "#475569", fontWeight: 700, cursor: isSaving ? "default" : "pointer" }}>
                          Cancel
                        </button>
                      </>
                    )}
                    <button type="button" onClick={() => handleToggleActive(item)} disabled={isSaving} style={{ padding: "0.6rem 0.85rem", backgroundColor: item.isActive ? "#fef3c7" : "#dcfce7", border: item.isActive ? "1px solid #fcd34d" : "1px solid #86efac", borderRadius: "8px", color: item.isActive ? "#92400e" : "#166534", fontWeight: 700, cursor: isSaving ? "default" : "pointer" }}>
                      {item.isActive ? "Set Inactive" : "Set Active"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
