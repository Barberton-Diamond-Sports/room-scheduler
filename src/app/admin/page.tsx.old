
import Link from "next/link";
import { prisma } from "@/lib/prisma";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTimeLabel(totalMinutes: number) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${hours12}:${pad(minutes)} ${suffix}`;
}

function formatPageDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(date: Date) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fromMinutes(value: unknown) {
  if (typeof value !== "number") return "—";
  return formatTimeLabel(value);
}

function asText(value: unknown) {
  return typeof value === "string" && value.trim() ? value : "—";
}

type PageProps = {
  searchParams: Promise<{
    changeWindow?: string;
    changeType?: string;
  }>;
};

export default async function AdminPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const changeWindow = params.changeWindow || "7d";
  const changeType = params.changeType || "all";

  const today = new Date();
  const todayValue = toDateInputValue(today);
  const dayStart = new Date(`${todayValue}T00:00:00`);
  const nextDay = new Date(dayStart);
  nextDay.setDate(nextDay.getDate() + 1);

  const auditSince = new Date();
  if (changeWindow === "today") {
    auditSince.setHours(0, 0, 0, 0);
  } else if (changeWindow === "7d") {
    auditSince.setDate(auditSince.getDate() - 7);
  } else if (changeWindow === "30d") {
    auditSince.setDate(auditSince.getDate() - 30);
  } else {
    auditSince.setFullYear(2000, 0, 1);
  }

  const auditActionFilter =
    changeType === "edits"
      ? ["UPDATE"]
      : changeType === "deletions"
      ? ["DELETE"]
      : ["UPDATE", "DELETE"];

  const [rooms, todaysBookings, recentAuditLogs] = await Promise.all([
    prisma.room.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.booking.findMany({
      where: {
        status: "ACTIVE",
        bookingDate: {
          gte: dayStart,
          lt: nextDay,
        },
      },
      include: { room: true },
      orderBy: [{ startTimeMinutes: "asc" }, { roomId: "asc" }],
      take: 12,
    }),
    prisma.auditLog.findMany({
      where: {
        entityType: "Booking",
        action: { in: auditActionFilter },
        createdAt: { gte: auditSince },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const totalFields = rooms.length;
  const bookingCount = todaysBookings.length;

  function filterHref(windowValue: string, typeValue: string) {
    return `/admin?changeWindow=${windowValue}&changeType=${typeValue}`;
  }

  function filterButtonStyle(active: boolean) {
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
    <main style={{ minHeight: "100vh", backgroundColor: "#f5f7fb", padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #dbe3f0", borderRadius: "16px", padding: "1.5rem", marginBottom: "1.5rem", boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)" }}>
          <h1 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Admin Dashboard</h1>
          <p style={{ marginTop: 0, color: "#4b5563", marginBottom: "1rem" }}>
            Quick access to field bookings, blackout controls, umpire scheduling, and recent booking changes.
          </p>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Link href="/" style={{ display: "inline-block", padding: "0.65rem 1rem", backgroundColor: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: "10px", color: "#1e3a8a", textDecoration: "none", fontWeight: 600 }}>Home</Link>
            <Link href="/book" style={{ display: "inline-block", padding: "0.65rem 1rem", backgroundColor: "#ecfeff", border: "1px solid #a5f3fc", borderRadius: "10px", color: "#155e75", textDecoration: "none", fontWeight: 600 }}>Book a Field</Link>
            <Link href={`/bookings?date=${todayValue}`} style={{ display: "inline-block", padding: "0.65rem 1rem", backgroundColor: "#dbeafe", border: "1px solid #93c5fd", borderRadius: "10px", color: "#1d4ed8", textDecoration: "none", fontWeight: 600 }}>Today's Calendar</Link>
            <Link href="/admin/umpire-schedule" style={{ display: "inline-block", padding: "0.65rem 1rem", backgroundColor: "#ede9fe", border: "1px solid #c4b5fd", borderRadius: "10px", color: "#6d28d9", textDecoration: "none", fontWeight: 600 }}>Umpire Schedule</Link>
            <Link href="/admin/rooms" style={{ display: "inline-block", padding: "0.65rem 1rem", backgroundColor: "#ecfccb", border: "1px solid #bef264", borderRadius: "10px", color: "#3f6212", textDecoration: "none", fontWeight: 600 }}>Manage Fields</Link>
            <Link href="/admin/blackouts" style={{ display: "inline-block", padding: "0.65rem 1rem", backgroundColor: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "10px", color: "#991b1b", textDecoration: "none", fontWeight: 600 }}>Field Blackouts</Link>
          </div>
        </div>

        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: "1.5rem" }}>
          <div style={{ backgroundColor: "#ffffff", border: "1px solid #dbe3f0", borderRadius: "16px", padding: "1.25rem", boxShadow: "0 6px 18px rgba(0, 0, 0, 0.05)" }}><div style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "0.4rem" }}>Today's Date</div><div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#0f172a" }}>{formatPageDate(today)}</div></div>
          <div style={{ backgroundColor: "#ffffff", border: "1px solid #dbe3f0", borderRadius: "16px", padding: "1.25rem", boxShadow: "0 6px 18px rgba(0, 0, 0, 0.05)" }}><div style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "0.4rem" }}>Active Fields</div><div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a" }}>{totalFields}</div></div>
          <div style={{ backgroundColor: "#ffffff", border: "1px solid #dbe3f0", borderRadius: "16px", padding: "1.25rem", boxShadow: "0 6px 18px rgba(0, 0, 0, 0.05)" }}><div style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "0.4rem" }}>Today's Bookings</div><div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a" }}>{bookingCount}</div></div>
        </div>

        <div style={{ backgroundColor: "#ffffff", border: "1px solid #dbe3f0", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <h2 style={{ margin: 0 }}>Today's Schedule</h2>
            <Link href={`/bookings?date=${todayValue}`} style={{ color: "#1d4ed8", textDecoration: "none", fontWeight: 600 }}>Open full calendar</Link>
          </div>

          {todaysBookings.length === 0 ? (
            <div style={{ padding: "1rem", border: "1px dashed #cbd5e1", borderRadius: "12px", color: "#64748b" }}>No bookings scheduled for today.</div>
          ) : (
            <div style={{ display: "grid", gap: "0.85rem" }}>
              {todaysBookings.map((booking) => {
                const detailsHref = `/bookings/${booking.id}?date=${todayValue}`;
                return (
                  <Link key={booking.id} href={detailsHref} style={{ display: "block", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.9rem 1rem", textDecoration: "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ color: "#0f172a", fontWeight: 700 }}>{booking.title || "Booking"}</div>
                        <div style={{ color: "#334155", marginTop: "0.15rem" }}>{booking.bookedByName}</div>
                        <div style={{ color: "#64748b", marginTop: "0.15rem", fontSize: "0.9rem" }}>{booking.room.name}</div>
                      </div>
                      <div style={{ color: "#1d4ed8", fontWeight: 600 }}>{formatTimeLabel(booking.startTimeMinutes)} - {formatTimeLabel(booking.endTimeMinutes)}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ backgroundColor: "#ffffff", border: "1px solid #dbe3f0", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)" }}>
          <div style={{ marginBottom: "1rem" }}>
            <h2 style={{ margin: 0 }}>Recent Booking Changes</h2>
            <div style={{ color: "#64748b", marginTop: "0.35rem" }}>Recent edits and deletions for admin review.</div>
          </div>

          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "0.45rem" }}>Time window</div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Link href={filterHref("today", changeType)} style={filterButtonStyle(changeWindow === "today")}>Today</Link>
                <Link href={filterHref("7d", changeType)} style={filterButtonStyle(changeWindow === "7d")}>Last 7 days</Link>
                <Link href={filterHref("30d", changeType)} style={filterButtonStyle(changeWindow === "30d")}>Last 30 days</Link>
                <Link href={filterHref("all", changeType)} style={filterButtonStyle(changeWindow === "all")}>All</Link>
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "0.45rem" }}>Change type</div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Link href={filterHref(changeWindow, "all")} style={filterButtonStyle(changeType === "all")}>All changes</Link>
                <Link href={filterHref(changeWindow, "edits")} style={filterButtonStyle(changeType === "edits")}>Edits only</Link>
                <Link href={filterHref(changeWindow, "deletions")} style={filterButtonStyle(changeType === "deletions")}>Deletions only</Link>
              </div>
            </div>
          </div>

          {recentAuditLogs.length === 0 ? (
            <div style={{ padding: "1rem", border: "1px dashed #cbd5e1", borderRadius: "12px", color: "#64748b" }}>No booking edits or deletions match the current filters.</div>
          ) : (
            <div style={{ display: "grid", gap: "0.85rem" }}>
              {recentAuditLogs.map((log) => {
                const details = (log.detailsJson ?? {}) as { before?: Record<string, unknown>; after?: Record<string, unknown>; deleted?: Record<string, unknown>; };
                const isDelete = log.action === "DELETE";
                const source = isDelete ? details.deleted ?? {} : details.after ?? {};
                const before = details.before ?? {};
                const itemTitle = asText(source.title);
                const itemName = asText(source.bookedByName);
                const itemRoom = asText(source.roomName);
                const itemDate = asText(source.bookingDate);
                const start = fromMinutes(source.startTimeMinutes);
                const end = fromMinutes(source.endTimeMinutes);
                const changedSummary = !isDelete ? [
                  before.title !== source.title ? "Purpose" : "",
                  before.bookedByName !== source.bookedByName ? "Name" : "",
                  before.roomId !== source.roomId ? "Field" : "",
                  before.bookingDate !== source.bookingDate ? "Date" : "",
                  before.startTimeMinutes !== source.startTimeMinutes || before.endTimeMinutes !== source.endTimeMinutes ? "Time" : "",
                  before.notes !== source.notes ? "Notes" : "",
                ].filter(Boolean) : [];

                return (
                  <div key={log.id} style={{ border: "1px solid #e2e8f0", borderRadius: "12px", backgroundColor: isDelete ? "#fff1f2" : "#f8fafc", padding: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{isDelete ? "Deleted Booking" : "Edited Booking"}</div>
                        <div style={{ color: "#334155", marginTop: "0.2rem" }}>{itemTitle} · {itemName}</div>
                        <div style={{ color: "#64748b", marginTop: "0.2rem", fontSize: "0.92rem" }}>{itemRoom} · {start} - {end}</div>
                      </div>
                      <div style={{ color: "#64748b", fontSize: "0.92rem" }}>{formatDateTime(log.createdAt)}</div>
                    </div>
                    <div style={{ color: "#64748b", fontSize: "0.92rem", marginTop: "0.45rem" }}>{itemDate}</div>
                    {!isDelete && changedSummary.length > 0 && (
                      <div style={{ marginTop: "0.55rem", color: "#1d4ed8", fontWeight: 600, fontSize: "0.92rem" }}>Changed: {changedSummary.join(", ")}</div>
                    )}
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
