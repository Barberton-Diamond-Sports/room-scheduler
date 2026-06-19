import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getEasternTodayValue() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

function formatTimeLabel(totalMinutes: number) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${hours12}:${pad(minutes)} ${suffix}`;
}

function getTypeBadge(title?: string | null) {
  const type = (title || "").toLowerCase();

  if (type === "game") {
    return {
      label: "Game",
      bg: "#dcfce7",
      border: "#86efac",
      color: "#166534",
    };
  }

  if (type === "practice") {
    return {
      label: "Practice",
      bg: "#e0f2fe",
      border: "#7dd3fc",
      color: "#075985",
    };
  }

  if (type === "scrimmage") {
    return {
      label: "Scrimmage",
      bg: "#fef3c7",
      border: "#facc15",
      color: "#92400e",
    };
  }

  return {
    label: title || "Other",
    bg: "#f1f5f9",
    border: "#cbd5e1",
    color: "#475569",
  };
}


function blackoutLabel(reason?: string | null) {
  const trimmed = reason?.trim();
  return trimmed ? `BLACKED OUT · ${trimmed}` : "BLACKED OUT";
}


function formatPageDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(date: Date) {
  return date.toLocaleString("en-US", {
    timeZone: "America/New_York",
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

function dashboardLinkStyle(bg: string, border: string, color: string) {
  return {
    display: "inline-block",
    padding: "0.65rem 1rem",
    backgroundColor: bg,
    border: `1px solid ${border}`,
    borderRadius: "10px",
    color,
    textDecoration: "none",
    fontWeight: 600,
    textAlign: "center" as const,
  };
}

export default async function AdminPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const changeWindow = params.changeWindow || "7d";
  const changeType = params.changeType || "all";

  const todayValue = getEasternTodayValue();
  const today = new Date(`${todayValue}T12:00:00`);
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

  const [rooms, todaysBookings, todaysBlackouts, futureBookings, recentAuditLogs, umpireCount] =
  await Promise.all([
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
  include: {
    room: true,
    team: true,
    umpireRecord: true,
  },
  orderBy: [{ roomId: "asc" }, { startTimeMinutes: "asc" }],
}),
    prisma.roomBlackout.findMany({
      where: {
        startDateTime: { lt: nextDay },
        endDateTime: { gt: dayStart },
      },
      include: {
        room: true,
      },
      orderBy: [{ roomId: "asc" }],
    }),
    prisma.booking.findMany({
      where: {
        status: "ACTIVE",
        bookingDate: {
          gte: dayStart,
        },
        teamId: { not: null },
      },
      include: {
        room: true,
        team: true,
      },
      orderBy: [
        { bookingDate: "asc" },
        { teamId: "asc" },
        { startTimeMinutes: "asc" },
        { roomId: "asc" },
      ],
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
    prisma.umpire.count({ where: { isActive: true } }),
  ]);

  const totalFields = rooms.length;
  const bookingCount = todaysBookings.length;
const todayScheduleItems = [
  ...todaysBlackouts.map((blackout) => ({
    kind: "blackout" as const,
    id: blackout.id,
    roomName: blackout.room.name,
    reason: blackout.reason,
    sortTime: -1,
  })),
  ...todaysBookings.map((booking) => ({
    kind: "booking" as const,
    id: booking.id,
    booking,
    roomName: booking.room.name,
    sortTime: booking.startTimeMinutes,
  })),
].sort((a, b) => {
  const roomCompare = a.roomName.localeCompare(b.roomName);
  if (roomCompare !== 0) return roomCompare;
  return a.sortTime - b.sortTime;
});


const conflictGroups: Array<{
  key: string;
  teamName: string;
  ageGroup: string;
  dateLabel: string;
  dateValue: string;
  items: Array<{
    bookingId: string;
    roomId: string;
    field: string;
    start: string;
    end: string;
    title: string;
  }>;
}> = [];

const bookingsByTeamAndDate = new Map<string, typeof futureBookings>();

for (const booking of futureBookings) {
  if (!booking.teamId) continue;
  const key = `${booking.teamId}|${toDateInputValue(booking.bookingDate)}`;
  const existing = bookingsByTeamAndDate.get(key);
  if (existing) {
    existing.push(booking);
  } else {
    bookingsByTeamAndDate.set(key, [booking]);
  }
}

for (const [, teamBookings] of bookingsByTeamAndDate) {
  if (teamBookings.length < 2) continue;

  const sortedBookings = [...teamBookings].sort((a, b) => {
    if (a.startTimeMinutes !== b.startTimeMinutes) {
      return a.startTimeMinutes - b.startTimeMinutes;
    }
    return a.endTimeMinutes - b.endTimeMinutes;
  });

  let currentGroup: typeof sortedBookings = [];
  let currentMaxEnd = -1;

  function pushCurrentGroup() {
    if (currentGroup.length < 2) return;

    const distinctRoomIds = new Set(currentGroup.map((booking) => booking.roomId));
    if (distinctRoomIds.size < 2) return;

    conflictGroups.push({
      key: currentGroup.map((booking) => booking.id).sort().join("|"),
      teamName: currentGroup[0].team?.teamName || "Unknown team",
      ageGroup: currentGroup[0].team?.ageGroup || "—",
      dateLabel: formatShortDate(currentGroup[0].bookingDate),
      dateValue: toDateInputValue(currentGroup[0].bookingDate),
      items: currentGroup.map((booking) => ({
        bookingId: booking.id,
        roomId: booking.roomId,
        field: booking.room?.name || "Unknown field",
        start: formatTimeLabel(booking.startTimeMinutes),
        end: formatTimeLabel(booking.endTimeMinutes),
        title: booking.title || "Booking",
      })),
    });
  }

  for (const booking of sortedBookings) {
    if (currentGroup.length === 0) {
      currentGroup = [booking];
      currentMaxEnd = booking.endTimeMinutes;
      continue;
    }

    const overlapsCurrentGroup = booking.startTimeMinutes < currentMaxEnd;

    if (overlapsCurrentGroup) {
      currentGroup.push(booking);
      currentMaxEnd = Math.max(currentMaxEnd, booking.endTimeMinutes);
    } else {
      pushCurrentGroup();
      currentGroup = [booking];
      currentMaxEnd = booking.endTimeMinutes;
    }
  }

  pushCurrentGroup();
}

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
      textAlign: "center" as const,
    };
  }

  const changeWindowLabel =
    changeWindow === "today"
      ? "today"
      : changeWindow === "7d"
      ? "last 7 days"
      : changeWindow === "30d"
      ? "last 30 days"
      : "all time";

  const changeTypeLabel =
    changeType === "edits"
      ? "edits"
      : changeType === "deletions"
      ? "deletions"
      : "changes";

  const recentChangesSummary =
    changeWindow === "all"
      ? `Recent Booking Changes - ${recentAuditLogs.length} ${changeTypeLabel}`
      : `Recent Booking Changes - ${recentAuditLogs.length} ${changeTypeLabel} in ${changeWindowLabel}`;

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fb",
        padding: "1rem",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <style>{`
        .admin-shell {
          max-width: 1100px;
          margin: 0 auto;
        }

        .admin-card {
          background-color: #ffffff;
          border: 1px solid #dbe3f0;
          border-radius: 16px;
          padding: 1.25rem;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
        }

        .admin-nav-stack {
          display: grid;
          gap: 0.5rem;
        }

        .admin-section-group {
          display: grid;
          gap: 0.2rem;
        }

        .admin-section-title {
          font-weight: 700;
          margin-top: 0.6rem;
          margin-bottom: 0.2rem;
          font-size: 0.9rem;
          color: #334155;
        }

        .admin-link-row {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .admin-summary-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          margin-bottom: 1.5rem;
        }

        .admin-schedule-item {
          display: block;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0.9rem 1rem;
          text-decoration: none;
        }

        .admin-schedule-item-row {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .admin-audit-top {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .admin-filter-sections {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }

        .admin-filter-button-row {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .admin-audit-item {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1rem;
        }

        .admin-audit-item-row {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .admin-warning-card {
          background-color: #fff7ed;
          border: 1px solid #fdba74;
          border-radius: 16px;
          padding: 1.25rem;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.04);
          margin-bottom: 1.5rem;
        }

        .admin-warning-list {
          display: grid;
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .admin-warning-item {
          border: 1px solid #fed7aa;
          background-color: #fffbeb;
          border-radius: 12px;
          padding: 0.9rem 1rem;
        }

        @media (max-width: 768px) {
          .admin-card,
          .admin-warning-card {
            padding: 1rem;
            border-radius: 14px;
          }

          .admin-link-row {
            flex-direction: column;
          }

          .admin-link-row a,
          .admin-link-row button {
            width: 100%;
            box-sizing: border-box;
          }

          .admin-schedule-item-row,
          .admin-audit-top,
          .admin-audit-item-row,
          .admin-filter-sections,
          .admin-filter-button-row {
            flex-direction: column;
            align-items: stretch;
          }

          .admin-filter-button-row a {
            width: 100%;
            box-sizing: border-box;
          }
        }
      `}</style>

      <div className="admin-shell">
        <div className="admin-card" style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "1.9rem" }}>
            BDS Admin Page
          </h1>
          <p style={{ marginTop: 0, color: "#4b5563", marginBottom: "1rem", lineHeight: 1.5 }}>
            Quick access to field bookings, blackout controls, umpire scheduling, team management,
            and recent booking changes.
          </p>

          <div className="admin-nav-stack">
            <div className="admin-section-group">
              <div className="admin-section-title">Home</div>
              <div className="admin-link-row">
                <Link
                  href="/"
                  style={dashboardLinkStyle("#eef2ff", "#c7d2fe", "#1e3a8a")}
                >
                  Home
                </Link>
              </div>
            </div>

            <div className="admin-section-group">
              <div className="admin-section-title">Fields</div>
              <div className="admin-link-row">
                <Link
                  href="/admin/book-with-umpire"
                  style={dashboardLinkStyle("#ecfeff", "#a5f3fc", "#155e75")}
                >
                  Book a Field (Admin)
                </Link>

                <Link
                  href="/admin/blackouts"
                  style={dashboardLinkStyle("#fee2e2", "#fca5a5", "#991b1b")}
                >
                  Field Blackouts
                </Link>
              </div>
            </div>

            <div className="admin-section-group">
			  <div className="admin-section-title">Calendar</div>
			  <div className="admin-link-row">
				<Link
				  href={`/bookings?date=${todayValue}&view=week`}
				  style={dashboardLinkStyle("#dbeafe", "#93c5fd", "#1d4ed8")}
				>
				  Weekly Calendar
				</Link>

				<Link
				  href="/team-schedule"
				  style={dashboardLinkStyle("#f0fdf4", "#86efac", "#166534")}
				>
				  Team Schedule
				</Link>
			  </div>
			</div>

            <div className="admin-section-group">
              <div className="admin-section-title">Umpires</div>
              <div className="admin-link-row">
                <Link
                  href="/admin/umpire-schedule"
                  style={dashboardLinkStyle("#ede9fe", "#c4b5fd", "#6d28d9")}
                >
                  Umpire Schedule
                </Link>

                <Link
                  href="/umpire-assignments"
                  style={dashboardLinkStyle("#e0f2fe", "#7dd3fc", "#0369a1")}
                >
                  Assign Umpires
                </Link>
              </div>
            </div>

            <div className="admin-section-group">
              <div className="admin-section-title">Administration</div>
              <div className="admin-link-row">
                <Link
                  href="/admin/rooms"
                  style={dashboardLinkStyle("#ecfccb", "#bef264", "#3f6212")}
                >
                  Manage Fields
                </Link>

                <Link
                  href="/admin/teams"
                  style={dashboardLinkStyle("#f3e8ff", "#d8b4fe", "#7c3aed")}
                >
                  Manage Teams
                </Link>

                <Link
                  href="/admin/umpires"
                  style={dashboardLinkStyle("#fef3c7", "#facc15", "#92400e")}
                >
                  Manage Umpires
                </Link>

                <Link
                  href="/admin/users"
                  style={dashboardLinkStyle("#e0f2fe", "#7dd3fc", "#0369a1")}
                >
                  Manage Admin Users
                </Link>

                <a
                  href="/api/admin/logout"
                  style={dashboardLinkStyle("#fee2e2", "#fca5a5", "#991b1b")}
                >
                  Logout
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-summary-grid">
          <div className="admin-card">
            <div style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "0.4rem" }}>
              Today&apos;s Date
            </div>
            <div
              style={{
                fontSize: "1.15rem",
                fontWeight: 700,
                color: "#0f172a",
                lineHeight: 1.4,
              }}
            >
              {formatPageDate(today)}
            </div>
          </div>

          <div className="admin-card">
            <div style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "0.4rem" }}>
              Active Fields
            </div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a" }}>
              {totalFields}
            </div>
          </div>

          <div className="admin-card">
            <div style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "0.4rem" }}>
              Today&apos;s Bookings
            </div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a" }}>
              {bookingCount}
            </div>
          </div>

          <div className="admin-card">
            <div style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "0.4rem" }}>
              Active Umpires
            </div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a" }}>
              {umpireCount}
            </div>
          </div>
        </div>

        <div className="admin-card" style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
              marginBottom: "1rem",
            }}
          >
            <h2 style={{ margin: 0, fontWeight: 800 }}>Today&apos;s Schedule</h2>
            <Link
              href={`/bookings?date=${todayValue}`}
              style={{ color: "#1d4ed8", textDecoration: "none", fontWeight: 600 }}
            >
              Open full calendar
            </Link>
          </div>

          {todayScheduleItems.length === 0 ? (
  <div
    style={{
      padding: "1rem",
      border: "1px dashed #cbd5e1",
      borderRadius: "12px",
      color: "#64748b",
    }}
  >
    No bookings or blackouts scheduled for today.
  </div>
) : (
  <div style={{ display: "grid", gap: "0.85rem" }}>
    {todayScheduleItems.map((item) => {
      if (item.kind === "blackout") {
        return (
          <div
            key={`blackout-${item.id}`}
            className="admin-schedule-item"
            style={{
              backgroundColor: "#374151",
              borderColor: "#1f2937",
            }}
          >
            <div className="admin-schedule-item-row">
              <div>
                <div
                  style={{
                    color: "#ffffff",
                    fontWeight: 700,
                    lineHeight: 1.35,
                  }}
                >
                  {item.roomName}
                </div>

                <div
                  style={{
                    color: "#e5e7eb",
                    marginTop: "0.2rem",
                    fontWeight: 700,
                    lineHeight: 1.35,
                  }}
                >
                  {blackoutLabel(item.reason)}
                </div>
              </div>

              <div
                style={{
                  color: "#e5e7eb",
                  fontWeight: 700,
                  textAlign: "right",
                  lineHeight: 1.35,
                }}
              >
                Full Day
              </div>
            </div>
          </div>
        );
      }

      const booking = item.booking;
      const detailsHref = `/bookings/${booking.id}?date=${todayValue}&view=day&from=admin`;
      const bookingPurpose = booking.title?.trim().toLowerCase() ?? "";
      const needsUmpire = !!booking.team?.requiresUmpire && bookingPurpose === "game";
      const isMissingUmpire = needsUmpire && !booking.umpireRecord;
      const badge = getTypeBadge(booking.title);

      const matchup =
        booking.opponent && booking.opponent.trim()
          ? `${booking.team?.teamName || "—"} vs. ${booking.opponent}`
          : booking.team?.teamName || "—";

      return (
        <Link
          key={booking.id}
          href={detailsHref}
          className="admin-schedule-item"
          style={{
            backgroundColor: isMissingUmpire ? "#fff1f2" : "#f8fafc",
            borderColor: isMissingUmpire ? "#fca5a5" : "#e2e8f0",
          }}
        >
          <div className="admin-schedule-item-row">
            <div>
              <div style={{ color: "#0f172a", fontWeight: 700, lineHeight: 1.35 }}>
                {booking.room.name}
              </div>

              <div
                style={{
                  color: "#334155",
                  marginTop: "0.15rem",
                  fontWeight: 600,
                  lineHeight: 1.35,
                }}
              >
                {matchup}
              </div>

              {needsUmpire && (
                <div
                  style={{
                    color: booking.umpireRecord ? "#475569" : "#991b1b",
                    marginTop: "0.2rem",
                    fontSize: "0.88rem",
                    lineHeight: 1.35,
                    fontWeight: booking.umpireRecord ? 400 : 700,
                  }}
                >
                  Umpire: {booking.umpireRecord?.name || "Unassigned"}
                </div>
              )}

              {booking.notes && (
                <div
                  style={{
                    color: "#475569",
                    marginTop: "0.2rem",
                    fontSize: "0.85rem",
                    lineHeight: 1.35,
                  }}
                >
                  {booking.notes}
                </div>
              )}
            </div>

            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  color: "#1d4ed8",
                  fontWeight: 700,
                  lineHeight: 1.35,
                }}
              >
                {formatTimeLabel(booking.startTimeMinutes)} -{" "}
                {formatTimeLabel(booking.endTimeMinutes)}
              </div>

              <div style={{ marginTop: "0.2rem" }}>
                <span
                  style={{
                    padding: "0.15rem 0.5rem",
                    borderRadius: "999px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    backgroundColor: badge.bg,
                    border: `1px solid ${badge.border}`,
                    color: badge.color,
                    whiteSpace: "nowrap",
                  }}
                >
                  {badge.label}
                </span>
              </div>

              <div
                style={{
                  color: "#64748b",
                  marginTop: "0.3rem",
                  fontSize: "0.85rem",
                  lineHeight: 1.35,
                }}
              >
                {booking.team?.ageGroup || "—"}
              </div>
            </div>
          </div>
        </Link>
      );
    })}
  </div>
)}
        </div>

{conflictGroups.length > 0 && (
  <div className="admin-warning-card">
    <h2
      style={{
        marginTop: 0,
        marginBottom: "0.5rem",
        color: "#9a3412",
        fontWeight: 800,
      }}
    >
      Team Booking Conflicts
    </h2>
    <p style={{ marginTop: 0, color: "#9a3412", lineHeight: 1.5, marginBottom: 0 }}>
      The following future bookings show the same team scheduled on multiple fields at the
      same time. Please review these conflicts.
    </p>

    <div className="admin-warning-list">
      {conflictGroups.map((group) => (
        <div key={group.key} className="admin-warning-item">
          <div
            style={{
              fontWeight: 600,
              color: "#7c2d12",
              lineHeight: 1.35,
            }}
          >
            {group.teamName} {group.ageGroup !== "—" ? `(${group.ageGroup})` : ""}
          </div>

          <div
            style={{
              marginTop: "0.2rem",
              color: "#9a3412",
              lineHeight: 1.4,
              fontWeight: 600,
            }}
          >
            {group.dateLabel}
          </div>

          <div style={{ marginTop: "0.5rem", display: "grid", gap: "0.2rem" }}>
            {group.items.map((item) => (
              <div
                key={item.bookingId}
                style={{
                  color: "#7c2d12",
                  lineHeight: 1.45,
                }}
              >
                <span style={{ fontWeight: 600 }}>{item.field}</span>: {item.start} - {item.end} -{" "}
                <span style={{ fontWeight: 600 }}>{item.title}</span>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              marginTop: "0.75rem",
            }}
          >
            {group.items.map((item) => (
              <Link
                key={item.bookingId}
                href={`/bookings/${item.bookingId}?date=${group.dateValue}&view=day&from=admin`}
                style={{
                  display: "inline-block",
                  padding: "0.55rem 0.85rem",
                  backgroundColor: "#fff7ed",
                  border: "1px solid #fdba74",
                  borderRadius: "10px",
                  color: "#9a3412",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Open {item.field} Booking
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
)}

        <div className="admin-card">
          <details>
            <summary
              style={{
                cursor: "pointer",
                listStyle: "none",
                fontWeight: 700,
                color: "#0f172a",
                fontSize: "1.2rem",
              }}
            >
              {recentChangesSummary}
            </summary>

            <div
              style={{
                color: "#64748b",
                marginTop: "0.65rem",
                marginBottom: "1rem",
                lineHeight: 1.5,
              }}
            >
              Recent edits and deletions for admin review.
            </div>

            <div className="admin-filter-sections">
              <div>
                <div style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "0.45rem" }}>
                  Time window
                </div>
                <div className="admin-filter-button-row">
                  <Link href={filterHref("today", changeType)} style={filterButtonStyle(changeWindow === "today")}>
                    Today
                  </Link>
                  <Link href={filterHref("7d", changeType)} style={filterButtonStyle(changeWindow === "7d")}>
                    Last 7 days
                  </Link>
                  <Link href={filterHref("30d", changeType)} style={filterButtonStyle(changeWindow === "30d")}>
                    Last 30 days
                  </Link>
                  <Link href={filterHref("all", changeType)} style={filterButtonStyle(changeWindow === "all")}>
                    All
                  </Link>
                </div>
              </div>

              <div>
                <div style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "0.45rem" }}>
                  Change type
                </div>
                <div className="admin-filter-button-row">
                  <Link href={filterHref(changeWindow, "all")} style={filterButtonStyle(changeType === "all")}>
                    All changes
                  </Link>
                  <Link href={filterHref(changeWindow, "edits")} style={filterButtonStyle(changeType === "edits")}>
                    Edits only
                  </Link>
                  <Link
                    href={filterHref(changeWindow, "deletions")}
                    style={filterButtonStyle(changeType === "deletions")}
                  >
                    Deletions only
                  </Link>
                </div>
              </div>
            </div>

            {recentAuditLogs.length === 0 ? (
              <div
                style={{
                  padding: "1rem",
                  border: "1px dashed #cbd5e1",
                  borderRadius: "12px",
                  color: "#64748b",
                }}
              >
                No booking edits or deletions match the current filters.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "0.85rem" }}>
                {recentAuditLogs.map((log) => {
                  const details = (log.detailsJson ?? {}) as {
                    before?: Record<string, unknown>;
                    after?: Record<string, unknown>;
                    deleted?: Record<string, unknown>;
                  };

                  const isDelete = log.action === "DELETE";
                  const source = isDelete ? details.deleted ?? {} : details.after ?? {};
                  const before = details.before ?? {};

                  const itemTitle = asText(source.title);
                  const itemName = asText(source.teamName);
                  const itemRoom = asText(source.roomName);
                  const itemDate = asText(source.bookingDate);
                  const start = fromMinutes(source.startTimeMinutes);
                  const end = fromMinutes(source.endTimeMinutes);

                  const changedSummary = !isDelete
                    ? [
                        before.title !== source.title ? "Purpose" : "",
                        before.teamId !== source.teamId ? "Team" : "",
                        before.roomId !== source.roomId ? "Field" : "",
                        before.bookingDate !== source.bookingDate ? "Date" : "",
                        before.startTimeMinutes !== source.startTimeMinutes ||
                        before.endTimeMinutes !== source.endTimeMinutes
                          ? "Time"
                          : "",
                        before.notes !== source.notes ? "Notes" : "",
                      ].filter(Boolean)
                    : [];

                  return (
                    <div
                      key={log.id}
                      className="admin-audit-item"
                      style={{
                        backgroundColor: isDelete ? "#fff1f2" : "#f8fafc",
                      }}
                    >
                      <div className="admin-audit-item-row">
                        <div>
                          <div style={{ fontWeight: 700, color: "#0f172a", lineHeight: 1.35 }}>
                            {isDelete ? "Deleted Booking" : "Edited Booking"}
                          </div>
                          <div style={{ color: "#334155", marginTop: "0.2rem", lineHeight: 1.35 }}>
                            {itemTitle} · {itemName}
                          </div>
                          <div
                            style={{
                              color: "#64748b",
                              marginTop: "0.2rem",
                              fontSize: "0.92rem",
                              lineHeight: 1.35,
                            }}
                          >
                            {itemRoom} · {start} - {end}
                          </div>
                        </div>

                        <div style={{ color: "#64748b", fontSize: "0.92rem", lineHeight: 1.35 }}>
                          {formatDateTime(log.createdAt)}
                        </div>
                      </div>

                      <div
                        style={{
                          color: "#64748b",
                          fontSize: "0.92rem",
                          marginTop: "0.45rem",
                          lineHeight: 1.35,
                        }}
                      >
                        {itemDate}
                      </div>

                      {!isDelete && changedSummary.length > 0 && (
                        <div
                          style={{
                            marginTop: "0.55rem",
                            color: "#1d4ed8",
                            fontWeight: 600,
                            fontSize: "0.92rem",
                            lineHeight: 1.35,
                          }}
                        >
                          Changed: {changedSummary.join(", ")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </details>
        </div>
      </div>
    </main>
  );
}