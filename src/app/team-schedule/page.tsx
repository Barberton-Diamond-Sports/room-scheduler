

import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

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

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDateLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
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

function formatTimeRange(startMinutes: number, endMinutes: number) {
  return `${formatTimeLabel(startMinutes)} - ${formatTimeLabel(endMinutes)}`;
}

function formatTeamLabel(team: {
  teamName: string;
  ageGroup: string;
  season: string;
  year: number;
}) {
  return `${team.ageGroup} - ${team.teamName} (${team.season} ${team.year})`;
}

function bookingTypeLabel(title: string | null) {
  return title?.trim() || "Booking";
}

function bookingTypeColors(title: string | null) {
  if (title === "Game") {
    return {
      backgroundColor: "#ede9fe",
      borderColor: "#a78bfa",
      color: "#4c1d95",
    };
  }

  if (title === "Practice" || title === "Scrimmage") {
    return {
      backgroundColor: "#fef3c7",
      borderColor: "#facc15",
      color: "#78350f",
    };
  }

  return {
    backgroundColor: "#fee2e2",
    borderColor: "#fca5a5",
    color: "#7f1d1d",
  };
}

type PageProps = {
  searchParams: Promise<{
    teamId?: string;
    range?: string;
  }>;
};

export default async function TeamSchedulePage({ searchParams }: PageProps) {
  const params = await searchParams;

  const selectedTeamId = params.teamId || "";
  const range = params.range === "full" ? "full" : "upcoming";

  const todayValue = getEasternTodayValue();
  const todayStart = fromDateInputValue(todayValue);

  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("admin_access")?.value === "granted";

  const activeTeamsRaw = await prisma.team.findMany({
  where: {
    isActive: true,
  },
  orderBy: [
    { year: "desc" },
    { season: "asc" },
    { ageGroup: "asc" },
    { teamName: "asc" },
  ],
});

function getTeamSportSortOrder(ageGroup: string) {
  const normalizedAgeGroup = ageGroup.toLowerCase();

  if (normalizedAgeGroup.includes("baseball")) {
    return 1;
  }

  if (normalizedAgeGroup.includes("softball")) {
    return 2;
  }

  if (
    normalizedAgeGroup.includes("tee ball") ||
    normalizedAgeGroup.includes("t-ball") ||
    normalizedAgeGroup.includes("tball")
  ) {
    return 3;
  }

  return 4;
}

const activeTeams = [...activeTeamsRaw].sort((a, b) => {
  const sportCompare =
    getTeamSportSortOrder(a.ageGroup) - getTeamSportSortOrder(b.ageGroup);

  if (sportCompare !== 0) {
    return sportCompare;
  }

  const yearCompare = b.year - a.year;

  if (yearCompare !== 0) {
    return yearCompare;
  }

  const seasonCompare = a.season.localeCompare(b.season);

  if (seasonCompare !== 0) {
    return seasonCompare;
  }

  const ageGroupCompare = a.ageGroup.localeCompare(b.ageGroup, undefined, {
    numeric: true,
    sensitivity: "base",
  });

  if (ageGroupCompare !== 0) {
    return ageGroupCompare;
  }

  return a.teamName.localeCompare(b.teamName, undefined, {
    numeric: true,
    sensitivity: "base",
  });
});

  const selectedTeam =
    selectedTeamId.length > 0
      ? activeTeams.find((team) => team.id === selectedTeamId) ?? null
      : null;

  const bookings = selectedTeam
    ? await prisma.booking.findMany({
        where: {
          status: "ACTIVE",
          teamId: selectedTeam.id,
          ...(range === "upcoming"
            ? {
                bookingDate: {
                  gte: todayStart,
                },
              }
            : {}),
        },
        include: {
          room: true,
          umpireRecord: true,
        },
        orderBy: [{ bookingDate: "asc" }, { startTimeMinutes: "asc" }],
      })
    : [];

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
        .schedule-card {
          background: #ffffff;
          border: 1px solid #dbe3f0;
          border-radius: 16px;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
        }

        .hero-card {
          padding: 1.25rem;
          margin-bottom: 1rem;
        }

        .schedule-card {
          padding: 1rem;
        }

        .top-links,
        .filter-form {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .top-links {
          margin-top: 1rem;
          align-items: center;
        }

        .filter-form {
          align-items: flex-end;
          margin-top: 1rem;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .nav-link {
          display: inline-block;
          padding: 0.65rem 1rem;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 600;
          text-align: center;
        }

        .form-label {
          font-weight: 700;
          color: #334155;
          font-size: 0.92rem;
        }

        .form-select {
          padding: 0.65rem 0.8rem;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          background-color: #f8fafc;
          min-width: 240px;
          font-size: 0.95rem;
        }

        .primary-button {
          padding: 0.68rem 1rem;
          background-color: #2563eb;
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }

        .table-wrap {
          overflow-x: auto;
        }

        .schedule-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          min-width: 760px;
        }

        .schedule-table th {
          background-color: #f8fafc;
          color: #334155;
          text-align: left;
          font-size: 0.86rem;
          padding: 0.85rem 0.8rem;
          border-top: 1px solid #dbe3f0;
          border-bottom: 1px solid #dbe3f0;
        }

        .schedule-table th:first-child {
          border-left: 1px solid #dbe3f0;
          border-radius: 12px 0 0 0;
        }

        .schedule-table th:last-child {
          border-right: 1px solid #dbe3f0;
          border-radius: 0 12px 0 0;
        }

        .schedule-table td {
          padding: 0.85rem 0.8rem;
          border-bottom: 1px solid #e5edf7;
          color: #334155;
          vertical-align: middle;
          font-size: 0.93rem;
        }

        .schedule-table tr:hover td {
          background-color: #f8fafc;
        }

        .type-pill {
          display: inline-block;
          padding: 0.35rem 0.6rem;
          border-radius: 999px;
          font-weight: 700;
          font-size: 0.82rem;
          white-space: nowrap;
        }

        .empty-state {
          text-align: center;
          padding: 2rem 1rem;
          color: #64748b;
          background-color: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: 14px;
        }

        .mobile-cards {
          display: none;
        }

        @media (max-width: 768px) {
          main {
            padding: 0.75rem;
          }

          .hero-card,
          .schedule-card {
            border-radius: 14px;
          }

          .hero-card {
            padding: 1rem;
          }

          .top-links,
          .filter-form {
            flex-direction: column;
            align-items: stretch;
          }

          .top-links a,
          .form-select,
          .primary-button {
            width: 100%;
            box-sizing: border-box;
          }

          .table-wrap {
            display: none;
          }

          .mobile-cards {
            display: grid;
            gap: 0.75rem;
          }

          .mobile-booking-card {
            border: 1px solid #dbe3f0;
            border-radius: 14px;
            background: #ffffff;
            padding: 0.85rem;
            box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
          }

          .mobile-booking-top {
            display: flex;
            justify-content: space-between;
            gap: 0.75rem;
            align-items: flex-start;
            margin-bottom: 0.65rem;
          }

          .mobile-detail {
            display: grid;
            gap: 0.25rem;
            margin-top: 0.45rem;
            color: #334155;
            font-size: 0.92rem;
          }

          .mobile-detail strong {
            color: #0f172a;
          }
        }
      `}</style>

      <div className="page-shell">
        <div className="hero-card">
          <h1 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "1.9rem" }}>
            Team Schedule
          </h1>

          <p style={{ marginTop: 0, color: "#4b5563", marginBottom: 5, lineHeight: 1.5 }}>
            Choose an active team to view that team's scheduled field reservations for practices and home games/scrimmages.
          </p>
		  <p style={{ marginTop: 0, color: "#4b5563", marginBottom: 20, lineHeight: 1.5 }}>
            <b>This list does not show games at our fields where a team is the away team.</b>
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
              BDS Field Calendar
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

          <form method="GET" className="filter-form">
            <div className="form-field" style={{ flex: 1 }}>
              <label htmlFor="teamId" className="form-label">
                Team
              </label>
              <select
                id="teamId"
                name="teamId"
                defaultValue={selectedTeam?.id || ""}
                className="form-select"
                required
              >
                <option value="">Select a team...</option>
                {activeTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {formatTeamLabel(team)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="range" className="form-label">
                Schedule Range
              </label>
              <select id="range" name="range" defaultValue={range} className="form-select">
                <option value="upcoming">Upcoming Only</option>
                <option value="full">Full Season</option>
              </select>
            </div>

            <button type="submit" className="primary-button">
              View Schedule
            </button>
          </form>
        </div>

        <div className="schedule-card">
          {!selectedTeam ? (
            <div className="empty-state">
              Select a team above to view that team&apos;s schedule.
            </div>
          ) : (
            <>
              <div className="summary-row">
                <div>
                  <h2 style={{ margin: 0, color: "#0f172a", fontSize: "1.25rem" }}>
                    {selectedTeam.teamName}
                  </h2>
                  <div style={{ color: "#64748b", marginTop: "0.25rem" }}>
                    {selectedTeam.ageGroup} · {selectedTeam.season} {selectedTeam.year}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: range === "upcoming" ? "#dbeafe" : "#f8fafc",
                    border: range === "upcoming" ? "1px solid #93c5fd" : "1px solid #dbe3f0",
                    color: range === "upcoming" ? "#1d4ed8" : "#475569",
                    borderRadius: "999px",
                    padding: "0.5rem 0.8rem",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                  }}
                >
                  {range === "upcoming" ? "Upcoming Only" : "Full Season"} · {bookings.length}{" "}
                  {bookings.length === 1 ? "booking" : "bookings"}
                </div>
              </div>

              {bookings.length === 0 ? (
                <div className="empty-state">
                  No {range === "upcoming" ? "upcoming " : ""}bookings found for this team.
                </div>
              ) : (
                <>
                  <div className="table-wrap">
                    <table className="schedule-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Field</th>
                          <th>Time</th>
                          <th>Umpire</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.map((booking) => {
                          const typeColors = bookingTypeColors(booking.title);

                          return (
                            <tr key={booking.id}>
                              <td style={{ fontWeight: 700, color: "#0f172a" }}>
                                {formatDateLabel(booking.bookingDate)}
                              </td>
                              <td>
                                <span
                                  className="type-pill"
                                  style={{
                                    backgroundColor: typeColors.backgroundColor,
                                    border: `1px solid ${typeColors.borderColor}`,
                                    color: typeColors.color,
                                  }}
                                >
                                  {bookingTypeLabel(booking.title)}
                                </span>
                              </td>
                              <td>{booking.room.name}</td>
                              <td>{formatTimeRange(booking.startTimeMinutes, booking.endTimeMinutes)}</td>
                              <td>{booking.umpireRecord?.name || "Unassigned"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mobile-cards">
                    {bookings.map((booking) => {
                      const typeColors = bookingTypeColors(booking.title);

                      return (
                        <div key={booking.id} className="mobile-booking-card">
                          <div className="mobile-booking-top">
                            <div>
                              <div style={{ fontWeight: 800, color: "#0f172a" }}>
                                {formatShortDateLabel(booking.bookingDate)}
                              </div>
                              <div
                                style={{
                                  color: "#64748b",
                                  marginTop: "0.15rem",
                                  fontSize: "0.88rem",
                                }}
                              >
                                {formatDateLabel(booking.bookingDate)}
                              </div>
                            </div>

                            <span
                              className="type-pill"
                              style={{
                                backgroundColor: typeColors.backgroundColor,
                                border: `1px solid ${typeColors.borderColor}`,
                                color: typeColors.color,
                              }}
                            >
                              {bookingTypeLabel(booking.title)}
                            </span>
                          </div>

                          <div className="mobile-detail">
                            <div>
                              <strong>Field:</strong> {booking.room.name}
                            </div>
                            <div>
                              <strong>Time:</strong>{" "}
                              {formatTimeRange(booking.startTimeMinutes, booking.endTimeMinutes)}
                            </div>
                            <div>
                              <strong>Umpire:</strong> {booking.umpireRecord?.name || "Unassigned"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}