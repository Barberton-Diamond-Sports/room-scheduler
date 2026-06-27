import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ReservationRange = "current" | "all";
type FieldStatusFilter = "active" | "inactive";

type PageProps = {
  searchParams: Promise<{
    roomId?: string;
    range?: string;
    fieldStatus?: string;
  }>;
};

type ReservationEvent = {
  id: string;
  kind: "booking" | "blackout";
  dateValue: string;
  dateLabel: string;
  timeLabel: string;
  typeLabel: string;
  detailLabel: string;
  href: string | null;
  sortDate: Date;
  sortStartMinutes: number;
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

function addDaysToDate(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getEasternNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  return {
    dateValue: `${year}-${month}-${day}`,
    minutesSinceMidnight: hour * 60 + minute,
  };
}

function formatListDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
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

function formatCompactTimeLabel(totalMinutes: number) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${hours12}:${pad(minutes)}`;
}

function formatTimeRange(startMinutes: number, endMinutes: number) {
  const startSuffix = startMinutes >= 12 * 60 ? "PM" : "AM";
  const endSuffix = endMinutes >= 12 * 60 ? "PM" : "AM";

  if (startSuffix === endSuffix) {
    return `${formatCompactTimeLabel(startMinutes)}-${formatTimeLabel(endMinutes)}`;
  }

  return `${formatTimeLabel(startMinutes)}-${formatTimeLabel(endMinutes)}`;
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

function getBookingDetailLabel(booking: {
  title: string | null;
  opponent: string | null;
  team: {
    teamName: string | null;
  } | null;
}) {
  const bookingType = booking.title?.trim() || "";

  if (!booking.team && bookingType === "Other") {
    return "Admin reserved field";
  }

  const teamName = booking.team?.teamName?.trim() || "No team";
  const opponent = booking.opponent?.trim();

  if (opponent && (bookingType === "Game" || bookingType === "Scrimmage")) {
    return `${teamName} vs ${opponent}`;
  }

  return teamName;
}

function normalizeRange(value: string | undefined): ReservationRange {
  return value === "all" ? "all" : "current";
}

function normalizeFieldStatus(value: string | undefined): FieldStatusFilter {
  return value === "inactive" ? "inactive" : "active";
}

function isCurrentOrFutureBooking(
  bookingDateValue: string,
  endTimeMinutes: number,
  todayValue: string,
  currentMinutes: number
) {
  if (bookingDateValue > todayValue) return true;
  if (bookingDateValue < todayValue) return false;
  return endTimeMinutes >= currentMinutes;
}

function buildBlackoutDateValues(startDateTime: Date, endDateTime: Date, range: ReservationRange) {
  const easternNow = getEasternNow();
  const todayStart = fromDateInputValue(easternNow.dateValue);

  let cursor = fromDateInputValue(toDateInputValue(startDateTime));
  const blackoutEnd = fromDateInputValue(toDateInputValue(endDateTime));

  if (range === "current" && cursor < todayStart) {
    cursor = todayStart;
  }

  const dateValues: string[] = [];

  while (cursor < blackoutEnd) {
    const dateValue = toDateInputValue(cursor);

    if (range === "all" || dateValue >= easternNow.dateValue) {
      dateValues.push(dateValue);
    }

    cursor = addDaysToDate(cursor, 1);
  }

  return dateValues;
}

export default async function FieldReservationsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const selectedRange = normalizeRange(params.range);
  const selectedFieldStatus = normalizeFieldStatus(params.fieldStatus);
  const selectedRoomId = params.roomId || "";

  const easternNow = getEasternNow();
  const todayStart = fromDateInputValue(easternNow.dateValue);

  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("admin_access")?.value === "granted";

  const roomIsActive = selectedFieldStatus === "active";

  const [rooms, bookings, blackouts] = await Promise.all([
    prisma.room.findMany({
      where: {
        isActive: roomIsActive,
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.booking.findMany({
      where: {
        status: "ACTIVE",
        room: {
          isActive: roomIsActive,
        },
        ...(selectedRange === "current"
          ? {
              bookingDate: {
                gte: todayStart,
              },
            }
          : {}),
      },
      include: {
        room: true,
        team: true,
      },
      orderBy: [{ bookingDate: "asc" }, { startTimeMinutes: "asc" }, { room: { name: "asc" }}],
    }),

    prisma.roomBlackout.findMany({
      where: {
        room: {
          isActive: roomIsActive,
        },
        ...(selectedRange === "current"
          ? {
              endDateTime: {
                gt: todayStart,
              },
            }
          : {}),
      },
      include: {
        room: true,
      },
      orderBy: [{ startDateTime: "asc" }, { room: { name: "asc" }}],
    }),
  ]);

  const bookingRoomIds = new Set<string>();

  for (const booking of bookings) {
    const bookingDateValue = toDateInputValue(booking.bookingDate);

    if (
      selectedRange === "all" ||
      isCurrentOrFutureBooking(
        bookingDateValue,
        booking.endTimeMinutes,
        easternNow.dateValue,
        easternNow.minutesSinceMidnight
      )
    ) {
      bookingRoomIds.add(booking.roomId);
    }
  }

  const blackoutRoomIds = new Set<string>();

  for (const blackout of blackouts) {
    const blackoutDates = buildBlackoutDateValues(
      blackout.startDateTime,
      blackout.endDateTime,
      selectedRange
    );

    if (blackoutDates.length > 0) {
      blackoutRoomIds.add(blackout.roomId);
    }
  }

  const roomsWithReservations = rooms.filter(
    (room) => bookingRoomIds.has(room.id) || blackoutRoomIds.has(room.id)
  );

  const selectedRoom = roomsWithReservations.find((room) => room.id === selectedRoomId) || null;

  const reservationEvents: ReservationEvent[] = [];

  if (selectedRoom) {
    for (const booking of bookings) {
      if (booking.roomId !== selectedRoom.id) continue;

      const bookingDateValue = toDateInputValue(booking.bookingDate);

      if (
        selectedRange === "current" &&
        !isCurrentOrFutureBooking(
          bookingDateValue,
          booking.endTimeMinutes,
          easternNow.dateValue,
          easternNow.minutesSinceMidnight
        )
      ) {
        continue;
      }

      reservationEvents.push({
        id: booking.id,
        kind: "booking",
        dateValue: bookingDateValue,
        dateLabel: formatListDate(booking.bookingDate),
        timeLabel: formatTimeRange(booking.startTimeMinutes, booking.endTimeMinutes),
        typeLabel: getBookingDisplayTitle(booking),
        detailLabel: getBookingDetailLabel(booking),
        href: `/bookings/${booking.id}?date=${bookingDateValue}&view=day`,
        sortDate: booking.bookingDate,
        sortStartMinutes: booking.startTimeMinutes,
      });
    }

    for (const blackout of blackouts) {
      if (blackout.roomId !== selectedRoom.id) continue;

      const blackoutDateValues = buildBlackoutDateValues(
        blackout.startDateTime,
        blackout.endDateTime,
        selectedRange
      );

      for (const dateValue of blackoutDateValues) {
        const blackoutDate = fromDateInputValue(dateValue);
        const reason = blackout.reason?.trim();

        reservationEvents.push({
          id: `${blackout.id}-${dateValue}`,
          kind: "blackout",
          dateValue,
          dateLabel: formatListDate(blackoutDate),
          timeLabel: "All Day",
          typeLabel: "Field Unavailable",
          detailLabel: reason || "Blackout",
          href: isAdmin ? "/admin/blackouts" : null,
          sortDate: blackoutDate,
          sortStartMinutes: -1,
        });
      }
    }
  }

  reservationEvents.sort((a, b) => {
    const dateCompare = a.sortDate.getTime() - b.sortDate.getTime();
    if (dateCompare !== 0) return dateCompare;
    return a.sortStartMinutes - b.sortStartMinutes;
  });

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
          max-width: 1200px;
          margin: 0 auto;
        }

        .hero-card,
        .content-card {
          background: #ffffff;
          border: 1px solid #dbe3f0;
          border-radius: 16px;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
        }

        .hero-card {
          padding: 1.25rem;
          margin-bottom: 1rem;
        }

        .content-card {
          padding: 1.25rem;
        }

        .top-links,
        .filter-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
        }

        .top-links {
          margin-top: 1rem;
        }

        .nav-link {
          display: inline-block;
          padding: 0.65rem 1rem;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 600;
          text-align: center;
        }

        .filter-form {
          display: grid;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }

        .filter-group {
          display: grid;
          gap: 0.35rem;
        }

        .filter-label {
          font-weight: 700;
          color: #334155;
        }

        .filter-input {
          width: 100%;
          padding: 0.7rem 0.8rem;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          background-color: #ffffff;
          color: #0f172a;
          box-sizing: border-box;
        }

        .filter-button {
          padding: 0.75rem 1rem;
          background-color: #2563eb;
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .reservation-list {
          display: grid;
          gap: 0.5rem;
        }

        .reservation-line {
          display: grid;
          grid-template-columns: 86px 18px 132px 18px 160px 18px minmax(240px, 1fr);
          align-items: center;
          gap: 0.35rem;
          padding: 0.75rem 0.85rem;
          border: 1px solid #dbe3f0;
          border-radius: 12px;
          background-color: #f8fafc;
          color: #0f172a;
          text-decoration: none;
          font-size: 0.95rem;
          line-height: 1.35;
        }

        .reservation-line.clickable:hover {
          background-color: #eef2ff;
          border-color: #c7d2fe;
        }

        .reservation-line.blackout {
          background-color: #f3f4f6;
          border-color: #cbd5e1;
          color: #374151;
        }

        .reservation-separator {
          color: #64748b;
          text-align: center;
          font-weight: 700;
        }

        .reservation-date,
        .reservation-time,
        .reservation-type,
        .reservation-detail {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .reservation-type {
          font-weight: 700;
        }

        .empty-state {
          border: 1px dashed #cbd5e1;
          border-radius: 14px;
          padding: 1.25rem;
          background-color: #f8fafc;
          color: #475569;
          line-height: 1.5;
        }

        @media (max-width: 768px) {
          main {
            padding: 0.75rem;
          }

          .hero-card,
          .content-card {
            border-radius: 14px;
            padding: 1rem;
          }

          .top-links,
          .filter-row {
            flex-direction: column;
            align-items: stretch;
          }

          .top-links a,
          .filter-button {
            width: 100%;
            box-sizing: border-box;
          }

          .reservation-line {
            grid-template-columns: 1fr;
            gap: 0.2rem;
          }

          .reservation-separator {
            display: none;
          }

          .reservation-date,
          .reservation-time,
          .reservation-type,
          .reservation-detail {
            white-space: normal;
          }

          .reservation-date {
            font-weight: 700;
          }

          .reservation-detail {
            color: #334155;
          }
        }
      `}</style>

      <div className="page-shell">
        <div className="hero-card">
          <h1 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "1.9rem" }}>
            Reservations by Field
          </h1>

          <p style={{ marginTop: 0, color: "#4b5563", lineHeight: 1.5 }}>
            Choose a field to see its reservations in a simple list view.
          </p>

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
    href="/bookings"
    className="nav-link"
    style={{
      backgroundColor: "#f8fafc",
      border: "1px solid #dbe3f0",
      color: "#475569",
    }}
  >
    Calendar
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

        </div>

        <div className="content-card">
          <form method="GET" className="filter-form">
            <div
              className="filter-row"
              style={{
                alignItems: "end",
              }}
            >
              <div className="filter-group" style={{ flex: "1 1 220px" }}>
                <label className="filter-label" htmlFor="range">
                  Reservations to show
                </label>
                <select
                  id="range"
                  name="range"
                  defaultValue={selectedRange}
                  className="filter-input"
                >
                  <option value="current">Current and future reservations</option>
                  <option value="all">All reservations</option>
                </select>
              </div>

              <div className="filter-group" style={{ flex: "1 1 180px" }}>
                <label className="filter-label" htmlFor="fieldStatus">
                  Field status
                </label>
                <select
                  id="fieldStatus"
                  name="fieldStatus"
                  defaultValue={selectedFieldStatus}
                  className="filter-input"
                >
                  <option value="active">Active fields</option>
                  <option value="inactive">Inactive fields</option>
                </select>
              </div>

              <div className="filter-group" style={{ flex: "2 1 260px" }}>
                <label className="filter-label" htmlFor="roomId">
                  Field
                </label>
                <select
                  id="roomId"
                  name="roomId"
                  defaultValue={selectedRoom?.id || ""}
                  className="filter-input"
                >
                  <option value="">Choose a field...</option>
                  {roomsWithReservations.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>

              <button type="submit" className="filter-button">
                Load
              </button>
            </div>
          </form>

          {!selectedRoom && roomsWithReservations.length === 0 && (
            <div className="empty-state">
              No matching reservations were found for the selected filters.
            </div>
          )}

          {!selectedRoom && roomsWithReservations.length > 0 && (
            <div className="empty-state">
              Choose a field from the dropdown above to view its reservations.
            </div>
          )}

          {selectedRoom && (
            <>
              <h2 style={{ marginTop: 0, marginBottom: "0.35rem", color: "#0f172a" }}>
                {selectedRoom.name}
              </h2>

              {selectedRoom.description && (
                <p style={{ marginTop: 0, marginBottom: "1rem", color: "#64748b" }}>
                  {selectedRoom.description}
                </p>
              )}

              {reservationEvents.length === 0 ? (
                <div className="empty-state">
                  No matching reservations were found for this field.
                </div>
              ) : (
                <div className="reservation-list">
                  {reservationEvents.map((event) => {
                    const content = (
                      <>
                        <span className="reservation-date">{event.dateLabel}</span>
                        <span className="reservation-separator">-</span>
                        <span className="reservation-time">{event.timeLabel}</span>
                        <span className="reservation-separator">-</span>
                        <span className="reservation-type">{event.typeLabel}</span>
                        <span className="reservation-separator">-</span>
                        <span className="reservation-detail">{event.detailLabel}</span>
                      </>
                    );

                    if (event.href) {
  return (
    <Link
      key={event.id}
      href={event.href}
      className={`reservation-line clickable ${
        event.kind === "blackout" ? "blackout" : ""
      }`}
      title={`${event.dateLabel} - ${event.timeLabel} - ${event.typeLabel} - ${event.detailLabel}`}
    >
      {content}
    </Link>
  );
}

                    return (
                      <div
                        key={event.id}
                        className={`reservation-line ${
                          event.kind === "blackout" ? "blackout" : ""
                        }`}
                        title={`${event.dateLabel} - ${event.timeLabel} - ${event.typeLabel} - ${event.detailLabel}`}
                      >
                        {content}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}