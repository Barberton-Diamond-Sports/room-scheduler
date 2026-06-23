

import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const START_HOUR = 9;
const END_HOUR = 21;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 36;

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

function fromDateInputValue(dateString: string) {
  return new Date(`${dateString}T00:00:00`);
}

function addDays(dateString: string, days: number) {
  const date = fromDateInputValue(dateString);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

function formatTimeLabel(totalMinutes: number) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${hours12}:${pad(minutes)} ${suffix}`;
}

function formatTimeRange(startMinutes: number, endMinutes: number) {
  return `${formatTimeLabel(startMinutes)} - ${formatTimeLabel(endMinutes)}`;
}

function formatPageDate(dateString: string) {
  const date = fromDateInputValue(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getWeekStart(dateString: string) {
  const date = fromDateInputValue(dateString);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function buildWeekDays(dateString: string) {
  const weekStart = getWeekStart(dateString);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return {
      value: toDateInputValue(date),
      label: date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      longLabel: date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    };
  });
}

function addDaysToDate(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateKey(date: Date) {
  return toDateInputValue(date);
}

function formatBlackoutLabel(reason: string | null | undefined) {
  const trimmed = reason?.trim();
  return trimmed ? `Field Unavailable ${trimmed}` : "Field Unavailable";
}

function buildBlackoutMap(
  roomBlackouts: Array<{
    roomId: string;
    startDateTime: Date;
    endDateTime: Date;
    reason: string | null;
  }>
) {
  const blackoutMap = new Map<string, { label: string }>();

  for (const blackout of roomBlackouts) {
    let cursor = fromDateInputValue(toDateInputValue(blackout.startDateTime));
    const blackoutEnd = fromDateInputValue(toDateInputValue(blackout.endDateTime));

    while (cursor < blackoutEnd) {
      blackoutMap.set(`${blackout.roomId}|${toDateKey(cursor)}`, {
        label: formatBlackoutLabel(blackout.reason),
      });
      cursor = addDaysToDate(cursor, 1);
    }
  }

  return blackoutMap;
}

function bookingBlockColors(title: string | null) {
  if (title === "Game") {
    return { backgroundColor: "#ede9fe", borderColor: "#a78bfa" };
  }

  if (title === "Practice" || title === "Scrimmage") {
    return { backgroundColor: "#fef3c7", borderColor: "#facc15" };
  }

  return { backgroundColor: "#fee2e2", borderColor: "#fca5a5" };
}

function getBookingDisplayTitle(booking: {
  title: string | null;
  team: {
    ageGroup: string | null;
  } | null;
}) {
  const bookingType = booking.title?.trim() || "Booking";

  if (!booking.team && bookingType === "Other") {
    return "Reserved";
  }

  const ageGroup = booking.team?.ageGroup?.trim() || "";
  const normalizedAgeGroup = ageGroup.toLowerCase();

  let groupLabel = "";

  if (normalizedAgeGroup.includes("softball")) {
    groupLabel = "Softball";
  } else if (
    normalizedAgeGroup.includes("tee ball") ||
    normalizedAgeGroup.includes("t-ball") ||
    normalizedAgeGroup.includes("tball")
  ) {
    groupLabel = "Tee Ball";
  } else if (normalizedAgeGroup.includes("baseball")) {
    groupLabel = "Baseball";
  } else {
    groupLabel = ageGroup;
  }

  return groupLabel ? `${groupLabel} ${bookingType}` : bookingType;
}

function getBookingTeamDisplay(booking: {
  title: string | null;
  team: {
    teamName: string | null;
  } | null;
}) {
  const bookingType = booking.title?.trim() || "";

  if (!booking.team && bookingType === "Other") {
    return "Admin reserved field";
  }

  return booking.team?.teamName || "No team";
}

type PageProps = {
  searchParams: Promise<{
    date?: string;
    view?: string;
  }>;
};

export default async function BookingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedDate = params.date || getEasternTodayValue();
  const view = params.view === "day" ? "day" : "week";

  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("admin_access")?.value === "granted";

  const dayStart = fromDateInputValue(selectedDate);
  const nextDay = new Date(dayStart);
  nextDay.setDate(nextDay.getDate() + 1);

  const weekDays = buildWeekDays(selectedDate);
  const weekStart = fromDateInputValue(weekDays[0].value);
  const weekEnd = fromDateInputValue(weekDays[6].value);
  weekEnd.setDate(weekEnd.getDate() + 1);

  const previousWeekDate = addDays(selectedDate, -7);
  const nextWeekDate = addDays(selectedDate, 7);
  const previousDayDate = addDays(selectedDate, -1);
  const nextDayDate = addDays(selectedDate, 1);
  const todayDate = getEasternTodayValue();

  const [rooms, dayBookings, weekBookings, dayRoomBlackouts, weekRoomBlackouts] = await Promise.all([
    prisma.room.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.booking.findMany({
      where: {
        status: "ACTIVE",
        bookingDate: { gte: dayStart, lt: nextDay },
      },
      include: {
        room: true,
        team: true,
      },
      orderBy: [{ bookingDate: "asc" }, { roomId: "asc" }, { startTimeMinutes: "asc" }],
    }),
    prisma.booking.findMany({
      where: {
        status: "ACTIVE",
        bookingDate: { gte: weekStart, lt: weekEnd },
      },
      include: {
        room: true,
        team: true,
      },
      orderBy: [{ bookingDate: "asc" }, { roomId: "asc" }, { startTimeMinutes: "asc" }],
    }),
    prisma.roomBlackout.findMany({
      where: { startDateTime: { lt: nextDay }, endDateTime: { gt: dayStart } },
      include: { room: true },
      orderBy: [{ startDateTime: "asc" }, { roomId: "asc" }],
    }),
    prisma.roomBlackout.findMany({
      where: { startDateTime: { lt: weekEnd }, endDateTime: { gt: weekStart } },
      include: { room: true },
      orderBy: [{ startDateTime: "asc" }, { roomId: "asc" }],
    }),
  ]);

  const slots: number[] = [];
  for (let minutes = START_HOUR * 60; minutes < END_HOUR * 60; minutes += SLOT_MINUTES) {
    slots.push(minutes);
  }

  const totalHeight = slots.length * SLOT_HEIGHT;

  const dayBlackoutMap = buildBlackoutMap(
    dayRoomBlackouts.map((item) => ({
      roomId: item.roomId,
      startDateTime: item.startDateTime,
      endDateTime: item.endDateTime,
      reason: item.reason,
    }))
  );

  const weekBlackoutMap = buildBlackoutMap(
    weekRoomBlackouts.map((item) => ({
      roomId: item.roomId,
      startDateTime: item.startDateTime,
      endDateTime: item.endDateTime,
      reason: item.reason,
    }))
  );

  const blackoutCellStyle = {
    backgroundColor: "#e5e7eb",
    color: "#374151",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "0.65rem 0.75rem",
    fontWeight: 700,
    textAlign: "center" as const,
  };

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
        .page-shell {
          max-width: 1600px;
          margin: 0 auto;
        }

        .hero-card,
        .view-card {
          background: #ffffff;
          border: 1px solid #dbe3f0;
          border-radius: 16px;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
        }

        .hero-card {
          padding: 1.25rem;
          margin-bottom: 1rem;
        }

        .title-row {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .button-row,
        .view-controls,
        .top-links,
        .date-form {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .button-row {
          margin-bottom: 1rem;
        }

        .title-row-bottom {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
        }

        .top-links {
          align-items: center;
        }

        .view-controls {
          align-items: center;
          justify-content: flex-start;
        }

        .date-form {
          align-items: center;
        }

        .legend-row {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          margin-bottom: 1rem;
        }

        .desktop-only {
          display: block;
        }

        .mobile-only {
          display: none;
        }

        .mobile-hide {
          display: inline-block;
        }

        .nav-link {
          display: inline-block;
          padding: 0.65rem 1rem;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 600;
          text-align: center;
        }

        .pill-link {
          display: inline-block;
          padding: 0.55rem 0.9rem;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 600;
          text-align: center;
        }

        .week-date-header-link {
          display: block;
          border-radius: 12px;
          padding: 0.85rem 0.75rem;
          text-align: center;
          font-weight: 700;
          text-decoration: none;
          transition: transform 120ms ease, box-shadow 120ms ease;
        }

        .week-date-header-link:hover {
          transform: translateY(-1px);
          box-shadow: 0 3px 10px rgba(15, 23, 42, 0.10);
        }

        .mobile-stack {
          display: grid;
          gap: 1rem;
        }

        .mobile-day-section,
        .mobile-week-day {
          background: #ffffff;
          border: 1px solid #dbe3f0;
          border-radius: 16px;
          padding: 1rem;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
        }

        .mobile-room-card {
          border: 1px solid #dbe3f0;
          border-radius: 14px;
          background: #f8fafc;
          padding: 0.85rem;
        }

        .mobile-bookings-list {
          display: grid;
          gap: 0.6rem;
          margin-top: 0.75rem;
        }

        .mobile-empty {
          color: #94a3b8;
          font-size: 0.92rem;
          text-align: center;
          padding: 0.6rem 0;
        }

        .mobile-booking-link {
          display: block;
          border-radius: 12px;
          padding: 0.7rem 0.8rem;
          text-decoration: none;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
        }

        .mobile-day-heading {
          margin: 0 0 0.9rem 0;
          font-size: 1.05rem;
          color: #0f172a;
        }

        .mobile-room-heading {
          font-weight: 700;
          color: #334155;
          margin: 0;
        }

        .mobile-room-description {
          font-size: 0.82rem;
          color: #64748b;
          margin-top: 0.2rem;
        }

        .mobile-subsections {
          display: grid;
          gap: 0.85rem;
        }

        @media (max-width: 768px) {
          main {
            padding: 0.75rem;
          }

          .hero-card,
          .view-card,
          .mobile-day-section,
          .mobile-week-day {
            border-radius: 14px;
          }

          .hero-card {
            padding: 1rem;
          }

          .mobile-hide {
            display: none !important;
          }

          .title-row-bottom {
            flex-direction: column;
            align-items: stretch;
          }

          .top-links,
          .view-controls,
          .date-form,
          .button-row {
            flex-direction: column;
            align-items: stretch;
          }

          .top-links a,
          .view-controls a,
          .button-row a,
          .date-form button,
          .date-form input {
            width: 100%;
            box-sizing: border-box;
          }

          .date-form label {
            margin-bottom: -0.25rem;
          }

          .legend-row {
            margin-bottom: 0.85rem;
          }

          .desktop-only {
            display: none;
          }

          .mobile-only {
            display: block;
          }

          .mobile-room-card {
            padding: 0.8rem;
          }
        }
      `}</style>

      <div className="page-shell">
        <div className="hero-card">
          <h1 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "1.9rem" }}>
            BDS Field Calendar
          </h1>

          <p
            className="desktop-only"
            style={{ marginTop: 0, color: "#4b5563", marginBottom: "1rem", lineHeight: 1.5 }}
          >
            {view === "week"
              ? `Week of ${formatPageDate(weekDays[0].value)}`
              : formatPageDate(selectedDate)}
          </p>

          <p
            className="mobile-only"
            style={{ marginTop: 0, color: "#4b5563", marginBottom: "1rem", lineHeight: 1.5 }}
          >
            {formatPageDate(selectedDate)}
          </p>

          {view === "week" && (
            <div className="button-row desktop-only">
              <Link
                href={`/bookings?date=${previousWeekDate}&view=week`}
                className="nav-link"
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #dbe3f0",
                  color: "#334155",
                }}
              >
                ← Previous Week
              </Link>

              <Link
                href={`/bookings?date=${todayDate}&view=week`}
                className="nav-link"
                style={{
                  backgroundColor: "#dbeafe",
                  border: "1px solid #93c5fd",
                  color: "#1d4ed8",
                }}
              >
                This Week
              </Link>

              <Link
                href={`/bookings?date=${nextWeekDate}&view=week`}
                className="nav-link"
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #dbe3f0",
                  color: "#334155",
                }}
              >
                Next Week →
              </Link>
            </div>
          )}

          {view === "day" && (
            <div className="button-row desktop-only">
              <Link
                href={`/bookings?date=${previousDayDate}&view=day`}
                className="nav-link"
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #dbe3f0",
                  color: "#334155",
                }}
              >
                ← Previous Day
              </Link>

              <Link
                href={`/bookings?date=${todayDate}&view=day`}
                className="nav-link"
                style={{
                  backgroundColor: "#dbeafe",
                  border: "1px solid #93c5fd",
                  color: "#1d4ed8",
                }}
              >
                Today
              </Link>

              <Link
                href={`/bookings?date=${nextDayDate}&view=day`}
                className="nav-link"
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #dbe3f0",
                  color: "#334155",
                }}
              >
                Next Day →
              </Link>
            </div>
          )}

          <div className="button-row mobile-only">
            <Link
              href={`/bookings?date=${previousDayDate}&view=day`}
              className="nav-link"
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #dbe3f0",
                color: "#334155",
              }}
            >
              ← Previous Day
            </Link>

            <Link
              href={`/bookings?date=${todayDate}&view=day`}
              className="nav-link"
              style={{
                backgroundColor: "#dbeafe",
                border: "1px solid #93c5fd",
                color: "#1d4ed8",
              }}
            >
              Today
            </Link>

            <Link
              href={`/bookings?date=${nextDayDate}&view=day`}
              className="nav-link"
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #dbe3f0",
                color: "#334155",
              }}
            >
              Next Day →
            </Link>
          </div>

          <div className="title-row-bottom">
            <div className="top-links">
              <Link
                href="/"
                className="nav-link"
                style={{
                  backgroundColor: "#eef2ff",
                  border: "1px solid #c7d2fe",
                  color: "#1e3a8a",
                }}
              >
                Home
              </Link>

              <Link
                href="/team-schedule"
                className="nav-link"
                style={{
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  color: "#166534",
                }}
              >
                Reservations by Team
              </Link>

              <Link
                href="/book"
                className="nav-link"
                style={{
                  backgroundColor: "#ecfeff",
                  border: "1px solid #a5f3fc",
                  color: "#155e75",
                }}
              >
                Book a Field
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  className="nav-link"
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #dbe3f0",
                    color: "#475569",
                  }}
                >
                  Admin
                </Link>
              )}
            </div>

            <div className="view-controls">
              <Link
                href={`/bookings?date=${selectedDate}&view=day`}
                className="pill-link"
                style={{
                  border: view === "day" ? "1px solid #93c5fd" : "1px solid #dbe3f0",
                  backgroundColor: view === "day" ? "#dbeafe" : "#f8fafc",
                  color: view === "day" ? "#1d4ed8" : "#475569",
                }}
              >
                Day View
              </Link>

              <Link
                href={`/bookings?date=${selectedDate}&view=week`}
                className="pill-link mobile-hide"
                style={{
                  border: view === "week" ? "1px solid #93c5fd" : "1px solid #dbe3f0",
                  backgroundColor: view === "week" ? "#dbeafe" : "#f8fafc",
                  color: view === "week" ? "#1d4ed8" : "#475569",
                }}
              >
                Week View
              </Link>

              <form method="GET" className="date-form">
                <input type="hidden" name="view" value={view} />
                <label htmlFor="date" style={{ fontWeight: 600, color: "#334155" }}>
                  View date:
                </label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={selectedDate}
                  style={{
                    padding: "0.65rem 0.8rem",
                    border: "1px solid #cbd5e1",
                    borderRadius: "10px",
                    backgroundColor: "#f8fafc",
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: "0.65rem 1rem",
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Load
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="legend-row">
          <div
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "4px",
              backgroundColor: "#e5e7eb",
              border: "1px solid #cbd5e1",
              flexShrink: 0,
            }}
          />
          <div style={{ color: "#475569", fontWeight: 600 }}>Field unavailable</div>
        </div>

        {/* MOBILE DAY VIEW - ALWAYS */}
        <div className="mobile-only">
          <div className="mobile-stack">
            {rooms.map((room) => {
              const roomBookings = dayBookings.filter((booking) => booking.roomId === room.id);
              const roomBlackout = dayBlackoutMap.get(`${room.id}|${selectedDate}`);

              return (
                <section key={room.id} className="mobile-day-section">
                  <h2 className="mobile-room-heading">{room.name}</h2>
                  {room.description && (
                    <div className="mobile-room-description">{room.description}</div>
                  )}

                  {roomBlackout ? (
                    <div
                      style={{
                        marginTop: "0.85rem",
                        ...blackoutCellStyle,
                        lineHeight: 1.4,
                      }}
                    >
                      {roomBlackout.label}
                    </div>
                  ) : roomBookings.length === 0 ? (
                    <div className="mobile-empty" style={{ marginTop: "0.85rem" }}>
                      No bookings for this field.
                    </div>
                  ) : (
                    <div className="mobile-bookings-list">
                      {roomBookings.map((booking) => {
                        const { backgroundColor, borderColor } = bookingBlockColors(booking.title);
                        const hoverText = [
                          getBookingDisplayTitle(booking),
                          getBookingTeamDisplay(booking),
                          booking.team?.coachEmail || "",
                          formatTimeRange(booking.startTimeMinutes, booking.endTimeMinutes),
                          booking.notes || "",
                        ]
                          .filter(Boolean)
                          .join(" • ");

                        return (
                          <Link
                            key={booking.id}
                            href={`/bookings/${booking.id}?date=${selectedDate}&view=day`}
                            title={hoverText}
                            className="mobile-booking-link"
                            style={{
                              backgroundColor,
                              border: `1px solid ${borderColor}`,
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 700,
                                color: "#0f172a",
                                fontSize: "0.96rem",
                                lineHeight: 1.35,
                              }}
                            >
                              {getBookingDisplayTitle(booking)}
                            </div>
                            <div
                              style={{
                                color: "#334155",
                                marginTop: "0.2rem",
                                lineHeight: 1.35,
                              }}
                            >
                              {getBookingTeamDisplay(booking)}
                            </div>
                            <div
                              style={{
                                color: "#475569",
                                marginTop: "0.2rem",
                                fontSize: "0.88rem",
                              }}
                            >
                              {formatTimeRange(booking.startTimeMinutes, booking.endTimeMinutes)}
                            </div>
                            {booking.notes && (
                              <div
                                style={{
                                  color: "#475569",
                                  marginTop: "0.35rem",
                                  fontSize: "0.84rem",
                                  lineHeight: 1.35,
                                }}
                              >
                                {booking.notes}
                              </div>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>

        {/* DESKTOP DAY VIEW */}
        {view === "day" && (
          <div className="desktop-only">
            <div
              className="view-card"
              style={{
                padding: "1rem",
                overflowX: "auto",
              }}
            >
              <div style={{ display: "flex", gap: "1rem", minWidth: "1200px" }}>
                <div style={{ width: "100px", flexShrink: 0 }}>
                  <div style={{ height: "48px" }} />
                  <div style={{ position: "relative", height: `${totalHeight}px` }}>
                    {slots.map((slot, index) => (
                      <div
                        key={slot}
                        style={{
                          position: "absolute",
                          top: `${index * SLOT_HEIGHT - 10}px`,
                          left: 0,
                          right: 0,
                          fontSize: "0.85rem",
                          color: "#64748b",
                        }}
                      >
                        {formatTimeLabel(slot)}
                      </div>
                    ))}
                  </div>
                </div>

                {rooms.map((room) => {
                  const roomBookings = dayBookings.filter((booking) => booking.roomId === room.id);
                  const roomBlackout = dayBlackoutMap.get(`${room.id}|${selectedDate}`);

                  return (
                    <div key={room.id} style={{ minWidth: "220px", flex: 1 }}>
                      <div
                        style={{
                          height: "60px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid #dbe3f0",
                          backgroundColor: "#f8fafc",
                          borderRadius: "12px 12px 0 0",
                          padding: "0.35rem 0.5rem",
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontWeight: 700, color: "#334155" }}>{room.name}</div>
                        {room.description && (
                          <div
                            style={{
                              fontSize: "0.82rem",
                              color: "#64748b",
                              marginTop: "0.15rem",
                            }}
                          >
                            {room.description}
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          position: "relative",
                          height: `${totalHeight}px`,
                          border: "1px solid #dbe3f0",
                          borderTop: "none",
                          backgroundColor: roomBlackout ? "#f3f4f6" : "#ffffff",
                          borderRadius: "0 0 12px 12px",
                        }}
                      >
                        {roomBlackout ? (
                          <div
                            style={{
                              position: "absolute",
                              inset: "0",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "1rem",
                              textAlign: "center",
                              color: "#374151",
                              fontWeight: 800,
                              lineHeight: 1.4,
                            }}
                          >
                            {roomBlackout.label}
                          </div>
                        ) : (
                          <>
                            {slots.map((slot, index) => (
                              <div
                                key={slot}
                                style={{
                                  position: "absolute",
                                  top: `${index * SLOT_HEIGHT}px`,
                                  left: 0,
                                  right: 0,
                                  borderTop: "1px solid #eef2f7",
                                  height: `${SLOT_HEIGHT}px`,
                                }}
                              />
                            ))}

                            {roomBookings.map((booking) => {
                              const top =
                                ((booking.startTimeMinutes - START_HOUR * 60) / SLOT_MINUTES) *
                                SLOT_HEIGHT;
                              const height = booking.durationBlocks * SLOT_HEIGHT - 4;
                              const showNotes = booking.durationBlocks >= 4 && Boolean(booking.notes);
                              const hoverText = [
                                getBookingDisplayTitle(booking),
                                getBookingTeamDisplay(booking),
                                booking.team?.coachEmail || "",
                                formatTimeRange(booking.startTimeMinutes, booking.endTimeMinutes),
                                booking.notes || "",
                              ]
                                .filter(Boolean)
                                .join(" • ");
                              const { backgroundColor, borderColor } = bookingBlockColors(booking.title);

                              return (
                                <Link
                                  key={booking.id}
                                  href={`/bookings/${booking.id}?date=${selectedDate}&view=day`}
                                  title={hoverText}
                                  style={{
                                    position: "absolute",
                                    top: `${top + 2}px`,
                                    left: "6px",
                                    right: "6px",
                                    height: `${height}px`,
                                    backgroundColor,
                                    border: `1px solid ${borderColor}`,
                                    borderRadius: "10px",
                                    padding: "0.45rem",
                                    overflow: "hidden",
                                    fontSize: "0.85rem",
                                    boxSizing: "border-box",
                                    boxShadow: "0 3px 10px rgba(15, 23, 42, 0.10)",
                                    textDecoration: "none",
                                    display: "block",
                                    cursor: "pointer",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontWeight: 700,
                                      color: "#0f172a",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {getBookingDisplayTitle(booking)}
                                  </div>
                                  <div
                                    style={{
                                      color: "#334155",
                                      marginTop: "0.15rem",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {getBookingTeamDisplay(booking)}
                                  </div>
                                  <div
                                    style={{
                                      color: "#475569",
                                      marginTop: "0.15rem",
                                      fontSize: "0.8rem",
                                    }}
                                  >
                                    {formatTimeRange(booking.startTimeMinutes, booking.endTimeMinutes)}
                                  </div>
                                  {showNotes && (
                                    <div
                                      style={{
                                        color: "#475569",
                                        marginTop: "0.3rem",
                                        fontSize: "0.78rem",
                                        lineHeight: 1.25,
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden",
                                      }}
                                    >
                                      {booking.notes}
                                    </div>
                                  )}
                                </Link>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* DESKTOP WEEK VIEW */}
        {view === "week" && (
          <div className="desktop-only">
            <div
              className="view-card"
              style={{
                padding: "1rem",
                overflowX: "auto",
              }}
            >
              <div style={{ minWidth: "1200px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `220px repeat(${weekDays.length}, minmax(150px, 1fr))`,
                    gap: "0.75rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div />
                  {weekDays.map((day) => {
                    const isTodayHeader = day.value === todayDate;

                    return (
                      <Link
                        key={day.value}
                        href={`/book?date=${day.value}`}
                        title={`Book a field for ${day.longLabel}`}
                        className="week-date-header-link"
                        style={{
                          backgroundColor: isTodayHeader ? "#dbeafe" : "#f8fafc",
                          border: isTodayHeader ? "1px solid #93c5fd" : "1px solid #dbe3f0",
                          color: isTodayHeader ? "#1d4ed8" : "#334155",
                        }}
                      >
                        {day.label}
                      </Link>
                    );
                  })}
                </div>

                <div style={{ display: "grid", gap: "0.75rem" }}>
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: `220px repeat(${weekDays.length}, minmax(150px, 1fr))`,
                        gap: "0.75rem",
                        alignItems: "stretch",
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: "#f8fafc",
                          border: "1px solid #dbe3f0",
                          borderRadius: "12px",
                          padding: "0.9rem 1rem",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                        }}
                      >
                        <div style={{ fontWeight: 700, color: "#334155" }}>{room.name}</div>
                        {room.description && (
                          <div
                            style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.18rem" }}
                          >
                            {room.description}
                          </div>
                        )}
                      </div>

                      {weekDays.map((day) => {
                        const cellBookings = weekBookings.filter(
                          (booking) =>
                            booking.roomId === room.id &&
                            toDateInputValue(booking.bookingDate) === day.value
                        );
                        const cellBlackout = weekBlackoutMap.get(`${room.id}|${day.value}`);
                        const isTodayCell = day.value === todayDate;

                        return (
                          <div
                            key={day.value}
                            style={{
                              backgroundColor: cellBlackout
                                ? "#f3f4f6"
                                : isTodayCell
                                ? "#eff6ff"
                                : "#ffffff",
                              border: cellBlackout
                                ? "1px solid #cbd5e1"
                                : isTodayCell
                                ? "1px solid #93c5fd"
                                : "1px solid #dbe3f0",
                              borderRadius: "12px",
                              padding: "0.55rem",
                              minHeight: "88px",
                            }}
                          >
                            {cellBlackout ? (
                              <div
                                style={{
                                  ...blackoutCellStyle,
                                  minHeight: "76px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {cellBlackout.label}
                              </div>
                            ) : cellBookings.length === 0 ? (
							  <Link
								href={`/book?date=${day.value}&roomId=${room.id}`}
								title={`Book ${room.name} on ${day.longLabel}`}
								style={{
								  display: "flex",
								  alignItems: "center",
								  justifyContent: "center",
								  minHeight: "76px",
								  color: isTodayCell ? "#2563eb" : "#94a3b8",
								  fontSize: "0.88rem",
								  textAlign: "center",
								  textDecoration: "none",
								  borderRadius: "10px",
								  fontWeight: 700,
								}}
							  >
								—
							  </Link>
							) : (
                              <div style={{ display: "grid", gap: "0.45rem" }}>
                                {cellBookings.map((booking) => {
                                  const { backgroundColor, borderColor } = bookingBlockColors(booking.title);
                                  const hoverText = [
                                    getBookingDisplayTitle(booking),
                                    getBookingTeamDisplay(booking),
                                    booking.team?.coachEmail || "",
                                    formatTimeRange(booking.startTimeMinutes, booking.endTimeMinutes),
                                    booking.notes || "",
                                  ]
                                    .filter(Boolean)
                                    .join(" • ");

                                  return (
                                    <Link
                                      key={booking.id}
                                      href={`/bookings/${booking.id}?date=${selectedDate}&view=week`}
                                      title={hoverText}
                                      style={{
                                        display: "block",
                                        backgroundColor,
                                        border: `1px solid ${borderColor}`,
                                        borderRadius: "10px",
                                        padding: "0.5rem 0.55rem",
                                        textDecoration: "none",
                                        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)",
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontWeight: 700,
                                          color: "#0f172a",
                                          fontSize: "0.83rem",
                                          whiteSpace: "nowrap",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                        }}
                                      >
                                        {getBookingDisplayTitle(booking)}
                                      </div>
                                      <div
                                        style={{
                                          color: "#334155",
                                          marginTop: "0.15rem",
                                          fontSize: "0.8rem",
                                          whiteSpace: "nowrap",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                        }}
                                      >
                                        {getBookingTeamDisplay(booking)}
                                      </div>
                                      <div
                                        style={{
                                          color: "#475569",
                                          marginTop: "0.15rem",
                                          fontSize: "0.77rem",
                                        }}
                                      >
                                        {formatTimeRange(
                                          booking.startTimeMinutes,
                                          booking.endTimeMinutes
                                        )}
                                      </div>
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}