
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import UmpireAssignmentActions from "@/components/admin/umpire-assignment-actions";

type PageProps = {
  searchParams: Promise<{
    umpireId?: string;
    assignment?: string;
    sport?: string;
    startDate?: string;
    endDate?: string;
  }>;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromDateInputValue(dateString: string) {
  return new Date(`${dateString}T00:00:00`);
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

export default async function UmpireSchedulePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedUmpireId = typeof params.umpireId === "string" ? params.umpireId : "";
  const assignmentFilter = params.assignment === "assigned" || params.assignment === "unassigned" ? params.assignment : "all";
  const sportFilter = params.sport === "baseball" || params.sport === "softball" ? params.sport : "all";

  const today = new Date();
  const defaultStart = new Date(today);
  defaultStart.setDate(today.getDate());
  defaultStart.setHours(0, 0, 0, 0);
  const startDateValue = typeof params.startDate === "string" && params.startDate ? params.startDate : toDateInputValue(defaultStart);
  const endDateValue = typeof params.endDate === "string" ? params.endDate : "";

  const rangeStart = fromDateInputValue(startDateValue);
  const rawRangeEnd = endDateValue ? fromDateInputValue(endDateValue) : null;
  const rangeEndExclusive = rawRangeEnd ? new Date(rawRangeEnd.getTime()) : null;
  if (rangeEndExclusive) rangeEndExclusive.setDate(rangeEndExclusive.getDate() + 1);

  const [bookings, umpires] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: "ACTIVE",
        bookingDate: {
          gte: rangeStart,
          ...(rangeEndExclusive ? { lt: rangeEndExclusive } : {}),
        },
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
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
  ]);

  const selectedUmpire = selectedUmpireId ? umpires.find((u) => u.id === selectedUmpireId) ?? null : null;

  const filteredBookings = bookings.filter((booking) => {
    if (selectedUmpireId && booking.umpireId !== selectedUmpireId) return false;
    if (assignmentFilter === "assigned" && !booking.umpireId) return false;
    if (assignmentFilter === "unassigned" && booking.umpireId) return false;
    const sport = inferSport(booking.teamGroup);
    if (sportFilter !== "all" && sport !== sportFilter) return false;
    return true;
  });

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#f5f7fb", padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #dbe3f0", borderRadius: "16px", padding: "1.5rem", marginBottom: "1.5rem", boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)" }}>
          <h1 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Umpire Schedule</h1>
          <p style={{ marginTop: 0, color: "#4b5563", marginBottom: "1rem" }}>
            Assign active umpires and filter the game list by umpire, assignment status, sport, and date range.
          </p>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <Link href="/admin" style={{ display: "inline-block", padding: "0.65rem 1rem", backgroundColor: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: "10px", color: "#1e3a8a", textDecoration: "none", fontWeight: 600 }}>Back to Admin</Link>
            <Link href={`/bookings?date=${toDateInputValue(new Date())}&view=week`} style={{ display: "inline-block", padding: "0.65rem 1rem", backgroundColor: "#dbeafe", border: "1px solid #93c5fd", borderRadius: "10px", color: "#1d4ed8", textDecoration: "none", fontWeight: 600 }}>Open Weekly Calendar</Link>
            <Link href="/admin/umpires" style={{ display: "inline-block", padding: "0.65rem 1rem", backgroundColor: "#fef3c7", border: "1px solid #facc15", borderRadius: "10px", color: "#92400e", textDecoration: "none", fontWeight: 600 }}>Manage Umpires</Link>
          </div>

          <form method="GET" style={{ display: "grid", gap: "1rem" }}>
            <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <div>
                <label htmlFor="umpireId" style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600, color: "#334155" }}>Filter by Umpire</label>
                <select id="umpireId" name="umpireId" defaultValue={selectedUmpireId} style={{ width: "100%", padding: "0.7rem 0.85rem", border: "1px solid #cbd5e1", borderRadius: "10px", backgroundColor: "#f8fafc", fontSize: "0.95rem" }}>
                  <option value="">All games</option>
                  {umpires.map((umpire) => (
                    <option key={umpire.id} value={umpire.id}>{umpire.name}{umpire.isActive ? "" : " (Inactive)"}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="assignment" style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600, color: "#334155" }}>Assignment Status</label>
                <select id="assignment" name="assignment" defaultValue={assignmentFilter} style={{ width: "100%", padding: "0.7rem 0.85rem", border: "1px solid #cbd5e1", borderRadius: "10px", backgroundColor: "#f8fafc", fontSize: "0.95rem" }}>
                  <option value="all">All</option>
                  <option value="assigned">Assigned only</option>
                  <option value="unassigned">Unassigned only</option>
                </select>
              </div>

              <div>
                <label htmlFor="sport" style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600, color: "#334155" }}>Sport</label>
                <select id="sport" name="sport" defaultValue={sportFilter} style={{ width: "100%", padding: "0.7rem 0.85rem", border: "1px solid #cbd5e1", borderRadius: "10px", backgroundColor: "#f8fafc", fontSize: "0.95rem" }}>
                  <option value="all">All sports</option>
                  <option value="baseball">Baseball</option>
                  <option value="softball">Softball</option>
                </select>
              </div>

              <div>
                <label htmlFor="startDate" style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600, color: "#334155" }}>Start Date</label>
                <input id="startDate" name="startDate" type="date" defaultValue={startDateValue} style={{ width: "100%", padding: "0.7rem 0.85rem", border: "1px solid #cbd5e1", borderRadius: "10px", backgroundColor: "#f8fafc", fontSize: "0.95rem" }} />
              </div>

              <div>
                <label htmlFor="endDate" style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600, color: "#334155" }}>End Date (optional)</label>
                <input id="endDate" name="endDate" type="date" defaultValue={endDateValue} style={{ width: "100%", padding: "0.7rem 0.85rem", border: "1px solid #cbd5e1", borderRadius: "10px", backgroundColor: "#f8fafc", fontSize: "0.95rem" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button type="submit" style={{ padding: "0.7rem 1rem", backgroundColor: "#2563eb", color: "#ffffff", border: "none", borderRadius: "10px", fontWeight: 700, cursor: "pointer" }}>Apply Filters</button>
              <Link href="/admin/umpire-schedule" style={{ display: "inline-block", padding: "0.7rem 1rem", backgroundColor: "#f8fafc", border: "1px solid #dbe3f0", borderRadius: "10px", color: "#475569", textDecoration: "none", fontWeight: 700 }}>Clear Filters</Link>
            </div>
          </form>

          {(selectedUmpire || assignmentFilter !== "all" || sportFilter !== "all" || endDateValue) && (
            <div style={{ marginTop: "1rem", padding: "0.85rem 1rem", borderRadius: "12px", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e3a8a", fontWeight: 700 }}>
              Filters active{selectedUmpire ? ` · Umpire: ${selectedUmpire.name}` : ""}{assignmentFilter !== "all" ? ` · ${assignmentFilter === "assigned" ? "Assigned only" : "Unassigned only"}` : ""}{sportFilter !== "all" ? ` · ${sportFilter === "softball" ? "Softball" : "Baseball"}` : ""}
            </div>
          )}
        </div>

        <div style={{ backgroundColor: "#ffffff", border: "1px solid #dbe3f0", borderRadius: "16px", padding: "1rem", boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)" }}>
          {filteredBookings.length === 0 ? (
            <div style={{ padding: "1rem", border: "1px dashed #cbd5e1", borderRadius: "12px", color: "#64748b" }}>
              No games match the current filters.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "0.85rem" }}>
              {filteredBookings.map((booking) => {
                const sport = inferSport(booking.teamGroup);
                return (
                  <div key={booking.id} style={{ border: "1px solid #e2e8f0", borderRadius: "14px", padding: "1rem", backgroundColor: "#ffffff" }}>
                    <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1.1fr) minmax(320px, 420px)", alignItems: "start" }}>
                      <div>
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>{booking.title || "Game"}</div>
                        <div style={{ color: "#334155", marginTop: "0.2rem" }}>{booking.teamGroup || "—"}</div>
                        <div style={{ color: "#64748b", marginTop: "0.2rem", fontSize: "0.92rem" }}>{formatDate(booking.bookingDate)} · {formatTimeLabel(booking.startTimeMinutes)} - {formatTimeLabel(booking.endTimeMinutes)}</div>
                      </div>

                      <div>
                        <div style={{ color: "#334155", fontWeight: 700 }}>{booking.room.name}</div>
                        <div style={{ color: "#64748b", marginTop: "0.2rem" }}>Opponent: {booking.opponent?.trim() || "—"}</div>
                        <div style={{ color: "#64748b", marginTop: "0.2rem" }}>Sport: {sport === "softball" ? "Softball" : "Baseball"}</div>
                        <div style={{ color: "#64748b", marginTop: "0.2rem" }}>Assigned: {booking.umpireRecord?.name || "Unassigned"}</div>
                      </div>

                      <UmpireAssignmentActions
                        bookingId={booking.id}
                        currentUmpireId={booking.umpireId}
                        currentUmpireName={booking.umpireRecord?.name || null}
                        sport={sport}
                        umpires={umpires.filter((umpire) => umpire.isActive).map((umpire) => ({ id: umpire.id, name: umpire.name, doesBaseball: umpire.doesBaseball, doesSoftball: umpire.doesSoftball }))}
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
