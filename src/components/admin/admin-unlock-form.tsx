"use client";

import { useState } from "react";

type Props = {
  nextUrl: string;
};

export default function AdminUnlockForm({ nextUrl }: Props) {
  const [passcode, setPasscode] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ passcode }),
      });

      const result = await response.json();

      if (result.success) {
        window.location.assign(nextUrl);
        return;
      } else {
        setMessage("Incorrect passcode.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fb",
        padding: "2rem",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "#ffffff",
          border: "1px solid #dbe3f0",
          borderRadius: "16px",
          padding: "1.5rem",
          boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)",
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Admin Access</h1>
        <p style={{ marginTop: 0, color: "#4b5563", marginBottom: "1rem" }}>
          Enter the admin passcode to continue.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
          <div>
            <label
              htmlFor="passcode"
              style={{
                display: "block",
                marginBottom: "0.4rem",
                fontWeight: 600,
                color: "#334155",
              }}
            >
              Passcode
            </label>
            <input
              id="passcode"
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem 0.9rem",
                border: "1px solid #cbd5e1",
                borderRadius: "12px",
                backgroundColor: "#f8fafc",
                fontSize: "1rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: "0.85rem 1.25rem",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              fontWeight: 600,
              cursor: isSubmitting ? "default" : "pointer",
            }}
          >
            {isSubmitting ? "Checking..." : "Enter Admin Area"}
          </button>

          {message && (
            <div
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fca5a5",
                color: "#991b1b",
                borderRadius: "12px",
                padding: "0.9rem 1rem",
                fontWeight: 600,
              }}
            >
              {message}
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
