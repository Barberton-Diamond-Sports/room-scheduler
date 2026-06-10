
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

function roomLabel(room: { name: string; description?: string | null }) {
  return room.description?.trim()
    ? `${room.name} (${room.description})`
    : room.name;
}

function asText(value: string | null | undefined) {
  return value && value.trim() ? value : "—";
}

type PageProps = {
  searchParams: Promise<{
    assignment?: string;
    range?: string;
    group?: string;
  }>;
};

export default async function UmpireSchedulePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const assignment = params.assignment || "all";
  const range = params.range || "recent";
  const group = params.group || "all";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const defaultFromDate = new Date(today);
  defaultFromDate.setDate(defaultFromDate.getDate() - 3);

  const whereClause: {
    status: "ACTIVE";
    title: "Game";
    bookingDate?: { gte?: Date };
    teamGroup?: string;
    umpire?: string | null;
  } = {
    status: "ACTIVE",
    title: "Game",
  };

  if (range === "future") {
    whereClause.bookingDate = { gte: today };
  } else if (range === "recent") {
    whereClause.bookingDate = { gte: defaultFromDate };
  }

  if (group !== "all") {
    whereClause.teamGroup = group;
  }

  if (assignment === "missing") {
    whereClause.umpire = null;
  }

  const [gameBookings, gameGroups] = await Promise.all([
    prisma.booking.findMany({
      where: whereClause,
      include: { room: true },
      orderBy: [{ bookingDate: "asc" }, { startTimeMinutes: "asc" }, { roomId: "asc" }],
    }),
    prisma.booking.findMany({
      where: {
        status: "ACTIVE",
        title: "Game",
        teamGroup: { not: null },
      },
      select: { teamGroup: true },
      distinct: ["teamGroup"],
      orderBy: { teamGroup: "asc" },
    }),
  ]);

  const groupOptions = gameGroups
    .map((item) => item.teamGroup)
    .filter((value): value is string => Boolean(value));

  function filterHref(nextAssignment: string, nextRange: string, nextGroup: string) {
    const params = new URLSearchParams();
    params.set("assignment", nextAssignment);
    params.set("range", nextRange);
    params.set("group", nextGroup);
    return `/admin/umpire-schedule?${params.toString()}`;
  }

  function pillStyle(active: boolean) {
    return {
      display: "inline-block",
      padding: "0.55rem 0.85rem",
      borderRadius: "999px",
      textDecoration: "none",
      fontWeight: 600,
      fontSize: "0.92rem",
      border: active ? "1px solid #93c5fd" : "1px solid #dbe3f0",
      backgroundColor: active ? "#dbeafe" : "#f8fafc",
      color: active ? "#1d4ed8" : "#475569",
    } as const;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fb",
        padding: "2rem",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1450px", margin: "0 auto" }}>
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
            Active game bookings for umpire assignment. Rows missing an umpire are highlighted. Click any row to open the edit screen, or use Set Umpire / Clear Umpire.
          </p>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <Link href="/admin" style={{ display: "inline-block", padding: "0.65rem 1rem", backgroundColor: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: "10px", color: "#1e3a8a", textDecoration: "none", fontWeight: 600 }}>Back to Admin</Link>
            <Link href={`/bookings?date=${toDateInputValue(new Date())}&view=week`} style={{ display: "inline-block", padding: "0.65rem 1rem", backgroundColor: "#dbeafe", border: "1px solid #93c5fd", borderRadius: "10px", color: "#1d4ed8", textDecoration: "none", fontWeight: 600 }}>Open Weekly Calendar</Link>
          </div>

          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "0.45rem" }}>Assignment</div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Link href={filterHref("all", range, group)} style={pillStyle(assignment === "all")}>All games</Link>
                <Link href={filterHref("missing", range, group)} style={pillStyle(assignment === "missing")}>Missing umpire</Link>
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "0.45rem" }}>Date range</div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Link href={filterHref(assignment, "recent", group)} style={pillStyle(range === "recent")}>Last 3 days + future</Link>
                <Link href={filterHref(assignment, "future", group)} style={pillStyle(range === "future")}>Future only</Link>
                <Link href={filterHref(assignment, "all", group)} style={pillStyle(range === "all")}>All dates</Link>
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "0.45rem" }}>Group</div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Link href={filterHref(assignment, range, "all")} style={pillStyle(group === "all")}>All groups</Link>
                {groupOptions.map((option) => (
                  <Link key={option} href={filterHref(assignment, range, option)} style={pillStyle(group === option)}>
                    {option}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #dbe3f0",
            borderRadius: "16px",
            padding: "1rem",
            boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)",
            overflowX: "auto",
          }}
        >
          {gameBookings.length === 0 ? (
            <div style={{ padding: "1rem", border: "1px dashed #cbd5e1", borderRadius: "12px", color: "#64748b" }}>
              No game bookings match the current filters.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1280px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  <th style={{ textAlign: "left", padding: "0.85rem 0.75rem", borderBottom: "1px solid #dbe3f0", color: "#334155" }}>Date</th>
                  <th style={{ textAlign: "left", padding: "0.85rem 0.75rem", borderBottom: "1px solid #dbe3f0", color: "#334155" }}>Start Time</th>
                  <th style={{ textAlign: "left", padding: "0.85rem 0.75rem", borderBottom: "1px solid #dbe3f0", color: "#334155" }}>Field</th>
                  <th style={{ textAlign: "left", padding: "0.85rem 0.75rem", borderBottom: "1px solid #dbe3f0", color: "#334155" }}>Group</th>
                  <th style={{ textAlign: "left", padding: "0.85rem 0.75rem", borderBottom: "1px solid #dbe3f0", color: "#334155" }}>Your Name</th>
                  <th style={{ textAlign: "left", padding: "0.85rem 0.75rem", borderBottom: "1px solid #dbe3f0", color: "#334155" }}>Opponent</th>
                  <th style={{ textAlign: "left", padding: "0.85rem 0.75rem", borderBottom: "1px solid #dbe3f0", color: "#334155" }}>Umpire</th>
                  <th style={{ textAlign: "left", padding: "0.85rem 0.75rem", borderBottom: "1px solid #dbe3f0", color: "#334155" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {gameBookings.map((booking, index) => {
                  const editHref = `/bookings/${booking.id}/edit?date=${toDateInputValue(booking.bookingDate)}&view=week`;
                  const isMissingUmpire = !booking.umpire || !booking.umpire.trim();
                  const rowBackground = isMissingUmpire ? "#fff1f2" : index % 2 === 0 ? "#ffffff" : "#fbfdff";
                  return (
                    <tr key={booking.id} style={{ backgroundColor: rowBackground }}>
                      <td style={{ padding: "0.85rem 0.75rem", borderBottom: "1px solid #eef2f7" }}>
                        <Link href={editHref} style={{ color: "inherit", textDecoration: "none", display: "block" }}>{formatDate(booking.bookingDate)}</Link>
                      </td>
                      <td style={{ padding: "0.85rem 0.75rem", borderBottom: "1px solid #eef2f7" }}>
                        <Link href={editHref} style={{ color: "inherit", textDecoration: "none", display: "block" }}>{formatTimeLabel(booking.startTimeMinutes)}</Link>
                      </td>
                      <td style={{ padding: "0.85rem 0.75rem", borderBottom: "1px solid #eef2f7" }}>
                        <Link href={editHref} style={{ color: "inherit", textDecoration: "none", display: "block" }}>{roomLabel(booking.room)}</Link>
                      </td>
                      <td style={{ padding: "0.85rem 0.75rem", borderBottom: "1px solid #eef2f7" }}>
                        <Link href={editHref} style={{ color: "inherit", textDecoration: "none", display: "block" }}>{asText(booking.teamGroup)}</Link>
                      </td>
                      <td style={{ padding: "0.85rem 0.75rem", borderBottom: "1px solid #eef2f7" }}>
                        <Link href={editHref} style={{ color: "inherit", textDecoration: "none", display: "block" }}>{booking.bookedByName}</Link>
                      </td>
                      <td style={{ padding: "0.85rem 0.75rem", borderBottom: "1px solid #eef2f7" }}>
                        <Link href={editHref} style={{ color: "inherit", textDecoration: "none", display: "block" }}>{asText(booking.opponent)}</Link>
                      </td>
                      <td style={{ padding: "0.85rem 0.75rem", borderBottom: "1px solid #eef2f7", fontWeight: isMissingUmpire ? 700 : 400, color: isMissingUmpire ? "#991b1b" : "#0f172a" }}>
                        <Link href={editHref} style={{ color: "inherit", textDecoration: "none", display: "block" }}>{asText(booking.umpire)}</Link>
                      </td>
                      <td style={{ padding: "0.85rem 0.75rem", borderBottom: "1px solid #eef2f7" }}>
                        <UmpireAssignmentActions bookingId={booking.id} currentUmpire={booking.umpire} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
