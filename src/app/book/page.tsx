import Link from "next/link";
import { prisma } from "@/lib/prisma";
import BookingForm from "@/components/booking/booking-form";

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

export default async function BookPage() {
  const [rooms, teamsRaw] = await Promise.all([
    prisma.room.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.team.findMany({
      where: { isActive: true },
      orderBy: [
        { year: "desc" },
        { season: "asc" },
        { ageGroup: "asc" },
        { teamName: "asc" },
      ],
    }),
  ]);

  const teams = [...teamsRaw].sort((a, b) => {
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
        .page-container {
          max-width: 900px;
          margin: 0 auto;
        }

        .card {
          background: #ffffff;
          border: 1px solid #dbe3f0;
          border-radius: 16px;
          padding: 1.25rem;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
        }

        .nav-row {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
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

        @media (max-width: 768px) {
          .nav-row {
            flex-direction: column;
          }

          .nav-row a {
            width: 100%;
            box-sizing: border-box;
          }

          .card {
            padding: 1rem;
            border-radius: 14px;
          }
        }
      `}</style>

      <div className="page-container">
        {/* HEADER CARD */}
        <div className="card" style={{ marginBottom: "1rem" }}>
          <h1 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "1.9rem" }}>
            Book a Field
          </h1>

          <p style={{ marginTop: 0, color: "#4b5563", lineHeight: 1.5 }}>
            Use the form below to reserve a field in 30-minute blocks.
          </p>

          <p style={{ marginTop: "0.5rem", color: "#4b5563", lineHeight: 1.5 }}>
            <strong> If this is a game, please enter the opponent.</strong>
          </p>

          {/* NAV BUTTONS */}
          <div className="nav-row">
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
                backgroundColor: "#ecfeff",
                border: "1px solid #a5f3fc",
                color: "#155e75",
              }}
            >
              Calendar
            </Link>

            <Link
              href="/admin"
              className="nav-link"
              style={{
                backgroundColor: "#f3e8ff",
                border: "1px solid #d8b4fe",
                color: "#6b21a8",
              }}
            >
              Admin
            </Link>
          </div>
        </div>

        {/* FORM CARD */}
        <div className="card">
          <BookingForm rooms={rooms} teams={teams} />
        </div>
      </div>
    </main>
  );
}