import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import DeleteBookingButton from "@/components/booking/delete-booking-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function buttonStyle(bg: string, border: string, color: string) {
  return {
    display: "inline-block",
    padding: "0.65rem 1rem",
    backgroundColor: bg,
    border: `1px solid ${border}`,
    borderRadius: "10px",
    color,
    textDecoration: "none",
    fontWeight: 600,
    textAlign: "center" as const,
  };
}

export default async function BookingDetailsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const search = await searchParams;

  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("admin_access")?.value === "granted";

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

  const bookingPurpose = booking.title?.trim().toLowerCase() ?? "";

  const showAssignedUmpire =
    bookingPurpose !== "practice" &&
    bookingPurpose !== "scrimmage" &&
    bookingPurpose !== "other";

  const showOpponent =
    bookingPurpose === "game" ||
    bookingPurpose === "scrimmage" ||
    bookingPurpose === "tournament";

  const view = search.view === "week" ? "week" : "day";
  const calendarDate = search.date || toDateInputValue(new Date(booking.bookingDate));
  const calendarHref = `/bookings?date=${calendarDate}&view=${view}`;
  const editHref = `/bookings/${booking.id}/edit?date=${calendarDate}&view=${view}`;

  const rows = [
    detailRow("Purpose", booking.title),
    detailRow("Team", booking.team?.teamName),
    detailRow("Coach E-mail", booking.team?.coachEmail),
    detailRow("Field", booking.room?.name),
    detailRow("Date", formatDate(new Date(booking.bookingDate))),
    detailRow(
      "Time",
      `${formatTimeLabel(booking.startTimeMinutes)} - ${formatTimeLabel(booking.endTimeMinutes)}`
    ),
    detailRow("Age Group", booking.team?.ageGroup),
    ...(showOpponent ? [detailRow("Opponent", booking.opponent)] : []),
    ...(showAssignedUmpire
      ? [
          {
            label: "Assigned Umpire",
            value: null,
          },
        ]
      : []),
    detailRow("Notes", booking.notes),
  ];

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
        .booking-detail-shell {
          max-width: 900px;
          margin: 0 auto;
        }

        .booking-detail-card {
          background-color: #ffffff;
          border: 1px solid #dbe3f0;
          border-radius: 16px;
          padding: 1.25rem;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
        }

        .booking-detail-header {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
          align-items: flex-start;
        }

        .booking-detail-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          align-items: stretch;
          justify-content: flex-start;
        }

        .booking-detail-grid {
          display: grid;
          gap: 0.85rem;
        }

        .booking-detail-row {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background-color: #f8fafc;
          padding: 0.9rem 1rem;
        }

        .booking-detail-label {
          font-size: 0.82rem;
          color: #64748b;
          line-height: 1.35;
        }

        .booking-detail-value {
          color: #0f172a;
          font-weight: 700;
          line-height: 1.4;
          margin-top: 0.15rem;
          word-break: break-word;
        }

        .booking-detail-subvalue {
          color: #475569;
          margin-top: 0.15rem;
          line-height: 1.4;
          word-break: break-word;
        }

        .booking-detail-unassigned {
          color: #b91c1c;
          font-weight: 700;
          line-height: 1.4;
          margin-top: 0.15rem;
        }

        @media (max-width: 768px) {
          .booking-detail-card {
            padding: 1rem;
            border-radius: 14px;
          }

          .booking-detail-header {
            flex-direction: column;
            align-items: stretch;
          }

          .booking-detail-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .booking-detail-actions a {
            width: 100%;
            box-sizing: border-box;
          }

          .booking-detail-row {
            padding: 0.85rem 0.9rem;
          }
        }
      `}</style>

      <div className="booking-detail-shell">
        <div className="booking-detail-card">
          <div className="booking-detail-header">
            <div>
              <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Booking Details</h1>
              <div style={{ color: "#64748b", lineHeight: 1.5 }}>
                View booking information.
              </div>
            </div>

            <div className="booking-detail-actions">
              <Link
                href={calendarHref}
                style={buttonStyle("#eef2ff", "#c7d2fe", "#1e3a8a")}
              >
                Back to Calendar
              </Link>

              <Link
                href="/book"
                style={buttonStyle("#ecfeff", "#a5f3fc", "#155e75")}
              >
                Book a Field
              </Link>

              {isAdmin && (
                <>
                  <Link
                    href={editHref}
                    style={buttonStyle("#dbeafe", "#93c5fd", "#1d4ed8")}
                  >
                    Edit Booking
                  </Link>

                  <DeleteBookingButton
                    bookingId={booking.id}
                    backHref={calendarHref}
                  />
                </>
              )}

              <Link
                href="/admin"
                style={buttonStyle("#f8fafc", "#dbe3f0", "#475569")}
              >
                Admin
              </Link>
            </div>
          </div>

          <div className="booking-detail-grid">
            {rows.map((row) => {
              if (row.label === "Assigned Umpire") {
                const umpire = booking.umpireRecord;

                return (
                  <div key={row.label} className="booking-detail-row">
                    <div className="booking-detail-label">Assigned Umpire</div>

                    {!umpire ? (
                      <div className="booking-detail-unassigned">Unassigned</div>
                    ) : (
                      <div style={{ marginTop: "0.2rem" }}>
                        <div className="booking-detail-value">{umpire.name}</div>

                        {umpire.phone && (
                          <div className="booking-detail-subvalue">{umpire.phone}</div>
                        )}

                        {umpire.email && (
                          <div className="booking-detail-subvalue">{umpire.email}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div key={row.label} className="booking-detail-row">
                  <div className="booking-detail-label">{row.label}</div>
                  <div className="booking-detail-value">{row.value}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
