"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Room = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  allowGames: boolean;
  allowPractices: boolean;
  allowScrimmages: boolean;
  allowOther: boolean;
};

type Props =
  | { mode: "create"; room?: never; bookingCount?: never }
  | { mode: "manage"; room: Room; bookingCount: number };

const fieldStyle = {
  width: "100%",
  padding: "0.75rem 0.9rem",
  border: "1px solid #cbd5e1",
  borderRadius: "12px",
  backgroundColor: "#ffffff",
  color: "#0f172a",
  fontSize: "1rem",
  boxSizing: "border-box" as const,
  opacity: 1,
  WebkitTextFillColor: "#0f172a",
};

const compactFieldStyle = {
  width: "100%",
  padding: "0.55rem 0.7rem",
  border: "1px solid #cbd5e1",
  borderRadius: "10px",
  backgroundColor: "#ffffff",
  color: "#0f172a",
  fontSize: "0.95rem",
  boxSizing: "border-box" as const,
  opacity: 1,
  WebkitTextFillColor: "#0f172a",
};

const permissionGridStyle = {
  display: "grid",
  gap: "0.6rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
};

const permissionCheckboxLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "0.65rem 0.75rem",
  border: "1px solid #dbe3f0",
  borderRadius: "10px",
  backgroundColor: "#f8fafc",
  color: "#334155",
  fontWeight: 600,
  cursor: "pointer",
};

function allowedTypesText(values: {
  allowGames: boolean;
  allowPractices: boolean;
  allowScrimmages: boolean;
  allowOther: boolean;
}) {
  const allowed: string[] = [];

  if (values.allowGames) allowed.push("Games");
  if (values.allowPractices) allowed.push("Practices");
  if (values.allowScrimmages) allowed.push("Scrimmages");
  if (values.allowOther) allowed.push("Other");

  return allowed.length > 0 ? allowed.join(", ") : "None";
}

