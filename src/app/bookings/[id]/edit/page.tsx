import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import EditBookingForm from "@/components/booking/edit-booking-form";
import AdminNav from "@/components/admin/admin-nav";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; view?: string; from?: string }>;
};

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

export default async function EditBookingPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;

  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("admin_access")?.value === "granted";

  if (!isAdmin) {
    redirect(`/admin-login?next=/bookings/${id}/edit`);
  }

  const todayValue = getEasternTodayValue();

  const returnDate = query.date;
  const returnView = query.view === "week" ? "week" : "day";
  const cameFromAdmin = query.from === "admin";

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      room: true,
      team: true,
      umpireRecord: true,
    },
  });

  if (!booking) {
    notFound();
  }

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

  const detailsHref = returnDate
    ? `/bookings/${id}?date=${returnDate}&view=${returnView}${cameFromAdmin ? "&from=admin" : ""}`
    : `/bookings/${id}?view=${returnView}${cameFromAdmin ? "&from=admin" : ""}`;

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
        .edit-booking-shell {
          max-width: 1200px;
          margin: 0 auto;
        }

        .edit-booking-card {
          background-color: #ffffff;
          border: 1px solid #dbe3f0;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
        }

        .edit-booking-header-row {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: flex-start;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }

        .edit-booking-action-link {
          display: inline-block;
          padding: 0.65rem 1rem;
          background-color: #eef2ff;
          border: 1px solid #c7d2fe;
          border-radius: 10px;
          color: #1e3a8a;
          text-decoration: none;
          font-weight: 600;
          text-align: center;
          white-space: nowrap;
        }

        @media (max-width: 768px) {
          .edit-booking-card {
            padding: 1rem;
            border-radius: 14px;
          }

          .edit-booking-header-row {
            flex-direction: column;
            align-items: stretch;
          }

          .edit-booking-action-link {
            width: 100%;
            box-sizing: border-box;
          }
        }
      `}</style>

      <div className="edit-booking-shell">
        <div className="edit-booking-card" style={{ marginBottom: "1.5rem" }}>
          <div className="edit-booking-header-row">
            <div>
              <h1 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "1.9rem" }}>
                Edit Booking
              </h1>

              <p
                style={{
                  marginTop: 0,
                  color: "#4b5563",
                  marginBottom: 0,
                  lineHeight: 1.5,
                }}
              >
                Update the details for this field reservation.
              </p>
            </div>

            <Link href={detailsHref} className="edit-booking-action-link">
              Back to Details
            </Link>
          </div>

          <AdminNav todayValue={todayValue} />
        </div>

        <div className="edit-booking-card">
          <EditBookingForm
            rooms={rooms}
            teams={teams}
            umpires={umpires}
            booking={{
              id: booking.id,
              roomId: booking.roomId,
              teamId: booking.teamId ?? "",
              bookingDate: `${booking.bookingDate.getFullYear()}-${String(
                booking.bookingDate.getMonth() + 1
              ).padStart(2, "0")}-${String(booking.bookingDate.getDate()).padStart(2, "0")}`,
              startTimeMinutes: booking.startTimeMinutes,
              durationBlocks: booking.durationBlocks,
              title: booking.title,
              notes: booking.notes,
              opponent: booking.opponent,
              umpireId: booking.umpireId ?? "",
              currentUmpireName: booking.umpireRecord?.name ?? null,
            }}
            returnDate={returnDate}
            returnView={returnView}
            cameFromAdmin={cameFromAdmin}
          />
        </div>
      </div>
    </main>
  );
}