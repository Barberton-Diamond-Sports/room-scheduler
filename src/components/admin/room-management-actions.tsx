"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Room = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
};

type Props =
  | { mode: "create"; room?: never; bookingCount?: never }
  | { mode: "manage"; room: Room; bookingCount: number };

const fieldStyle = {
  width: "100%",
  padding: "0.75rem 0.9rem",
  border: "1px solid #cbd5e1",
  borderRadius: "12px",
  backgroundColor: "#f8fafc",
  fontSize: "1rem",
  boxSizing: "border-box" as const,
};

const compactFieldStyle = {
  width: "100%",
  padding: "0.55rem 0.7rem",
  border: "1px solid #cbd5e1",
  borderRadius: "10px",
  backgroundColor: "#f8fafc",
  fontSize: "0.95rem",
  boxSizing: "border-box" as const,
};

export default function RoomManagementActions(props: Props) {
  const router = useRouter();

  const [name, setName] = useState(props.mode === "create" ? "" : props.room.name);
  const [description, setDescription] = useState(
    props.mode === "create" ? "" : props.room.description || ""
  );
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (props.mode !== "create") return;

    if (!name.trim()) {
      setMessage("Field name is required.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        setName("");
        setDescription("");
        router.refresh();
      } else {
        setMessage(result.message || "Unable to add field.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong while adding the field.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive() {
    if (props.mode !== "manage") return;

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/rooms/${props.room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !props.room.isActive }),
      });

      const result = await response.json();

      if (result.success) {
        router.refresh();
      } else {
        setMessage(result.message || "Unable to update field status.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong while updating the field.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveEdit() {
    if (props.mode !== "manage") return;

    if (!name.trim()) {
      setMessage("Field name is required.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/rooms/${props.room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsEditing(false);
        router.refresh();
      } else {
        setMessage(result.message || "Unable to update field details.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong while updating the field.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancelEdit() {
    if (props.mode !== "manage") return;
    setName(props.room.name);
    setDescription(props.room.description || "");
    setMessage("");
    setIsEditing(false);
  }

  async function handleDelete() {
    if (props.mode !== "manage") return;

    const confirmed = window.confirm(
      `Delete ${props.room.name}? This permanently removes the field.`
    );
    if (!confirmed) return;

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/rooms/${props.room.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        router.refresh();
      } else {
        setMessage(result.message || "Unable to delete field.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong while deleting the field.");
    } finally {
      setIsSaving(false);
    }
  }

  if (props.mode === "create") {
    return (
      <form
        onSubmit={handleCreate}
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "1fr 1.4fr auto",
          alignItems: "end",
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              marginBottom: "0.4rem",
              fontWeight: 600,
              color: "#334155",
            }}
          >
            Field Name
          </label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={fieldStyle} />
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: "0.4rem",
              fontWeight: 600,
              color: "#334155",
            }}
          >
            Description
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={fieldStyle}
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          style={{
            padding: "0.85rem 1.25rem",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "12px",
            fontWeight: 700,
            cursor: isSaving ? "default" : "pointer",
          }}
        >
          {isSaving ? "Adding..." : "Add Field"}
        </button>

        {message && (
          <div style={{ gridColumn: "1 / -1", color: "#991b1b", fontWeight: 600 }}>
            {message}
          </div>
        )}
      </form>
    );
  }

  const statusPill = (
    <span
      style={{
        display: "inline-block",
        padding: "0.35rem 0.65rem",
        borderRadius: "999px",
        backgroundColor: props.room.isActive ? "#dcfce7" : "#fee2e2",
        color: props.room.isActive ? "#166534" : "#991b1b",
        fontWeight: 700,
        fontSize: "0.82rem",
      }}
    >
      {props.room.isActive ? "Active" : "Inactive"}
    </span>
  );

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "14px",
        padding: "1rem",
        backgroundColor: "#ffffff",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1.3fr 120px 120px 1.6fr",
          gap: "1rem",
          alignItems: "start",
        }}
      >
        <div>
          <div style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "0.25rem" }}>
            Field
          </div>
          {!isEditing ? (
            <div style={{ fontWeight: 700, color: "#0f172a" }}>{props.room.name}</div>
          ) : (
            <input value={name} onChange={(e) => setName(e.target.value)} style={compactFieldStyle} />
          )}
        </div>

        <div>
          <div style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "0.25rem" }}>
            Description
          </div>
          {!isEditing ? (
            <div style={{ color: "#475569" }}>{props.room.description?.trim() || "—"}</div>
          ) : (
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={compactFieldStyle}
            />
          )}
        </div>

        <div>
          <div style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "0.25rem" }}>
            Status
          </div>
          {statusPill}
        </div>

        <div>
          <div style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "0.25rem" }}>
            Bookings
          </div>
          <div style={{ color: "#334155", fontWeight: 600 }}>{props.bookingCount}</div>
        </div>

        <div>
          <div style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "0.25rem" }}>
            Actions
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {!isEditing ? (
              <button
                type="button"
                onClick={() => {
                  setMessage("");
                  setIsEditing(true);
                }}
                disabled={isSaving}
                style={{
                  padding: "0.5rem 0.8rem",
                  backgroundColor: "#dbeafe",
                  border: "1px solid #93c5fd",
                  borderRadius: "8px",
                  color: "#1d4ed8",
                  fontWeight: 700,
                  cursor: isSaving ? "default" : "pointer",
                }}
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  style={{
                    padding: "0.5rem 0.8rem",
                    backgroundColor: "#dcfce7",
                    border: "1px solid #86efac",
                    borderRadius: "8px",
                    color: "#166534",
                    fontWeight: 700,
                    cursor: isSaving ? "default" : "pointer",
                  }}
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>

                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  style={{
                    padding: "0.5rem 0.8rem",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #dbe3f0",
                    borderRadius: "8px",
                    color: "#475569",
                    fontWeight: 700,
                    cursor: isSaving ? "default" : "pointer",
                  }}
                >
                  Cancel
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleToggleActive}
              disabled={isSaving}
              style={{
                padding: "0.5rem 0.8rem",
                backgroundColor: props.room.isActive ? "#fef3c7" : "#dcfce7",
                border: props.room.isActive ? "1px solid #fcd34d" : "1px solid #86efac",
                borderRadius: "8px",
                color: props.room.isActive ? "#92400e" : "#166534",
                fontWeight: 700,
                cursor: isSaving ? "default" : "pointer",
              }}
            >
              {props.room.isActive ? "Deactivate" : "Activate"}
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isSaving}
              style={{
                padding: "0.5rem 0.8rem",
                backgroundColor: "#fee2e2",
                border: "1px solid #fca5a5",
                borderRadius: "8px",
                color: "#991b1b",
                fontWeight: 700,
                cursor: isSaving ? "default" : "pointer",
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div style={{ marginTop: "0.75rem", color: "#991b1b", fontWeight: 600, fontSize: "0.85rem" }}>
          {message}
        </div>
      )}
    </div>
  );
}