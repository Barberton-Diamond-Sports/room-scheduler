import { prisma } from "@/lib/prisma";
import AdminBookingForm from "@/components/admin/admin-booking-form";
import AdminNav from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function pad(value: number) {
  return String(value).padStart(2, "0");
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
  const todayValue = getEasternTodayValue();

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
          max-width: 1100px;
          margin: 0 auto;
        }

        .card {
          background: #ffffff;
          border: 1px solid #dbe3f0;
          border-radius: 16px;
          padding: 1.25rem;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
        }

        @media (max-width: 768px) {
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

          <div style={{ marginTop: "1rem" }}>
            <AdminNav todayValue={todayValue} />
          </div>
        </div>

        <div className="card">
          <AdminBookingForm rooms={rooms} teams={teams} umpires={umpires} />
        </div>
      </div>
    </main>
  );
}