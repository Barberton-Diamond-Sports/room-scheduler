import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import UmpireAssignmentActions from "@/components/admin/umpire-assignment-actions";

type PageProps = {
  searchParams: Promise<{
    sport?: string;
  }>;
};

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

function inferSport(ageGroup: string | null | undefined) {
  return ageGroup?.toLowerCase().includes("softball") ? "softball" : "baseball";
}

function isTeeBall(ageGroup: string | null | undefined) {
  return ageGroup?.toLowerCase().includes("tee ball") ?? false;
}

function filterButtonStyle(active: boolean) {
  return {
    display: "inline-block",
    padding: "0.65rem 1rem",
    borderRadius: "999px",
    textDecoration: "none",
    fontWeight: 700,
    border: active ? "1px solid #93c5fd" : "1px solid #dbe3f0",
    backgroundColor: active ? "#dbeafe" : "#f8fafc",
    color: active ? "#1d4ed8" : "#475569",
    textAlign: "center" as const,
  };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UmpireAssignmentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sportFilter =
    params.sport === "baseball" || params.sport === "softball"
      ? params.sport
      : "all";

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
        team: true,
      },
      orderBy: [{ bookingDate: "asc" }, { startTimeMinutes: "asc" }],
    }),
    prisma.umpire.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const filteredBookings = bookings.filter((booking) => {
    const ageGroup = booking.team?.ageGroup;

    if (isTeeBall(ageGroup)) return false;

    const sport = inferSport(ageGroup);
    if (sportFilter !== "all" && sport !== sportFilter) return false;

    return true;
  });

  const groups = filteredBookings.reduce<
    Array<{ key: string; date: Date; items: typeof filteredBookings }>
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

  const umpireOptions = umpires.map((u) => ({
    id: u.id,
    name: u.name,
    doesBaseball: u.doesBaseball,
    doesSoftball: u.doesSoftball,
  }));

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
        .umpire-page-shell {
          max-width: 1200px;
          margin: 0 auto;
        }

        .umpire-card {
          background-color: #ffffff;
          border: 1px solid #dbe3f0;
          border-radius: 16px;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
        }

        .umpire-header-card {
          padding: 1.25rem;
          margin-bottom: 1rem;
        }

        .umpire-header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .umpire-header-links,
        .umpire-filter-row {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .umpire-header-links {
          align-items: center;
        }

        .umpire-empty {
          padding: 1rem;
          border: 1px dashed #cbd5e1;
          border-radius: 12px;
          color: #64748b;
          background-color: #ffffff;
        }

        .umpire-group-list {
          display: grid;
          gap: 1.5rem;
        }

        .umpire-group-heading {
          margin-top: 0;
          margin-bottom: 0.9rem;
          font-size: 1.45rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.25;
        }

        .umpire-booking-list {
          display: grid;
          gap: 0.85rem;
        }

        .umpire-booking-card {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 1rem;
          background-color: #ffffff;
        }

        .umpire-booking-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.1fr) minmax(320px, 420px);
          align-items: start;
        }

        .umpire-detail-title {
          font-weight: 800;
          color: #0f172a;
          line-height: 1.3;
        }

        .umpire-detail-matchup {
          color: #334155;
          margin-top: 0.2rem;
          font-weight: 600;
          line-height: 1.35;
          word-break: break-word;
        }

        .umpire-detail-time {
          color: #64748b;
          margin-top: 0.2rem;
          font-size: 0.92rem;
          line-height: 1.35;
        }

        .umpire-detail-room {
          color: #334155;
          font-weight: 700;
          line-height: 1.35;
          word-break: break-word;
        }

        .umpire-detail-sport {
          color: #64748b;
          margin-top: 0.2rem;
          line-height: 1.35;
        }

        .umpire-detail-status {
          margin-top: 0.2rem;
          font-weight: 600;
          color: #b91c1c;
          line-height: 1.35;
        }

        @media (max-width: 768px) {
          .umpire-header-card {
            padding: 1rem;
            border-radius: 14px;
          }

          .umpire-header-top {
            flex-direction: column;
            align-items: stretch;
          }

          .umpire-header-links,
          .umpire-filter-row {
            flex-direction: column;
            align-items: stretch;
          }

          .umpire-header-links a,
          .umpire-filter-row a {
            width: 100%;
            box-sizing: border-box;
          }

          .umpire-group-heading {
            font-size: 1.2rem;
            margin-bottom: 0.75rem;
          }

          .umpire-booking-card {
            padding: 0.9rem;
            border-radius: 12px;
          }

          .umpire-booking-grid {
            grid-template-columns: 1fr;
            gap: 0.85rem;
          }
        }
      `}</style>

      <div className="umpire-page-shell">
        <div className="umpire-card umpire-header-card">
          <div className="umpire-header-top">
            <div>
              <h1 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Unassigned Games</h1>
              <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.5 }}>
                Upcoming games that still need an umpire.
              </p>
            </div>

            <div className="umpire-header-links">
              <Link
                href="/umpire-my-games"
                style={{
                  display: "inline-block",
                  padding: "0.65rem 1rem",
                  backgroundColor: "#ecfeff",
                  border: "1px solid #a5f3fc",
                  borderRadius: "10px",
                  color: "#155e75",
                  textDecoration: "none",
                  fontWeight: 600,
                  textAlign: "center",
                }}
              >
                View My Assigned Games
              </Link>

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
                    textAlign: "center",
                  }}
                >
                  Back to Admin
                </Link>
              )}
            </div>
          </div>

          <div className="umpire-filter-row" style={{ marginTop: "1rem" }}>
            <Link href="/umpire-assignments" style={filterButtonStyle(sportFilter === "all")}>
              All
            </Link>

            <Link
              href="/umpire-assignments?sport=baseball"
              style={filterButtonStyle(sportFilter === "baseball")}
            >
              Baseball
            </Link>

            <Link
              href="/umpire-assignments?sport=softball"
              style={filterButtonStyle(sportFilter === "softball")}
            >
              Softball
            </Link>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="umpire-empty">
            No unassigned games match the current filter.
          </div>
        ) : (
          <div className="umpire-group-list">
            {groups.map((group) => (
              <section key={group.key}>
                <h2 className="umpire-group-heading">{formatDayHeading(group.date)}</h2>

                <div className="umpire-booking-list">
                  {group.items.map((booking) => {
                    const sport = inferSport(booking.team?.ageGroup);

                    const matchup = booking.opponent?.trim()
                      ? `${booking.team?.teamName || "—"} vs. ${booking.opponent}`
                      : booking.team?.teamName || "—";

                    return (
                      <div key={booking.id} className="umpire-booking-card">
                        <div className="umpire-booking-grid">
                          <div>
                            <div className="umpire-detail-title">
                              {booking.team?.ageGroup || "—"}
                            </div>
                            <div className="umpire-detail-matchup">{matchup}</div>
                            <div className="umpire-detail-time">
                              {formatTimeRange(
                                booking.startTimeMinutes,
                                booking.endTimeMinutes
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="umpire-detail-room">{booking.room.name}</div>
                            <div className="umpire-detail-sport">
                              Sport: {sport === "softball" ? "Softball" : "Baseball"}
                            </div>
                            <div className="umpire-detail-status">
                              Assigned: Unassigned
                            </div>
                          </div>

                          <UmpireAssignmentActions
                            bookingId={booking.id}
                            currentUmpireId={null}
                            currentUmpireName={null}
                            sport={sport}
                            umpires={umpireOptions}
                            hideClearButton
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