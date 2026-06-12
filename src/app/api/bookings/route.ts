import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { success: false, message: "A date is required." },
        { status: 400 }
      );
    }

    const bookingDate = new Date(`${date}T00:00:00`);
    const nextDay = new Date(bookingDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const bookings = await prisma.booking.findMany({
      where: {
        status: "ACTIVE",
        bookingDate: {
          gte: bookingDate,
          lt: nextDay,
        },
      },
      include: {
        room: true,
        team: true,
      },
      orderBy: [{ roomId: "asc" }, { startTimeMinutes: "asc" }],
    });

    return NextResponse.json({ success: true, bookings });
  } catch (error) {
    console.error("Error loading bookings for date:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load bookings." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      teamId,
      roomId,
      date,
      startTime,
      durationBlocks,
      title,
      opponent,
      notes,
    } = body;

    if (!teamId || !roomId || !date || !startTime || !durationBlocks) {
      return NextResponse.json(
        { success: false, message: "Missing required booking fields." },
        { status: 400 }
      );
    }

    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        isActive: true,
      },
    });

    if (!team) {
      return NextResponse.json(
        { success: false, message: "Please select a valid active team." },
        { status: 400 }
      );
    }

    const bookingDate = new Date(`${date}T00:00:00`);
    const nextDay = new Date(bookingDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const blackout = await prisma.roomBlackout.findFirst({
      where: {
        roomId,
        startDateTime: { lt: nextDay },
        endDateTime: { gt: bookingDate },
      },
    });

    if (blackout) {
      return NextResponse.json(
        {
          success: false,
          message: blackout.reason?.trim()
            ? `That field is unavailable on that date: ${blackout.reason}.`
            : "That field is blacked out and unavailable on that date.",
        },
        { status: 409 }
      );
    }

    const startTimeMinutes = timeToMinutes(startTime);
    const endTimeMinutes = startTimeMinutes + Number(durationBlocks) * 30;

    const existingBooking = await prisma.booking.findFirst({
      where: {
        roomId,
        status: "ACTIVE",
        bookingDate: { gte: bookingDate, lt: nextDay },
        startTimeMinutes: { lt: endTimeMinutes },
        endTimeMinutes: { gt: startTimeMinutes },
      },
    });

    if (existingBooking) {
      return NextResponse.json(
        { success: false, message: "That field is already booked for that time." },
        { status: 409 }
      );
    }

    const booking = await prisma.booking.create({
      data: {
        roomId,
        teamId: team.id,
        bookingDate,
        startTimeMinutes,
        endTimeMinutes,
        durationBlocks: Number(durationBlocks),
        bookedByName: team.teamName,
        bookedByEmail: team.coachEmail || null,
        title: title || null,
        notes: notes || null,
        teamGroup: team.ageGroup,
        opponent: opponent || null,
      },
      include: {
        room: true,
        team: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Booking saved successfully.",
      booking,
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json(
      { success: false, message: "Failed to save booking." },
      { status: 500 }
    );
  }
}
