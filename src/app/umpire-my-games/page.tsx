import Link from "next/link";
import { prisma } from "@/lib/prisma";
import MyGamesUmpirePicker from "@/components/umpire/my-games-umpire-picker";

type PageProps = {
  searchParams: Promise<{
    umpireId?: string;
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

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UmpireMyGamesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedUmpireId = typeof params.umpireId === "string" ? params.umpireId : "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [allUpcomingAssignedBookings, allActiveUmpires] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: "ACTIVE",
        umpireId: { not: null },
        bookingDate: { gte: today },
        title: { in: ["Game", "Tournament", "Scrimmage"] },
      },
      include: {
        room: true,
        team: true,
        umpireRecord: true,
      },
      orderBy: [{ bookingDate: "asc" }, { startTimeMinutes: "asc" }],
    }),
    prisma.umpire.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const eligibleBookings = allUpcomingAssignedBookings.filter((booking) => {
    return !isTeeBall(booking.team?.ageGroup);
  });

  const umpireIdsWithGames = new Set(
    eligibleBookings
      .map((booking) => booking.umpireId)
      .filter((value): value is string => typeof value === "string" && value.length > 0)
  );

  const availableUmpires = allActiveUmpires.filter((umpire) =>
    umpireIdsWithGames.has(umpire.id)
  );

  const selectedUmpire = requestedUmpireId
    ? availableUmpires.find((umpire) => umpire.id === requestedUmpireId) ?? null
    : null;

  const selectedUmpireId = selectedUmpire?.id ?? "";

  const filteredBookings = selectedUmpireId
    ? eligibleBookings.filter((booking) => booking.umpireId === selectedUmpireId)
    : [];

  const groups = filteredBookings.reduce<
    Array<{ key: string; date: Date; items: typeof filteredBookings }>
  >((acc, booking) => {
    const key = dateKey(booking.bookingDate);
    const existing = acc.find((g) => g.key === key);

    if (existing) {
      existing.items.push(booking);
    } else {
      acc.push({
        key,
        date: booking.bookingDate,
        items: [booking],
      });
    }

    return acc;
  }, []);

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
        .my-games-shell {
          max-width: 1200px;
          margin: 0 auto;
        }

        .my-games-card {
          background-color: #ffffff;
          border: 1px solid #dbe3f0;
          border-radius: 16px;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
        }

        .my-games-header {
          padding: 1.25rem;
          margin-bottom: 1rem;
        }

        .my-games-header-top {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
          align-items: flex-start;
        }

        .my-games-header-links {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          align-items: center;
        }

        .my-games-link {
          display: inline-block;
          padding: 0.65rem 1rem;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 600;
          text-align: center;
        }

        .my-games-status-banner {
          margin-top: 1rem;
          padding: 0.85rem 1rem;
          border-radius: 12px;
          background-color: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1e3a8a;
          font-weight: 700;
          line-height: 1.4;
        }

        .my-games-message {
          padding: 1rem;
          border: 1px dashed #cbd5e1;
          border-radius: 12px;
          color: #64748b;
          background-color: #ffffff;
          line-height: 1.5;
        }

        .my-games-groups {
          display: grid;
          gap: 1.5rem;
        }

        .my-games-group-heading {
          margin-top: 0;
          margin-bottom: 0.9rem;
          font-size: 1.45rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.25;
        }

        .my-games-booking-list {
          display: grid;
          gap: 0.85rem;
        }

        .my-games-booking-card {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 1rem;
          background-color: #ffffff;
        }

        .my-games-booking-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.1fr);
          align-items: start;
        }

        .my-games-age-group {
          font-weight: 800;
          color: #0f172a;
          line-height: 1.3;
        }

        .my-games-matchup {
          color: #334155;
          margin-top: 0.2rem;
          font-weight: 600;
          line-height: 1.35;
          word-break: break-word;
        }

        .my-games-time {
          color: #64748b;
          margin-top: 0.2rem;
          font-size: 0.92rem;
          line-height: 1.35;
        }

        .my-games-room {
          color: #334155;
          font-weight: 700;
          line-height: 1.35;
          word-break: break-word;
        }

        .my-games-sport {
          color: #64748b;
          margin-top: 0.2rem;
          line-height: 1.35;
        }

        .my-games-assigned {
          margin-top: 0.2rem;
          font-weight: 600;
          color: #475569;
          line-height: 1.35;
          word-break: break-word;
        }

        @media (max-width: 768px) {
          .my-games-header {
            padding: 1rem;
            border-radius: 14px;
          }

          .my-games-header-top {
            flex-direction: column;
            align-items: stretch;
          }

          .my-games-header-links {
            flex-direction: column;
            align-items: stretch;
          }

          .my-games-header-links a {
            width: 100%;
            box-sizing: border-box;
          }

          .my-games-group-heading {
            font-size: 1.2rem;
            margin-bottom: 0.75rem;
          }

          .my-games-booking-card {
            padding: 0.9rem;
            border-radius: 12px;
          }

          .my-games-booking-grid {
            grid-template-columns: 1fr;
            gap: 0.85rem;
          }
        }
      `}</style>

      <div className="my-games-shell">
        <div className="my-games-card my-games-header">
          <div className="my-games-header-top">
            <div>
              <h1 style={{ marginTop: 0, marginBottom: "0.5rem" }}>
                My Assigned Games
              </h1>
              <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.5 }}>
                Choose an umpire to view upcoming assigned games.
              </p>
            </div>

            <div className="my-games-header-links">
              <Link
                href="/umpire-assignments"
                className="my-games-link"
                style={{
                  backgroundColor: "#eef2ff",
                  border: "1px solid #c7d2fe",
                  color: "#1e3a8a",
                }}
              >
                Back to Unassigned Games
              </Link>
            </div>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <MyGamesUmpirePicker
              umpires={availableUmpires.map((umpire) => ({
                id: umpire.id,
                name: umpire.name,
              }))}
              selectedUmpireId={selectedUmpireId}
            />
          </div>

          {selectedUmpire && (
            <div className="my-games-status-banner">
              Viewing upcoming games for {selectedUmpire.name}
            </div>
          )}
        </div>

        {availableUmpires.length === 0 ? (
          <div className="my-games-message">
            No active umpires currently have upcoming assigned games.
          </div>
        ) : !selectedUmpireId ? (
          <div className="my-games-message">
            Select an umpire to view assigned games.
          </div>
        ) : groups.length === 0 ? (
          <div className="my-games-message">
            No upcoming assigned games found for this umpire.
          </div>
        ) : (
          <div className="my-games-groups">
            {groups.map((group) => (
              <section key={group.key}>
                <h2 className="my-games-group-heading">
                  {formatDayHeading(group.date)}
                </h2>

                <div className="my-games-booking-list">
                  {group.items.map((booking) => {
                    const sport = inferSport(booking.team?.ageGroup);
                    const matchup = booking.opponent?.trim()
                      ? `${booking.team?.teamName || "—"} vs. ${booking.opponent}`
                      : booking.team?.teamName || "—";

                    return (
                      <div key={booking.id} className="my-games-booking-card">
                        <div className="my-games-booking-grid">
                          <div>
                            <div className="my-games-age-group">
                              {booking.team?.ageGroup || "—"}
                            </div>
                            <div className="my-games-matchup">{matchup}</div>
                            <div className="my-games-time">
                              {formatTimeRange(
                                booking.startTimeMinutes,
                                booking.endTimeMinutes
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="my-games-room">{booking.room.name}</div>
                            <div className="my-games-sport">
                              Sport: {sport === "softball" ? "Softball" : "Baseball"}
                            </div>
                            <div className="my-games-assigned">
                              Assigned: {booking.umpireRecord?.name || "—"}
                            </div>
                          </div>
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
