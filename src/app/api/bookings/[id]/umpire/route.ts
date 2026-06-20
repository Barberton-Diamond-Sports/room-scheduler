import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function inferSport(ageGroup: string | null | undefined) {
  return ageGroup?.toLowerCase().includes("softball") ? "softball" : "baseball";
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatTimeLabel(totalMinutes: number) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${hours12}:${pad(minutes)} ${suffix}`;
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function ensureAdminAccess() {
  const cookieStore = await cookies();
  const adminAccess = cookieStore.get("admin_access")?.value;
  return adminAccess === "granted";
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const isAdmin = await ensureAdminAccess();

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        room: true,
        team: true,
        umpireRecord: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found." },
        { status: 404 }
      );
    }

    if (booking.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, message: "This booking is no longer active." },
        { status: 409 }
      );
    }

    const bookingTitle = booking.title?.trim() || "";

    if (bookingTitle !== "Game") {
      return NextResponse.json(
        { success: false, message: "Umpires can only be assigned to games." },
        { status: 400 }
      );
    }

    if (!booking.team) {
      return NextResponse.json(
        { success: false, message: "This booking is not tied to a team." },
        { status: 400 }
      );
    }

    if (!booking.team.requiresUmpire) {
      return NextResponse.json(
        { success: false, message: "This team does not require an umpire." },
        { status: 400 }
      );
    }

    /**
     * Clearing/removing an umpire assignment should stay admin-only.
     * Public umpires can claim an open game, but should not be able to clear assignments.
     */
    if (body.umpireId === null) {
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, message: "Unauthorized" },
          { status: 401 }
        );
      }

      const updated = await prisma.booking.update({
        where: { id },
        data: { umpireId: null },
        include: { umpireRecord: true },
      });

      return NextResponse.json({ success: true, booking: updated });
    }

    const umpireId = typeof body.umpireId === "string" ? body.umpireId.trim() : "";

    if (!umpireId) {
      return NextResponse.json(
        { success: false, message: "Choose an umpire." },
        { status: 400 }
      );
    }

    /**
     * Non-admin users should only be able to claim unassigned games.
     * Admins can change an existing assignment from the admin schedule.
     */
    if (!isAdmin && booking.umpireId) {
      return NextResponse.json(
        { success: false, message: "This game already has an umpire assigned." },
        { status: 409 }
      );
    }

    const umpire = await prisma.umpire.findUnique({
      where: { id: umpireId },
    });

    if (!umpire || !umpire.isActive) {
      return NextResponse.json(
        { success: false, message: "That umpire is not available." },
        { status: 404 }
      );
    }

    const sport = inferSport(booking.team.ageGroup);

    if (sport === "softball" && !umpire.doesSoftball) {
      return NextResponse.json(
        { success: false, message: "That umpire is not marked for softball." },
        { status: 409 }
      );
    }

    if (sport === "baseball" && !umpire.doesBaseball) {
      return NextResponse.json(
        { success: false, message: "That umpire is not marked for baseball." },
        { status: 409 }
      );
    }

    const bookingDateValue = toDateInputValue(booking.bookingDate);
    const bookingDate = new Date(`${bookingDateValue}T00:00:00`);
    const nextDay = new Date(bookingDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const conflictingAssignment = await prisma.booking.findFirst({
      where: {
        id: { not: booking.id },
        status: "ACTIVE",
        umpireId,
        bookingDate: {
          gte: bookingDate,
          lt: nextDay,
        },
        startTimeMinutes: { lt: booking.endTimeMinutes },
        endTimeMinutes: { gt: booking.startTimeMinutes },
      },
      include: {
        room: true,
      },
      orderBy: [{ bookingDate: "asc" }, { startTimeMinutes: "asc" }],
    });

    if (conflictingAssignment) {
      const conflictMessage = `${umpire.name} is already assigned to ${
        conflictingAssignment.title || "another game"
      } on ${bookingDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })} from ${formatTimeLabel(conflictingAssignment.startTimeMinutes)} to ${formatTimeLabel(
        conflictingAssignment.endTimeMinutes
      )} at ${conflictingAssignment.room?.name || "another field"}.`;

      return NextResponse.json(
        { success: false, message: conflictMessage },
        { status: 409 }
      );
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { umpireId: umpire.id },
      include: { umpireRecord: true },
    });

    return NextResponse.json({ success: true, booking: updated });
  } catch (error) {
    console.error("Error updating umpire assignment:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update umpire assignment." },
      { status: 500 }
    );
  }
}