
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EditBookingForm from "@/components/booking/edit-booking-form";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
};

export default async function EditBookingPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const returnDate = query.date;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { room: true },
  });

  if (!booking) {
    notFound();
  }

  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const detailsHref = returnDate ? `/bookings/${id}?date=${returnDate}` : `/bookings/${id}`;

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
          <h1 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Edit Booking</h1>
          <p style={{ marginTop: 0, color: "#4b5563", marginBottom: "1rem" }}>
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
          </div>
        </div>

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
            booking={{
              id: booking.id,
              roomId: booking.roomId,
              bookingDate: booking.bookingDate.toISOString(),
              startTimeMinutes: booking.startTimeMinutes,
              durationBlocks: booking.durationBlocks,
              bookedByName: booking.bookedByName,
              bookedByEmail: booking.bookedByEmail,
              title: booking.title,
              notes: booking.notes,
            }}
            returnDate={returnDate}
          />
        </div>
      </div>
    </main>
  );
}
