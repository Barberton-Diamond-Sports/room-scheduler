
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DeleteBookingButton from "@/components/booking/delete-booking-button";

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
    year: "numeric",
    month: "long",
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

function asText(value: string | null | undefined) {
  return value && value.trim() ? value : "—";
}

export default async function BookingDetailsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const returnDate = query.date || toDateInputValue(new Date());
  const returnView = query.view === "week" ? "week" : "day";

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { room: true },
  });

  if (!booking) {
    notFound();
  }

  const calendarHref = `/bookings?date=${returnDate}&view=${returnView}`;
  const editHref = `/bookings/${booking.id}/edit?date=${returnDate}&view=${returnView}`;
  const adminHref = "/admin";

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
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <div>
              <h1 style={{ marginTop: 0, marginBottom: "0.45rem" }}>{booking.title || "Booking Details"}</h1>
              <div style={{ color: "#64748b" }}>{formatDate(booking.bookingDate)}</div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-start" }}>
              <Link href={calendarHref} style={{ display: "inline-block", padding: "0.65rem 1rem", backgroundColor: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: "10px", color: "#1e3a8a", textDecoration: "none", fontWeight: 600 }}>
                Back to Calendar
              </Link>
              <Link href={editHref} style={{ display: "inline-block", padding: "0.65rem 1rem", backgroundColor: "#dbeafe", border: "1px solid #93c5fd", borderRadius: "10px", color: "#1d4ed8", textDecoration: "none", fontWeight: 600 }}>
                Edit Booking
              </Link>
              <Link href={adminHref} style={{ display: "inline-block", padding: "0.65rem 1rem", backgroundColor: "#ede9fe", border: "1px solid #c4b5fd", borderRadius: "10px", color: "#6d28d9", textDecoration: "none", fontWeight: 600 }}>
                Admin
              </Link>
              <DeleteBookingButton bookingId={booking.id} backHref={calendarHref} />
            </div>
          </div>

          <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1rem" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#64748b", marginBottom: "0.35rem" }}>Field</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>{booking.room.name}</div>
              <div style={{ color: "#64748b", marginTop: "0.25rem" }}>{asText(booking.room.description)}</div>
            </div>

            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1rem" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#64748b", marginBottom: "0.35rem" }}>Time</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
                {formatTimeLabel(booking.startTimeMinutes)} - {formatTimeLabel(booking.endTimeMinutes)}
              </div>
            </div>

            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1rem" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#64748b", marginBottom: "0.35rem" }}>Booked By</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>{booking.bookedByName}</div>
              <div style={{ color: "#64748b", marginTop: "0.25rem" }}>{asText(booking.bookedByEmail)}</div>
            </div>

            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1rem" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#64748b", marginBottom: "0.35rem" }}>Group</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>{asText(booking.teamGroup)}</div>
            </div>

            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1rem" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#64748b", marginBottom: "0.35rem" }}>Opponent</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>{asText(booking.opponent)}</div>
            </div>

            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1rem" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#64748b", marginBottom: "0.35rem" }}>Umpire</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>{asText(booking.umpire)}</div>
            </div>
          </div>

          <div style={{ marginTop: "1rem", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1rem" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#64748b", marginBottom: "0.35rem" }}>Notes</div>
            <div style={{ color: "#334155", lineHeight: 1.6 }}>{asText(booking.notes)}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
