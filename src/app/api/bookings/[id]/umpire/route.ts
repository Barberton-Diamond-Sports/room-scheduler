
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function inferSport(teamGroup: string | null) {
  return teamGroup?.toLowerCase().includes("softball") ? "softball" : "baseball";
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!booking) {
      return NextResponse.json({ success: false, message: "Booking not found." }, { status: 404 });
    }

    if (body.umpireId === null) {
      const updated = await prisma.booking.update({
        where: { id },
        data: { umpireId: null },
        include: { umpireRecord: true },
      });
      return NextResponse.json({ success: true, booking: updated });
    }

    const umpireId = typeof body.umpireId === "string" ? body.umpireId.trim() : "";
    if (!umpireId) {
      return NextResponse.json({ success: false, message: "Choose an umpire." }, { status: 400 });
    }

    const umpire = await prisma.umpire.findUnique({ where: { id: umpireId } });
    if (!umpire || !umpire.isActive) {
      return NextResponse.json({ success: false, message: "That umpire is not available." }, { status: 404 });
    }

    const sport = inferSport(booking.teamGroup);
    if (sport === "softball" && !umpire.doesSoftball) {
      return NextResponse.json({ success: false, message: "That umpire is not marked for softball." }, { status: 409 });
    }
    if (sport === "baseball" && !umpire.doesBaseball) {
      return NextResponse.json({ success: false, message: "That umpire is not marked for baseball." }, { status: 409 });
    }

    const bookingDate = new Date(booking.bookingDate);
    bookingDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(bookingDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const conflictingAssignment = await prisma.booking.findFirst({
      where: {
        id: { not: booking.id },
        status: "ACTIVE",
        umpireId,
        bookingDate: { gte: bookingDate, lt: nextDay },
        startTimeMinutes: { lt: booking.endTimeMinutes },
        endTimeMinutes: { gt: booking.startTimeMinutes },
      },
      include: { room: true },
      orderBy: [{ bookingDate: "asc" }, { startTimeMinutes: "asc" }],
    });

    if (conflictingAssignment) {
      const conflictMessage = `${umpire.name} is already assigned to ${conflictingAssignment.title || "another game"} on ${bookingDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} from ${formatTimeLabel(conflictingAssignment.startTimeMinutes)} to ${formatTimeLabel(conflictingAssignment.endTimeMinutes)} at ${conflictingAssignment.room?.name || "another field"}.`;
      return NextResponse.json({ success: false, message: conflictMessage }, { status: 409 });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { umpireId: umpire.id },
      include: { umpireRecord: true },
    });

    return NextResponse.json({ success: true, booking: updated });
  } catch (error) {
    console.error("Error updating umpire assignment:", error);
    return NextResponse.json({ success: false, message: "Failed to update umpire assignment." }, { status: 500 });
  }
}
