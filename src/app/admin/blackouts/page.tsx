import { prisma } from "@/lib/prisma";
import RoomBlackoutManager from "@/components/admin/room-blackout-manager";
import AdminNav from "@/components/admin/admin-nav";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function AdminBlackoutsPage() {
  const todayValue = getEasternTodayValue();

  const [rooms, blackouts] = await Promise.all([
    prisma.room.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.roomBlackout.findMany({
      where: {
        endDateTime: { gt: new Date(`${todayValue}T00:00:00`) },
      },
      include: { room: true },
      orderBy: [{ startDateTime: "asc" }, { roomId: "asc" }],
    }),
  ]);

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
        .blackouts-shell {
          max-width: 1100px;
          margin: 0 auto;
        }

        .blackouts-card {
          background-color: #ffffff;
          border: 1px solid #dbe3f0;
          border-radius: 16px;
          padding: 1.25rem;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
        }

        @media (max-width: 768px) {
          .blackouts-card {
            padding: 1rem;
            border-radius: 14px;
          }
        }
      `}</style>

      <div className="blackouts-shell">
        {/* HEADER */}
        <div className="blackouts-card" style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "1.9rem" }}>
            Blackout Field Dates
          </h1>

          <p
            style={{
              marginTop: 0,
              color: "#4b5563",
              marginBottom: "1rem",
              lineHeight: 1.5,
            }}
          >
            Black out selected fields for full days. A blackout will only be created if none of the
            selected fields already have bookings on that day.
          </p>

          <AdminNav todayValue={todayValue} />
        </div>

        {/* MANAGER */}
        <div className="blackouts-card">
          <RoomBlackoutManager
            rooms={rooms.map((room) => ({
              id: room.id,
              name: room.name,
              description: room.description || "",
            }))}
            items={blackouts.map((item) => ({
              id: item.id,
              roomName: item.room.name,
              dateValue: toDateInputValue(item.startDateTime),
              displayDate: formatDate(item.startDateTime),
              reason: item.reason || "",
            }))}
          />
        </div>
      </div>
    </main>
  );
}