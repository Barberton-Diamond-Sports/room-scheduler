
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import UmpireManagementPanel from "@/components/admin/umpire-management-panel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminUmpiresPage() {
  const umpires = await prisma.umpire.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      _count: {
        select: { bookings: true },
      },
    },
  });

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#f5f7fb", padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #dbe3f0", borderRadius: "16px", padding: "1.5rem", marginBottom: "1.5rem", boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)" }}>
          <h1 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Manage Umpires</h1>
          <p style={{ marginTop: 0, color: "#4b5563", marginBottom: "1rem" }}>
            Add, edit, and inactivate umpires. Active umpires will be available for assignment in a later step.
          </p>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Link href="/admin" style={{ display: "inline-block", padding: "0.65rem 1rem", backgroundColor: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: "10px", color: "#1e3a8a", textDecoration: "none", fontWeight: 600 }}>
              Back to Admin
            </Link>
          </div>
        </div>

        <div style={{ backgroundColor: "#ffffff", border: "1px solid #dbe3f0", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)" }}>
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
              bookingCount: umpire._count.bookings,
            }))}
          />
        </div>
      </div>
    </main>
  );
}
