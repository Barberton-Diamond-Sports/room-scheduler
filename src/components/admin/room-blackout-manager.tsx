
"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Room = {
  id: string;
  name: string;
  description: string;
};

type Item = {
  id: string;
  roomName: string;
  dateValue: string;
  displayDate: string;
  reason: string;
};

type Props = {
  rooms: Room[];
  items: Item[];
};

const inputStyle = {
  width: "100%",
  padding: "0.75rem 0.9rem",
  border: "1px solid #cbd5e1",
  borderRadius: "12px",
  backgroundColor: "#f8fafc",
  fontSize: "1rem",
  boxSizing: "border-box" as const,
};

export default function RoomBlackoutManager({ rooms, items }: Props) {
  const router = useRouter();
  const [blackoutDate, setBlackoutDate] = useState("");
  const [reason, setReason] = useState("");
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const groupedItems = useMemo(() => {
    const grouped = new Map<string, Item[]>();
    for (const item of items) {
      const key = item.dateValue;
      const current = grouped.get(key) || [];
      current.push(item);
      grouped.set(key, current);
    }
    return Array.from(grouped.entries()).map(([dateValue, values]) => ({
      dateValue,
      displayDate: values[0]?.displayDate || dateValue,
      values,
    }));
  }, [items]);

  function toggleRoom(id: string) {
    setSelectedRoomIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!blackoutDate) {
      setMessage("Please choose a blackout date.");
      return;
    }

    if (selectedRoomIds.length === 0) {
      setMessage("Please choose at least one field to black out.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/blackouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: blackoutDate,
          roomIds: selectedRoomIds,
          reason,
        }),
      });
      const result = await response.json();

      if (result.success) {
        setBlackoutDate("");
        setReason("");
        setSelectedRoomIds([]);
        router.refresh();
      } else {
        setMessage(result.message || "Unable to create blackout.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong while creating the blackout.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string, roomName: string, displayDate: string) {
    const confirmed = window.confirm(`Remove blackout for ${roomName} on ${displayDate}?`);
    if (!confirmed) return;

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/blackouts/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        router.refresh();
      } else {
        setMessage(result.message || "Unable to remove blackout.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong while removing the blackout.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <form onSubmit={handleCreate} style={{ display: "grid", gap: "1rem" }}>
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "220px 1fr auto", alignItems: "end" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600, color: "#334155" }}>Blackout Date</label>
            <input type="date" value={blackoutDate} onChange={(e) => setBlackoutDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600, color: "#334155" }}>Reason (optional)</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} style={inputStyle} placeholder="Holiday, rainout, maintenance..." />
          </div>
          <button type="submit" disabled={isSaving} style={{ padding: "0.85rem 1.25rem", backgroundColor: "#2563eb", color: "#ffffff", border: "none", borderRadius: "12px", fontWeight: 700, cursor: isSaving ? "default" : "pointer" }}>
            {isSaving ? "Saving..." : "Create Blackout"}
          </button>
        </div>

        <div>
          <div style={{ fontWeight: 600, color: "#334155", marginBottom: "0.6rem" }}>Choose Fields</div>
          <div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {rooms.map((room) => {
              const checked = selectedRoomIds.includes(room.id);
              return (
                <label key={room.id} style={{ display: "flex", gap: "0.7rem", alignItems: "flex-start", backgroundColor: checked ? "#eff6ff" : "#f8fafc", border: checked ? "1px solid #93c5fd" : "1px solid #e2e8f0", borderRadius: "12px", padding: "0.8rem 0.9rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleRoom(room.id)} style={{ marginTop: "0.2rem" }} />
                  <span>
                    <span style={{ display: "block", fontWeight: 700, color: "#0f172a" }}>{room.name}</span>
                    <span style={{ display: "block", color: "#64748b", marginTop: "0.15rem", fontSize: "0.9rem" }}>{room.description.trim() || "No description"}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </form>

      {message && <div style={{ color: "#991b1b", fontWeight: 600 }}>{message}</div>}

      <div>
        <h2 style={{ marginTop: 0, marginBottom: "0.75rem", fontWeight: 600 }}>Current & Future Blackouts</h2>
        {groupedItems.length === 0 ? (
          <div style={{ padding: "1rem", border: "1px dashed #cbd5e1", borderRadius: "12px", color: "#64748b" }}>
            No field blackouts have been created yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {groupedItems.map((group) => (
              <div key={group.dateValue} style={{ border: "1px solid #e2e8f0", borderRadius: "14px", backgroundColor: "#f8fafc", padding: "1rem" }}>
                <div style={{ fontWeight: 600, color: "#0f172a", marginBottom: "0.75rem" }}>{group.displayDate}</div>
                <div style={{ display: "grid", gap: "0.65rem" }}>
                  {group.values.map((item) => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.85rem 0.95rem" }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{item.roomName}</div>
                        <div style={{ color: "#64748b", marginTop: "0.2rem" }}>{item.reason.trim() || "Whole-day blackout"}</div>
                      </div>
                      <button type="button" onClick={() => handleDelete(item.id, item.roomName, item.displayDate)} disabled={isSaving} style={{ padding: "0.55rem 0.8rem", backgroundColor: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", color: "#991b1b", fontWeight: 700, cursor: isSaving ? "default" : "pointer" }}>
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
