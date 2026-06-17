import { prisma } from "@/lib/prisma";
import Link from "next/link";
import RoomManagementActions from "@/components/admin/room-management-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

export default async function AdminRoomsPage() {
  // ✅ Only count today + future bookings
  const todayValue = getEasternTodayValue();
  const todayStart = new Date(`${todayValue}T00:00:00`);

  const [rooms, bookingCounts] = await Promise.all([
    prisma.room.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),

    prisma.booking.groupBy({
      by: ["roomId"],
      where: {
        status: "ACTIVE",
        bookingDate: {
          gte: todayStart,
        },
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const bookingCountMap = new Map<string, number>();

  for (const row of bookingCounts) {
    if (row.roomId) {
      bookingCountMap.set(row.roomId, row._count._all);
    }
  }

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
        .rooms-shell {
          max-width: 1200px;
          margin: 0 auto;
        }

        .rooms-card {
          background-color: #ffffff;
          border: 1px solid #dbe3f0;
          border-radius: 16px;
          padding: 1.25rem;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
        }

        .rooms-header-actions {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }

        .rooms-list {
          display: grid;
          gap: 0.85rem;
        }

        .room-card-highlight {
          border-left: 4px solid #22c55e;
        }

        .room-card-none {
          border-left: 4px solid #e5e7eb;
        }

        @media (max-width: 768px) {
          .rooms-card {
            padding: 1rem;
            border-radius: 14px;
          }

          .rooms-header-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .rooms-header-actions a {
            width: 100%;
            box-sizing: border-box;
            text-align: center;
          }
        }
      `}</style>

      <div className="rooms-shell">
        {/* HEADER */}
        <div className="rooms-card" style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "1.9rem" }}>Manage Fields</h1>

          <p
            style={{
              marginTop: 0,
              color: "#4b5563",
              lineHeight: 1.5,
              marginBottom: "1rem",
            }}
          >
            Add new fields, activate or deactivate existing ones, and delete fields if necessary.
          </p>

          <div className="rooms-header-actions">
            <Link
              href="/admin"
              style={{
                padding: "0.65rem 1rem",
                backgroundColor: "#eef2ff",
                border: "1px solid #c7d2fe",
                borderRadius: "10px",
                color: "#1e3a8a",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Back to Admin
            </Link>
          </div>
        </div>

        {/* ADD FIELD */}
        <div className="rooms-card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ marginTop: 0 }}>Add New Field</h2>
          <RoomManagementActions mode="create" />
        </div>

        {/* FIELD LIST */}
        <div className="rooms-card" style={{ padding: "1rem" }}>
          {rooms.length === 0 ? (
            <div
              style={{
                padding: "1rem",
                border: "1px dashed #cbd5e1",
                borderRadius: "12px",
                color: "#64748b",
              }}
            >
              No fields have been created yet.
            </div>
          ) : (
            <div className="rooms-list">
              {rooms.map((room) => {
                const bookingCount =
                  bookingCountMap.get(room.id) || 0;

                return (
                  <div
                    key={room.id}
                    className={
                      bookingCount > 0
                        ? "room-card-highlight"
                        : "room-card-none"
                    }
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "14px",
                      backgroundColor: "#ffffff",
                      padding: "0.75rem",
                    }}
                  >
                    <RoomManagementActions
                      mode="manage"
                      room={{
                        id: room.id,
                        name: room.name,
                        description: room.description,
                        isActive: room.isActive,
                      }}
                      bookingCount={bookingCount}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}