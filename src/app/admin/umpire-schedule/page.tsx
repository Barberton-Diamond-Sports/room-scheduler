
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import UmpireAssignmentActions from "@/components/admin/umpire-assignment-actions";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeLabel(totalMinutes: number) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${hours12}:${pad(minutes)} ${suffix}`;
}

function inferSport(teamGroup: string | null) {
  return teamGroup?.toLowerCase().includes("softball") ? "softball" : "baseball";
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UmpireSchedulePage() {
  const today = new Date();
  const startingDate = new Date(today);
  startingDate.setDate(today.getDate() - 3);
  startingDate.setHours(0, 0, 0, 0);

  const [bookings, umpires] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: "ACTIVE",
        bookingDate: { gte: startingDate },
        title: { in: ["Game", "Tournament", "Scrimmage"] },
      },
      include: {
        room: true,
        umpireRecord: true,
      },
      orderBy: [
        { bookingDate: "asc" },
        { startTimeMinutes: "asc" },
        { roomId: "asc" },
      ],
    }),
    prisma.umpire.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
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
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
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
          <h1 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Umpire Schedule</h1>
          <p style={{ marginTop: 0, color: "#4b5563", marginBottom: "1rem" }}>
            Assign active umpires to upcoming games, tournaments, and scrimmages. By default, this page shows events from the last 3 days through the future.
          </p>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Link
              href="/admin"
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
              Back to Admin
            </Link>
            <Link
              href={`/bookings?date=${toDateInputValue(new Date())}&view=week`}
              style={{
                display: "inline-block",
                padding: "0.65rem 1rem",
                backgroundColor: "#dbeafe",
                border: "1px solid #93c5fd",
                borderRadius: "10px",
                color: "#1d4ed8",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Open Weekly Calendar
            </Link>
            <Link
              href="/admin/umpires"
              style={{
                display: "inline-block",
                padding: "0.65rem 1rem",
                backgroundColor: "#fef3c7",
                border: "1px solid #facc15",
                borderRadius: "10px",
                color: "#92400e",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Manage Umpires
            </Link>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #dbe3f0",
            borderRadius: "16px",
            padding: "1rem",
            boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)",
          }}
        >
          {bookings.length === 0 ? (
            <div
              style={{
                padding: "1rem",
                border: "1px dashed #cbd5e1",
                borderRadius: "12px",
                color: "#64748b",
              }}
            >
              No game-type bookings were found in the current date window.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "0.85rem" }}>
              {bookings.map((booking) => {
                const sport = inferSport(booking.teamGroup);
                return (
                  <div
                    key={booking.id}
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
                        gap: "1rem",
                        gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1.1fr) minmax(320px, 420px)",
                        alignItems: "start",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>
                          {booking.title || "Game"}
                        </div>
                        <div style={{ color: "#334155", marginTop: "0.2rem" }}>
                          {booking.teamGroup || "—"}
                        </div>
                        <div style={{ color: "#64748b", marginTop: "0.2rem", fontSize: "0.92rem" }}>
                          {formatDate(booking.bookingDate)} · {formatTimeLabel(booking.startTimeMinutes)} - {formatTimeLabel(booking.endTimeMinutes)}
                        </div>
                      </div>

                      <div>
                        <div style={{ color: "#334155", fontWeight: 700 }}>{booking.room.name}</div>
                        <div style={{ color: "#64748b", marginTop: "0.2rem" }}>
                          Opponent: {booking.opponent?.trim() || "—"}
                        </div>
                        <div style={{ color: "#64748b", marginTop: "0.2rem" }}>
                          Sport: {sport === "softball" ? "Softball" : "Baseball"}
                        </div>
                      </div>

                      <UmpireAssignmentActions
                        bookingId={booking.id}
                        currentUmpireId={booking.umpireId}
                        currentUmpireName={booking.umpireRecord?.name || booking.umpire || null}
                        sport={sport}
                        umpires={umpires.map((umpire) => ({
                          id: umpire.id,
                          name: umpire.name,
                          doesBaseball: umpire.doesBaseball,
                          doesSoftball: umpire.doesSoftball,
                        }))}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
