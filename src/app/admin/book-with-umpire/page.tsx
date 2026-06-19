

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AdminBookingForm from "@/components/admin/admin-booking-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

export default async function AdminBookWithUmpirePage() {
  const [rooms, teamsRaw, umpires] = await Promise.all([
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
    prisma.umpire.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
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
        <div className="card" style={{ marginBottom: "1rem" }}>
          <h1 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "1.9rem" }}>
            Book a Field w/ Umpire
          </h1>

          <p style={{ marginTop: 0, color: "#4b5563", lineHeight: 1.5 }}>
            This admin-only booking screen allows you to reserve a field and assign an umpire at
            the time of booking when needed.
          </p>

          <p style={{ marginTop: "0.5rem", color: "#4b5563", lineHeight: 1.5 }}>
            <strong>
              If this is a game, you can optionally assign an umpire here.
            </strong>
          </p>

          <div className="nav-row">
            <Link
              href="/admin"
              className="nav-link"
              style={{
                backgroundColor: "#eef2ff",
                border: "1px solid #c7d2fe",
                color: "#1e3a8a",
              }}
            >
              Back to Admin
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
              href="/admin/umpire-schedule"
              className="nav-link"
              style={{
                backgroundColor: "#ede9fe",
                border: "1px solid #c4b5fd",
                color: "#6d28d9",
              }}
            >
              Umpire Schedule
            </Link>
          </div>
        </div>

        <div className="card">
          <AdminBookingForm rooms={rooms} teams={teams} umpires={umpires} />
        </div>
      </div>
    </main>
  );
}