
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function dayBounds(dateText: string) {
  const start = new Date(`${dateText}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function POST(request: Request) {
  try {
const body = await request.json();

const roomIds: string[] = Array.isArray(body.roomIds)
  ? body.roomIds.filter(
      (item: unknown): item is string =>
        typeof item === "string" && item.trim().length > 0
    )
  : [];

const date = typeof body.date === "string" ? body.date : "";
const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const date = typeof body.date === "string" ? body.date : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!date) {
      return NextResponse.json({ success: false, message: "A blackout date is required." }, { status: 400 });
    }

    if (roomIds.length === 0) {
      return NextResponse.json({ success: false, message: "Choose at least one field to black out." }, { status: 400 });
    }

    const { start, end } = dayBounds(date);

    const conflictingBookings = await prisma.booking.findMany({
      where: {
        roomId: { in: roomIds },
        status: "ACTIVE",
        bookingDate: {
          gte: start,
          lt: end,
        },
      },
      include: { room: true },
      orderBy: [{ roomId: "asc" }, { startTimeMinutes: "asc" }],
    });

    if (conflictingBookings.length > 0) {
      const roomNames = Array.from(new Set(conflictingBookings.map((item) => item.room.name)));
      return NextResponse.json(
        {
          success: false,
          message: `Cannot create blackout because bookings already exist for: ${roomNames.join(", ")}.`,
        },
        { status: 409 }
      );
    }

    const existingBlackouts = await prisma.roomBlackout.findMany({
      where: {
        roomId: { in: roomIds },
        startDateTime: { lt: end },
        endDateTime: { gt: start },
      },
      include: { room: true },
    });

    if (existingBlackouts.length > 0) {
      const roomNames = Array.from(new Set(existingBlackouts.map((item) => item.room.name)));
      return NextResponse.json(
        {
          success: false,
          message: `Blackout already exists for: ${roomNames.join(", ")}.`,
        },
        { status: 409 }
      );
    }

    await prisma.roomBlackout.createMany({
      data: roomIds.map((roomId) => ({
        roomId,
        startDateTime: start,
        endDateTime: end,
        reason: reason || null,
      })),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating room blackout:", error);
    return NextResponse.json({ success: false, message: "Failed to create blackout." }, { status: 500 });
  }
}
