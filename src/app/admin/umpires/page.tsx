import { prisma } from "@/lib/prisma";
import UmpireManagementPanel from "@/components/admin/umpire-management-panel";
import AdminNav from "@/components/admin/admin-nav";

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

export default async function AdminUmpiresPage() {
  const todayValue = getEasternTodayValue();
  const todayStart = new Date(`${todayValue}T00:00:00`);

  const [umpires, bookingCounts] = await Promise.all([
    prisma.umpire.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.booking.groupBy({
      by: ["umpireId"],
      where: {
        status: "ACTIVE",
        bookingDate: { gte: todayStart },
        umpireId: { not: null },
      },
      _count: { _all: true },
    }),
  ]);

  const bookingCountMap = new Map<string, number>();

  for (const row of bookingCounts) {
    if (row.umpireId) {
      bookingCountMap.set(row.umpireId, row._count._all);
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
        .umpires-shell {
          max-width: 1200px;
          margin: 0 auto;
        }

        .umpires-card {
          background-color: #ffffff;
          border: 1px solid #dbe3f0;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
        }

        @media (max-width: 768px) {
          .umpires-card {
            padding: 1rem;
            border-radius: 14px;
          }
        }
      `}</style>

      <div className="umpires-shell">
        <div className="umpires-card" style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "1.9rem" }}>
            Umpire Administration
          </h1>

          <p style={{ marginTop: 0, color: "#4b5563", marginBottom: "1rem", lineHeight: 1.5 }}>
            Add, edit, and inactivate umpires. The list is shown alphabetically, and linked booking
            counts only include today and future bookings.
          </p>

          <AdminNav todayValue={todayValue} />
        </div>

        <div className="umpires-card">
          <UmpireManagementPanel
            items={umpires.map((umpire) => ({
              id: umpire.id,
              name: umpire.name,
              phone: umpire.phone || "",
              email: umpire.email || "",
              notes: umpire.notes || "",
              doesBaseball: umpire.doesBaseball,
              doesSoftball: umpire.doesSoftball,
              isActive: umpire.isActive,
              bookingCount: bookingCountMap.get(umpire.id) || 0,
            }))}
          />
        </div>
      </div>
    </main>
  );
}