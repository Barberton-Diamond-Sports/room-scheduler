
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  bookingId: string;
  currentUmpire?: string | null;
};

export default function UmpireAssignmentActions({ bookingId, currentUmpire }: Props) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSetUmpire() {
    const initialValue = currentUmpire || "";
    const nextValue = window.prompt("Enter umpire name:", initialValue);

    if (nextValue === null) return;

    const trimmed = nextValue.trim();
    if (!trimmed) {
      setMessage("Enter an umpire name, or use Clear Umpire.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/bookings/${bookingId}/umpire`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ umpire: trimmed }),
      });

      const result = await response.json();

      if (result.success) {
        router.refresh();
      } else {
        setMessage(result.message || "Unable to save umpire.");
      }
    } catch (error) {
      console.error("Set umpire error:", error);
      setMessage("Something went wrong while saving the umpire.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleClearUmpire() {
    const confirmed = window.confirm("Are you sure you want to clear the umpire for this game?");
    if (!confirmed) return;

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/bookings/${bookingId}/umpire`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ umpire: "" }),
      });

      const result = await response.json();

      if (result.success) {
        router.refresh();
      } else {
        setMessage(result.message || "Unable to clear umpire.");
      }
    } catch (error) {
      console.error("Clear umpire error:", error);
      setMessage("Something went wrong while clearing the umpire.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-start" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleSetUmpire}
          disabled={isSaving}
          style={{
            padding: "0.45rem 0.7rem",
            backgroundColor: "#dbeafe",
            border: "1px solid #93c5fd",
            borderRadius: "8px",
            color: "#1d4ed8",
            fontWeight: 600,
            cursor: isSaving ? "default" : "pointer",
          }}
        >
          Set Umpire
        </button>

        <button
          type="button"
          onClick={handleClearUmpire}
          disabled={isSaving || !currentUmpire?.trim()}
          style={{
            padding: "0.45rem 0.7rem",
            backgroundColor: !currentUmpire?.trim() ? "#f8fafc" : "#fee2e2",
            border: !currentUmpire?.trim() ? "1px solid #dbe3f0" : "1px solid #fca5a5",
            borderRadius: "8px",
            color: !currentUmpire?.trim() ? "#94a3b8" : "#991b1b",
            fontWeight: 600,
            cursor: isSaving || !currentUmpire?.trim() ? "default" : "pointer",
          }}
        >
          Clear Umpire
        </button>
      </div>

      {message && (
        <div style={{ color: "#991b1b", fontSize: "0.85rem", fontWeight: 600 }}>
          {message}
        </div>
      )}
    </div>
  );
}
