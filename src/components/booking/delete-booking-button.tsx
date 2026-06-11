"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  bookingId: string;
  backHref?: string;
};

export default function DeleteBookingButton({ bookingId, backHref }: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm("Are you sure you want to delete this booking?");
    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!result.success) {
        alert(result.message || "Failed to delete booking.");
        setIsDeleting(false);
        return;
      }

      if (backHref) {
        router.push(backHref);
      } else {
        router.push("/bookings");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Something went wrong while deleting the booking.");
      setIsDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      style={{
        padding: "0.65rem 1rem",
        backgroundColor: "#fee2e2",
        border: "1px solid #fca5a5",
        borderRadius: "10px",
        color: "#991b1b",
        fontWeight: 600,
        cursor: isDeleting ? "default" : "pointer",
      }}
    >
      {isDeleting ? "Deleting..." : "Delete"}
    </button>
  );
}