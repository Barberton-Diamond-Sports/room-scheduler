
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DeleteBookingButton from "@/components/delete-booking-button";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; view?: string }>;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
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

function detailRow(label: string, value: string | null | undefined) {
  return {
    label,
    value: value && value.trim() ? value : "—",
  };
}

export default async function BookingDetailsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const search = await searchParams;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      room: true,
      umpireRecord: true,
    },
  });

  if (!booking) {
    notFound();
  }

  const view = search.view === "week" ? "week" : "day";
  const calendarDate = search.date || toDateInputValue(new Date(booking.bookingDate));
  const calendarHref = `/bookings?date=${calendarDate}&view=${view}`;
  const editHref = `/bookings/${booking.id}/edit?date=${calendarDate}&view=${view}`;

  const rows = [
    detailRow("Purpose", booking.title),
    detailRow("Booked By", booking.bookedByName),
    detailRow("Email", booking.bookedByEmail),
    detailRow("Field", booking.room?.name),
    detailRow("Date", formatDate(new Date(booking.bookingDate))),
    detailRow("Time", `${formatTimeLabel(booking.startTimeMinutes)} - ${formatTimeLabel(booking.endTimeMinutes)}`),
    detailRow("Group", booking.teamGroup),
    detailRow("Opponent", booking.opponent),
    detailRow("Assigned Umpire", booking.umpireRecord?.name || null),
    detailRow("Notes", booking.notes),
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fb",
        padding: "2rem",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #dbe3f0",
            borderRadius: "16px",
            padding: "1.5rem",
            boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
              marginBottom: "1rem",
            }}
          >
            <div>
              <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Booking Details</h1>
              <div style={{ color: "#64748b" }}>Review booking information and admin actions.</div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "start" }}>
              <Link
                href={calendarHref}
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
                Back to Calendar
              </Link>
              <Link
                href={editHref}
                style={{
                  display: "inline-block",
                  padding: "0.65rem 1rem",
                  backgroundColor: "#dbeafe",
                  border: "1px solid #93c5fd",
                  borderRadius: "10px",
                  color: "#1d4ed8",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                Edit Booking
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
              <DeleteBookingButton bookingId={booking.id} backHref={calendarHref} />
            </div>
          </div>

          <div style={{ display: "grid", gap: "0.85rem" }}>
            {rows.map((row) => (
              <div
                key={row.label}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  backgroundColor: "#f8fafc",
                  padding: "0.9rem 1rem",
                }}
              >
                <div style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "0.2rem" }}>
                  {row.label}
                </div>
                <div style={{ color: "#0f172a", fontWeight: 700 }}>{row.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
