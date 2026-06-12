import Link from "next/link";
import { prisma } from "@/lib/prisma";
import BookingForm from "@/components/booking/booking-form";

export default async function BookPage() {
  const [rooms, teams] = await Promise.all([
    prisma.room.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.team.findMany({
      where: { isActive: true },
      orderBy: [
        { teamName: "asc" },
        { year: "desc" },
        { season: "asc" },
      ],
    }),
  ]);

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fb",
        padding: "2rem",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #dbe3f0",
            borderRadius: "16px",
            padding: "1.5rem",
            marginBottom: "1.5rem",
            boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)",
          }}
        >
          <h1 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Book a Field</h1>
          <p style={{ marginTop: 0, color: "#4b5563" }}>
            Use the form below to reserve a field in 30-minute blocks. If this is a game, please enter the game - for example "Barberton Purple vs. Manchester"
          </p>

          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              marginTop: "1rem",
            }}
          >
            <Link
              href="/"
              style={{
                display: "inline-block",
                padding: "0.65rem 1rem",
                backgroundColor: "#eef2ff",
                border: "1px solid #c7d2fe",
                borderRadius: "10px",
                color: "#1e3a8a",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Home
            </Link>

            <Link
              href="/admin"
              style={{
                display: "inline-block",
                padding: "0.65rem 1rem",
                backgroundColor: "#f3e8ff",
                border: "1px solid #d8b4fe",
                borderRadius: "10px",
                color: "#6b21a8",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Admin
            </Link>

            <Link
              href="/bookings"
              style={{
                display: "inline-block",
                padding: "0.65rem 1rem",
                backgroundColor: "#ecfeff",
                border: "1px solid #a5f3fc",
                borderRadius: "10px",
                color: "#155e75",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Calendar
            </Link>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #dbe3f0",
            borderRadius: "16px",
            padding: "1.5rem",
            boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)",
          }}
        >
          <BookingForm rooms={rooms} teams={teams} />
        </div>
      </div>
    </main>
  );
}
