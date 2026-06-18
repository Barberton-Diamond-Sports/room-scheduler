"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type UmpireOption = {
  id: string;
  name: string;
  doesBaseball: boolean;
  doesSoftball: boolean;
};

type Props = {
  bookingId: string;
  currentUmpireId: string | null;
  currentUmpireName: string | null;
  sport: "baseball" | "softball";
  umpires: UmpireOption[];
  hideClearButton?: boolean;
};

const selectStyle = {
  width: "100%",
  padding: "0.7rem 0.85rem",
  border: "1px solid #cbd5e1",
  borderRadius: "10px",
  backgroundColor: "#ffffff",
  color: "#0f172a",
  fontSize: "0.95rem",
  boxSizing: "border-box" as const,
  opacity: 1,
  WebkitTextFillColor: "#0f172a",
};

export default function UmpireAssignmentActions({
  bookingId,
  currentUmpireId,
  currentUmpireName,
  sport,
  umpires,
  hideClearButton = false,
}: Props) {
  const router = useRouter();
  const [selectedUmpireId, setSelectedUmpireId] = useState(currentUmpireId || "");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const filteredUmpires = useMemo(() => {
    return umpires.filter((umpire) =>
      sport === "softball" ? umpire.doesSoftball : umpire.doesBaseball
    );
  }, [sport, umpires]);

  async function handleAssign() {
    if (!selectedUmpireId) {
      setMessage("Choose an umpire before assigning.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/bookings/${bookingId}/umpire`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ umpireId: selectedUmpireId }),
      });
      const result = await response.json();
      if (result.success) {
        router.refresh();
      } else {
        setMessage(result.message || "Unable to assign umpire.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong while assigning the umpire.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleClear() {
    const confirmed = window.confirm("Clear the umpire assignment for this game?");
    if (!confirmed) return;

    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/bookings/${bookingId}/umpire`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ umpireId: null }),
      });
      const result = await response.json();
      if (result.success) {
        setSelectedUmpireId("");
        router.refresh();
      } else {
        setMessage(result.message || "Unable to clear umpire.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong while clearing the umpire.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "0.6rem" }}>
      <select
        value={selectedUmpireId}
        onChange={(e) => setSelectedUmpireId(e.target.value)}
        style={selectStyle}
        disabled={isSaving}
      >
        <option value="">Select active umpire…</option>
        {filteredUmpires.map((umpire) => (
          <option key={umpire.id} value={umpire.id}>
            {umpire.name}
          </option>
        ))}
      </select>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleAssign}
          disabled={isSaving}
          style={{
            padding: "0.55rem 0.8rem",
            backgroundColor: "#dbeafe",
            border: "1px solid #93c5fd",
            borderRadius: "8px",
            color: "#1d4ed8",
            fontWeight: 700,
            cursor: isSaving ? "default" : "pointer",
          }}
        >
          {isSaving ? "Saving..." : "Set Umpire"}
        </button>

        {!hideClearButton && (
          <button
            type="button"
            onClick={handleClear}
            disabled={isSaving || !currentUmpireName}
            style={{
              padding: "0.55rem 0.8rem",
              backgroundColor: "#fee2e2",
              border: "1px solid #fca5a5",
              borderRadius: "8px",
              color: "#991b1b",
              fontWeight: 700,
              cursor: isSaving || !currentUmpireName ? "default" : "pointer",
            }}
          >
            Clear Umpire
          </button>
        )}
      </div>

      {filteredUmpires.length === 0 && (
        <div style={{ color: "#92400e", fontWeight: 600, fontSize: "0.85rem" }}>
          No active {sport === "softball" ? "softball" : "baseball"} umpires are available in the master list.
        </div>
      )}

      {message && (
        <div style={{ color: "#991b1b", fontWeight: 600, fontSize: "0.85rem" }}>
          {message}
        </div>
      )}
    </div>
  );
}
