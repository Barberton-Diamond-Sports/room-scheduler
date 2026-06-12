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
  return trimmed ? `BLACKED OUT · ${trimmed}` : "BLACKED OUT";
}

function bookingBlockColors(title: string | null) {
  if (title === "Game" || title === "Tournament") {
    return { backgroundColor: "#ede9fe", borderColor: "#a78bfa" };
  }

  if (title === "Practice" || title === "Scrimmage") {
    return { backgroundColor: "#fef3c7", borderColor: "#facc15" };
  }

  return { backgroundColor: "#fee2e2", borderColor: "#fca5a5" };
}

type PageProps = {
  searchParams: Promise<{
    date?: string;
    view?: string;
  }>;
};

export default async function BookingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedDate = params.date || toDateInputValue(new Date());
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
  const todayDate = toDateInputValue(new Date());

  const [rooms, bookings, roomBlackouts] = await Promise.all([
    prisma.room.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.booking.findMany({
      where: {
        status: "ACTIVE",
        bookingDate:
          view === "week"
            ? { gte: weekStart, lt: weekEnd }
            : { gte: dayStart, lt: nextDay },
      },
      include: {
        room: true,
        team: true,
      },
      orderBy: [{ bookingDate: "asc" }, { roomId: "asc" }, { startTimeMinutes: "asc" }],
    }),
    prisma.roomBlackout.findMany({
      where:
        view === "week"
          ? { startDateTime: { lt: weekEnd }, endDateTime: { gt: weekStart } }
          : { startDateTime: { lt: nextDay }, endDateTime: { gt: dayStart } },
      include: { room: true },
      orderBy: [{ startDateTime: "asc" }, { roomId: "asc" }],
    }),
  ]);

  const slots: number[] = [];
  for (let minutes = START_HOUR * 60; minutes < END_HOUR * 60; minutes += SLOT_MINUTES) {
    slots.push(minutes);
  }

  const totalHeight = slots.length * SLOT_HEIGHT;

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

  const blackoutCellStyle = {
    backgroundColor: "#374151",
    color: "#ffffff",
    border: "1px solid #1f2937",
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
        padding: "2rem",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1600px", margin: "0 auto" }}>
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
          <h1 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Bookings Calendar</h1>
          <p style={{ marginTop: 0, color: "#4b5563", marginBottom: "1rem" }}>
            {view === "week"
              ? `Week of ${formatPageDate(weekDays[0].value)}`
              : formatPageDate(selectedDate)}
          </p>

          {view === "week" && (
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              <Link
                href={`/bookings?date=${previousWeekDate}&view=week`}
                style={{
                  display: "inline-block",
                  padding: "0.6rem 0.95rem",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #dbe3f0",
                  borderRadius: "10px",
                  color: "#334155",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                ← Previous Week
              </Link>
              <Link
                href={`/bookings?date=${todayDate}&view=week`}
                style={{
                  display: "inline-block",
                  padding: "0.6rem 0.95rem",
                  backgroundColor: "#dbeafe",
                  border: "1px solid #93c5fd",
                  borderRadius: "10px",
                  color: "#1d4ed8",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                This Week
              </Link>
              <Link
                href={`/bookings?date=${nextWeekDate}&view=week`}
                style={{
                  display: "inline-block",
                  padding: "0.6rem 0.95rem",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #dbe3f0",
                  borderRadius: "10px",
                  color: "#334155",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                Next Week →
              </Link>
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
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
                href="/book"
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
                Book a Field
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  style={{
                    display: "inline-block",
                    padding: "0.65rem 1rem",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #dbe3f0",
                    borderRadius: "10px",
                    color: "#475569",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  Admin
                </Link>
              )}
            </div>

            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Link
                  href={`/bookings?date=${selectedDate}&view=day`}
                  style={{
                    display: "inline-block",
                    padding: "0.55rem 0.9rem",
                    borderRadius: "999px",
                    textDecoration: "none",
                    fontWeight: 600,
                    border: view === "day" ? "1px solid #93c5fd" : "1px solid #dbe3f0",
                    backgroundColor: view === "day" ? "#dbeafe" : "#f8fafc",
                    color: view === "day" ? "#1d4ed8" : "#475569",
                  }}
                >
                  Day View
                </Link>
                <Link
                  href={`/bookings?date=${selectedDate}&view=week`}
                  style={{
                    display: "inline-block",
                    padding: "0.55rem 0.9rem",
                    borderRadius: "999px",
                    textDecoration: "none",
                    fontWeight: 600,
                    border: view === "week" ? "1px solid #93c5fd" : "1px solid #dbe3f0",
                    backgroundColor: view === "week" ? "#dbeafe" : "#f8fafc",
                    color: view === "week" ? "#1d4ed8" : "#475569",
                  }}
                >
                  Week View
                </Link>
              </div>

              <form method="GET" style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
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

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1rem" }}>
          <div
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "4px",
              backgroundColor: "#374151",
              border: "1px solid #1f2937",
            }}
          />
          <div style={{ color: "#475569", fontWeight: 600 }}>Blackout date</div>
        </div>

        {view === "day" ? (
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
                const roomBookings = bookings.filter((booking) => booking.roomId === room.id);
                const roomBlackout = blackoutMap.get(`${room.id}|${selectedDate}`);

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
                        <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.15rem" }}>
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
                        backgroundColor: roomBlackout ? "#374151" : "#ffffff",
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
                            color: "#ffffff",
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
                              ((booking.startTimeMinutes - START_HOUR * 60) / SLOT_MINUTES) * SLOT_HEIGHT;
                            const height = booking.durationBlocks * SLOT_HEIGHT - 4;
                            const showNotes = booking.durationBlocks >= 4 && Boolean(booking.notes);
                            const hoverText = [
                              booking.title || "Booking",
                              booking.team?.teamName,
                              booking.team?.coachEmail || "",
                              `${formatTimeLabel(booking.startTimeMinutes)} - ${formatTimeLabel(booking.endTimeMinutes)}`,
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
                                  {booking.title || "Booking"}
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
                                  {booking.team?.teamName}
                                </div>
                                <div style={{ color: "#475569", marginTop: "0.15rem", fontSize: "0.8rem" }}>
                                  {formatTimeLabel(booking.startTimeMinutes)} - {formatTimeLabel(booking.endTimeMinutes)}
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
        ) : (
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
                {weekDays.map((day) => (
                  <div
                    key={day.value}
                    style={{
                      backgroundColor: day.value === selectedDate ? "#dbeafe" : "#f8fafc",
                      border: "1px solid #dbe3f0",
                      borderRadius: "12px",
                      padding: "0.85rem 0.75rem",
                      textAlign: "center",
                      fontWeight: 700,
                      color: "#334155",
                    }}
                  >
                    {day.label}
                  </div>
                ))}
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
                        <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.18rem" }}>
                          {room.description}
                        </div>
                      )}
                    </div>

                    {weekDays.map((day) => {
                      const cellBookings = bookings.filter(
                        (booking) =>
                          booking.roomId === room.id &&
                          toDateInputValue(new Date(booking.bookingDate)) === day.value
                      );
                      const cellBlackout = blackoutMap.get(`${room.id}|${day.value}`);

                      return (
                        <div
                          key={day.value}
                          style={{
                            backgroundColor: cellBlackout ? "#374151" : "#ffffff",
                            border: cellBlackout ? "1px solid #1f2937" : "1px solid #dbe3f0",
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
                            <div style={{ color: "#cbd5e1", fontSize: "0.88rem", textAlign: "center", paddingTop: "0.65rem" }}>
                              —
                            </div>
                          ) : (
                            <div style={{ display: "grid", gap: "0.45rem" }}>
                              {cellBookings.map((booking) => {
                                const { backgroundColor, borderColor } = bookingBlockColors(booking.title);
                                const hoverText = [
                                  booking.title || "Booking",
                                  booking.team?.teamName,
                                  booking.team?.coachEmail || "",
                                  `${formatTimeLabel(booking.startTimeMinutes)} - ${formatTimeLabel(booking.endTimeMinutes)}`,
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
                                      {booking.title || "Booking"}
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
                                      {booking.team?.teamName}
                                    </div>
                                    <div style={{ color: "#475569", marginTop: "0.15rem", fontSize: "0.77rem" }}>
                                      {formatTimeLabel(booking.startTimeMinutes)} - {formatTimeLabel(booking.endTimeMinutes)}
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
        )}
      </div>
    </main>
  );
}