import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import EditBookingForm from "@/components/booking/edit-booking-form";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; view?: string }>;
};

export default async function EditBookingPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;

  // ✅ SECURE ACCESS CHECK
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("admin_access")?.value === "granted";

  if (!isAdmin) {
    redirect(`/admin-login?next=/bookings/${id}/edit`);
  }

  // ✅ RETURN STATE
  const returnDate = query.date;
  const returnView = query.view === "week" ? "week" : "day";

  // ✅ LOAD BOOKING
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      room: true,
      team: true,
    },
  });

  if (!booking) {
    notFound();
  }

  // ✅ LOAD LOOKUPS
  const [rooms, teams] = await Promise.all([
    prisma.room.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.team.findMany({
      where: { isActive: true },
      orderBy: [
        { teamName: "asc" },
        { year: "desc" },
        { season: "asc" },
      ],
    }),
  ]);

  // ✅ BACK LINK
  const detailsHref = returnDate
    ? `/bookings/${id}?date=${returnDate}&view=${returnView}`
    : `/bookings/${id}?view=${returnView}`;

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fb",
        padding: "2rem",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        {/* HEADER */}
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
          <h1 style={{ marginTop: 0, marginBottom: "0.5rem" }}>
            Edit Booking
          </h1>

          <p
            style={{
              marginTop: 0,
              color: "#4b5563",
              marginBottom: "1rem",
            }}
          >
            Update the details for this field reservation.
          </p>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Link
              href={detailsHref}
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
              Back to Details
            </Link>

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
          </div>
        </div>

        {/* FORM */}
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #dbe3f0",
            borderRadius: "16px",
            padding: "1.5rem",
            boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)",
          }}
        >
          <EditBookingForm
            rooms={rooms}
            teams={teams}
            booking={{
              id: booking.id,
              roomId: booking.roomId,
              teamId: booking.teamId ?? "",
              bookingDate: booking.bookingDate.toISOString(),
              startTimeMinutes: booking.startTimeMinutes,
              durationBlocks: booking.durationBlocks,
              title: booking.title,
              notes: booking.notes,
              opponent: booking.opponent,
            }}
            returnDate={returnDate}
            returnView={returnView}
          />
        </div>
      </div>
    </main>
  );
}
