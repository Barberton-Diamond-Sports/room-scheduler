
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  bookingId: string;
  returnDate?: string;
};

export default function DeleteBookingButton({ bookingId, returnDate }: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleDelete() {
    const confirmed = window.confirm(
      "Delete this booking? This will remove it from the active calendar."
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        const destination = returnDate
          ? `/bookings?date=${returnDate}`
          : "/bookings";
        router.push(destination);
        router.refresh();
      } else {
        setMessage(result.message || "Delete failed.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      setMessage("Something went wrong while deleting the booking.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        style={{
          display: "inline-block",
          padding: "0.65rem 1rem",
          backgroundColor: "#fee2e2",
          border: "1px solid #fca5a5",
          borderRadius: "10px",
          color: "#991b1b",
          fontWeight: 600,
          cursor: isDeleting ? "default" : "pointer",
        }}
      >
        {isDeleting ? "Deleting..." : "Delete Booking"}
      </button>

      {message && (
        <div
          style={{
            marginTop: "0.75rem",
            color: "#991b1b",
            fontWeight: 600,
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
