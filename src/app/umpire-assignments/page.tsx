import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import UmpireAssignmentActions from "@/components/admin/umpire-assignment-actions";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDayHeading(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeRange(startMinutes: number, endMinutes: number) {
  function formatMinutes(totalMinutes: number) {
    const hours24 = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const suffix = hours24 >= 12 ? "PM" : "AM";
    let hours12 = hours24 % 12;
    if (hours12 === 0) hours12 = 12;
    return `${hours12}:${pad(minutes)} ${suffix}`;
  }

  return `${formatMinutes(startMinutes)} - ${formatMinutes(endMinutes)}`;
}

function inferSport(teamGroup: string | null) {
  return teamGroup?.toLowerCase().includes("softball")
    ? "softball"
    : "baseball";
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UmpireAssignmentsPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("admin_access")?.value === "granted";

  const [bookings, umpires] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: "ACTIVE",
        umpireId: null,
        bookingDate: { gte: today },
        title: { in: ["Game", "Tournament", "Scrimmage"] },
      },
      include: {
        room: true,
      },
      orderBy: [
        { bookingDate: "asc" },
        { startTimeMinutes: "asc" },
      ],
    }),
    prisma.umpire.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const groups = bookings.reduce<
    Array<{ key: string; date: Date; items: typeof bookings }>
  >((acc, booking) => {
    const key = dateKey(booking.bookingDate);
    const existing = acc.find((g) => g.key === key);
    if (existing) {
      existing.items.push(booking);
    } else {
      acc.push({ key, date: booking.bookingDate, items: [booking] });
    }
    return acc;
  }, []);

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
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div>
              <h1 style={{ marginTop: 0, marginBottom: "0.5rem" }}>
                Unassigned Games
              </h1>
              <p style={{ margin: 0, color: "#4b5563" }}>
                Upcoming games that still need an umpire.
              </p>
            </div>

            {isAdmin && (
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
            )}
          </div>
        </div>

        {groups.length === 0 ? (
          <div
            style={{
              padding: "1rem",
              border: "1px dashed #cbd5e1",
              borderRadius: "12px",
              color: "#64748b",
              backgroundColor: "#ffffff",
            }}
          >
            All upcoming games already have assigned umpires ✅
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1.5rem" }}>
            {groups.map((group) => (
              <section key={group.key}>
                <h2 style={{ marginBottom: "0.75rem" }}>
                  {formatDayHeading(group.date)}
                </h2>

                <div style={{ display: "grid", gap: "0.85rem" }}>
                  {group.items.map((booking) => {
                    const sport = inferSport(booking.teamGroup);

                    const matchup = booking.opponent?.trim()
                      ? `${booking.bookedByName} vs. ${booking.opponent}`
                      : booking.bookedByName;

                    return (
                      <div
                        key={booking.id}
                        style={{
                          border: "1px solid #e2e8f0",
                          borderRadius: "12px",
                          padding: "1rem",
                          backgroundColor: "#ffffff",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gap: "1rem",
                            gridTemplateColumns:
                              "minmax(0, 1.3fr) minmax(300px, 420px)",
                          }}
                        >
                          <div>
                            {/* Line 1 */}
                            <div style={{ fontWeight: 700 }}>
                              {matchup}
                            </div>

                            {/* Line 2 */}
                            <div style={{ color: "#334155", marginTop: "0.2rem" }}>
                              {booking.room.name} - {booking.teamGroup || "—"}
                            </div>

                            {/* Line 3 — TIME ONLY */}
                            <div
                              style={{
                                color: "#64748b",
                                marginTop: "0.2rem",
                                fontSize: "0.9rem",
                              }}
                            >
                              {formatTimeRange(
                                booking.startTimeMinutes,
                                booking.endTimeMinutes
                              )}
                            </div>
                          </div>

                          <UmpireAssignmentActions
                            bookingId={booking.id}
                            currentUmpireId={null}
                            currentUmpireName={null}
                            sport={sport}
                            umpires={umpires.map((u) => ({
                              id: u.id,
                              name: u.name,
                              doesBaseball: u.doesBaseball,
                              doesSoftball: u.doesSoftball,
                            }))}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}