export default function RoomManagementActions(props: Props) {
  const router = useRouter();

  const [name, setName] = useState(props.mode === "create" ? "" : props.room.name);
  const [description, setDescription] = useState(
    props.mode === "create" ? "" : props.room.description || ""
  );

  const [allowGames, setAllowGames] = useState(
    props.mode === "create" ? true : props.room.allowGames
  );
  const [allowPractices, setAllowPractices] = useState(
    props.mode === "create" ? true : props.room.allowPractices
  );
  const [allowScrimmages, setAllowScrimmages] = useState(
    props.mode === "create" ? true : props.room.allowScrimmages
  );
  const [allowOther, setAllowOther] = useState(
    props.mode === "create" ? true : props.room.allowOther
  );

  const [displayName, setDisplayName] = useState(
    props.mode === "create" ? "" : props.room.name
  );
  const [displayDescription, setDisplayDescription] = useState(
    props.mode === "create" ? "" : props.room.description || ""
  );
  const [displayIsActive, setDisplayIsActive] = useState(
    props.mode === "create" ? true : props.room.isActive
  );

  const [displayAllowGames, setDisplayAllowGames] = useState(
    props.mode === "create" ? true : props.room.allowGames
  );
  const [displayAllowPractices, setDisplayAllowPractices] = useState(
    props.mode === "create" ? true : props.room.allowPractices
  );
  const [displayAllowScrimmages, setDisplayAllowScrimmages] = useState(
    props.mode === "create" ? true : props.room.allowScrimmages
  );
  const [displayAllowOther, setDisplayAllowOther] = useState(
    props.mode === "create" ? true : props.room.allowOther
  );

  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (props.mode !== "manage") return;

    setName(props.room.name);
    setDescription(props.room.description || "");
    setAllowGames(props.room.allowGames);
    setAllowPractices(props.room.allowPractices);
    setAllowScrimmages(props.room.allowScrimmages);
    setAllowOther(props.room.allowOther);

    setDisplayName(props.room.name);
    setDisplayDescription(props.room.description || "");
    setDisplayIsActive(props.room.isActive);
    setDisplayAllowGames(props.room.allowGames);
    setDisplayAllowPractices(props.room.allowPractices);
    setDisplayAllowScrimmages(props.room.allowScrimmages);
    setDisplayAllowOther(props.room.allowOther);
  }, [
    props.mode,
    props.mode === "manage" ? props.room.id : null,
    props.mode === "manage" ? props.room.name : null,
    props.mode === "manage" ? props.room.description : null,
    props.mode === "manage" ? props.room.isActive : null,
    props.mode === "manage" ? props.room.allowGames : null,
    props.mode === "manage" ? props.room.allowPractices : null,
    props.mode === "manage" ? props.room.allowScrimmages : null,
    props.mode === "manage" ? props.room.allowOther : null,
  ]);

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
          allowGames,
          allowPractices,
          allowScrimmages,
          allowOther,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setName("");
        setDescription("");
        setAllowGames(true);
        setAllowPractices(true);
        setAllowScrimmages(true);
        setAllowOther(true);
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
        body: JSON.stringify({ isActive: !displayIsActive }),
      });

      const result = await response.json();

      if (result.success) {
        setDisplayIsActive(result.room.isActive);
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
          allowGames,
          allowPractices,
          allowScrimmages,
          allowOther,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setDisplayName(result.room.name);
        setDisplayDescription(result.room.description || "");
        setDisplayAllowGames(result.room.allowGames);
        setDisplayAllowPractices(result.room.allowPractices);
        setDisplayAllowScrimmages(result.room.allowScrimmages);
        setDisplayAllowOther(result.room.allowOther);

        setName(result.room.name);
        setDescription(result.room.description || "");
        setAllowGames(result.room.allowGames);
        setAllowPractices(result.room.allowPractices);
        setAllowScrimmages(result.room.allowScrimmages);
        setAllowOther(result.room.allowOther);

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

    setName(displayName);
    setDescription(displayDescription);
    setAllowGames(displayAllowGames);
    setAllowPractices(displayAllowPractices);
    setAllowScrimmages(displayAllowScrimmages);
    setAllowOther(displayAllowOther);

    setMessage("");
    setIsEditing(false);
  }

  async function handleDelete() {
    if (props.mode !== "manage") return;

    const confirmed = window.confirm(`Delete ${displayName}? This permanently removes the field.`);
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

  const createPermissionControls = (
    <div style={{ gridColumn: "1 / -1" }}>
      <div
        style={{
          fontWeight: 700,
          color: "#334155",
          marginBottom: "0.55rem",
        }}
      >
        Allowed Booking Types
      </div>

      <div style={permissionGridStyle}>
        <label style={permissionCheckboxLabelStyle}>
          <input
            type="checkbox"
            checked={allowGames}
            onChange={(e) => setAllowGames(e.target.checked)}
          />
          Games
        </label>

        <label style={permissionCheckboxLabelStyle}>
          <input
            type="checkbox"
            checked={allowPractices}
            onChange={(e) => setAllowPractices(e.target.checked)}
          />
          Practices
        </label>

        <label style={permissionCheckboxLabelStyle}>
          <input
            type="checkbox"
            checked={allowScrimmages}
            onChange={(e) => setAllowScrimmages(e.target.checked)}
          />
          Scrimmages
        </label>

        <label style={permissionCheckboxLabelStyle}>
          <input
            type="checkbox"
            checked={allowOther}
            onChange={(e) => setAllowOther(e.target.checked)}
          />
          Other / Reserved
        </label>
      </div>
    </div>
  );

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

        {createPermissionControls}

        {message && (
          <div style={{ gridColumn: "1 / -1", color: "#991b1b", fontWeight: 600 }}>
            {message}
          </div>
        )}
      </form>
    );
  }

  const canDelete =
    props.mode === "manage" && !displayIsActive && props.bookingCount === 0;

  const deleteUnavailableReason = displayIsActive
    ? "This field must be deactivated before it can be deleted."
    : props.bookingCount > 0
      ? "This field cannot be deleted because it has future bookings."
      : "";

  const statusPill = (
    <span
      style={{
        display: "inline-block",
        padding: "0.35rem 0.65rem",
        borderRadius: "999px",
        backgroundColor: displayIsActive ? "#dcfce7" : "#fee2e2",
        color: displayIsActive ? "#166534" : "#991b1b",
        fontWeight: 700,
        fontSize: "0.82rem",
      }}
    >
      {displayIsActive ? "Active" : "Inactive"}
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
          gridTemplateColumns: "1.2fr 1.3fr 120px 120px 1.4fr",
          gap: "1rem",
          alignItems: "start",
        }}
      >
        <div>
          <div style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "0.25rem" }}>
            Field
          </div>
          {!isEditing ? (
            <div style={{ fontWeight: 700, color: "#0f172a" }}>{displayName}</div>
          ) : (
            <input value={name} onChange={(e) => setName(e.target.value)} style={compactFieldStyle} />
          )}
        </div>

        <div>
          <div style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "0.25rem" }}>
            Description
          </div>
          {!isEditing ? (
            <div style={{ color: "#475569" }}>{displayDescription.trim() || "—"}</div>
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
                backgroundColor: displayIsActive ? "#fef3c7" : "#dcfce7",
                border: displayIsActive ? "1px solid #fcd34d" : "1px solid #86efac",
                borderRadius: "8px",
                color: displayIsActive ? "#92400e" : "#166534",
                fontWeight: 700,
                cursor: isSaving ? "default" : "pointer",
              }}
            >
              {displayIsActive ? "Deactivate" : "Activate"}
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isSaving || !canDelete}
              style={{
                padding: "0.5rem 0.8rem",
                backgroundColor: canDelete ? "#fee2e2" : "#e5e7eb",
                border: canDelete ? "1px solid #fca5a5" : "1px solid #cbd5e1",
                borderRadius: "8px",
                color: canDelete ? "#991b1b" : "#64748b",
                fontWeight: 700,
                cursor: isSaving || !canDelete ? "not-allowed" : "pointer",
              }}
              title={!canDelete ? deleteUnavailableReason : undefined}
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "0.85rem",
          borderTop: "1px solid #e2e8f0",
          paddingTop: "0.85rem",
        }}
      >
        <div style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "0.35rem" }}>
          Allowed Booking Types
        </div>

        {!isEditing ? (
          <div style={{ color: "#334155", fontWeight: 700, lineHeight: 1.4 }}>
            {allowedTypesText({
              allowGames: displayAllowGames,
              allowPractices: displayAllowPractices,
              allowScrimmages: displayAllowScrimmages,
              allowOther: displayAllowOther,
            })}
          </div>
        ) : (
          <div style={permissionGridStyle}>
            <label style={permissionCheckboxLabelStyle}>
              <input
                type="checkbox"
                checked={allowGames}
                onChange={(e) => setAllowGames(e.target.checked)}
              />
              Games
            </label>

            <label style={permissionCheckboxLabelStyle}>
              <input
                type="checkbox"
                checked={allowPractices}
                onChange={(e) => setAllowPractices(e.target.checked)}
              />
              Practices
            </label>

            <label style={permissionCheckboxLabelStyle}>
              <input
                type="checkbox"
                checked={allowScrimmages}
                onChange={(e) => setAllowScrimmages(e.target.checked)}
              />
              Scrimmages
            </label>

            <label style={permissionCheckboxLabelStyle}>
              <input
                type="checkbox"
                checked={allowOther}
                onChange={(e) => setAllowOther(e.target.checked)}
              />
              Other / Reserved
            </label>
          </div>
        )}
      </div>

      {props.mode === "manage" && !canDelete && deleteUnavailableReason && !message && (
        <div
          style={{
            marginTop: "0.75rem",
            color: "#64748b",
            fontWeight: 600,
            fontSize: "0.85rem",
          }}
        >
          {deleteUnavailableReason}
        </div>
      )}

      {message && (
        <div
          style={{
            marginTop: "0.75rem",
            color: "#991b1b",
            fontWeight: 600,
            fontSize: "0.85rem",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}