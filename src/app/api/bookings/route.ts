import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function roomAllowsPurpose(
  room: {
    allowGames: boolean;
    allowPractices: boolean;
    allowScrimmages: boolean;
    allowOther: boolean;
  },
  purpose: string | null | undefined
) {
  const normalizedPurpose = typeof purpose === "string" ? purpose.trim() : "";

  if (normalizedPurpose === "Game") return room.allowGames;
  if (normalizedPurpose === "Practice") return room.allowPractices;
  if (normalizedPurpose === "Scrimmage") return room.allowScrimmages;
  if (normalizedPurpose === "Other") return room.allowOther;

  return true;
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const offsetPart =
    parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";

  const match = offsetPart.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);

  if (!match) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");

  return sign * (hours * 60 + minutes);
}

function easternDateTimeToUtc(dateText: string, hour = 0, minute = 0) {
  const [year, month, day] = dateText.split("-").map(Number);

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offsetMinutes = getTimeZoneOffsetMinutes(utcGuess, "America/New_York");

  return new Date(utcGuess.getTime() - offsetMinutes * 60 * 1000);
}

function addDaysToDateText(dateText: string, days: number) {
  const [year, month, day] = dateText.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + days);

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function dayBounds(dateText: string) {
  const start = easternDateTimeToUtc(dateText);
  const end = easternDateTimeToUtc(addDaysToDateText(dateText, 1));

  return { start, end };
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

    const { start: bookingDate, end: nextDay } = dayBounds(date);

    const [bookings, blackouts] = await Promise.all([
      prisma.booking.findMany({
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
      }),
      prisma.roomBlackout.findMany({
        where: {
          startDateTime: { lt: nextDay },
          endDateTime: { gt: bookingDate },
        },
        include: {
          room: true,
        },
        orderBy: [{ roomId: "asc" }, { startDateTime: "asc" }],
      }),
    ]);

    return NextResponse.json({
      success: true,
      bookings,
      blackouts: blackouts.map((item) => ({
        id: item.id,
        roomId: item.roomId,
        roomName: item.room.name,
        reason: item.reason,
      })),
    });
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

    const normalizedTitle =
      typeof title === "string" && title.trim() ? title.trim() : null;

    if (normalizedTitle === "Other") {
      return NextResponse.json(
        {
          success: false,
          message: "Reserved field bookings are restricted to administrators.",
        },
        { status: 403 }
      );
    }

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

    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        isActive: true,
      },
    });

    if (!room) {
      return NextResponse.json(
        { success: false, message: "Please select a valid active field." },
        { status: 400 }
      );
    }

    if (!roomAllowsPurpose(room, normalizedTitle)) {
      return NextResponse.json(
        {
          success: false,
          message: normalizedTitle
            ? `That field is not available for ${normalizedTitle.toLowerCase()} bookings.`
            : "That field is not available for this booking type.",
        },
        { status: 409 }
      );
    }

    const { start: bookingDate, end: nextDay } = dayBounds(date);

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
            : "That field is unavailable on that date.",
        },
        { status: 409 }
      );
    }

    const normalizedDurationBlocks = Number(durationBlocks);

    if (
      !Number.isInteger(normalizedDurationBlocks) ||
      normalizedDurationBlocks <= 0
    ) {
      return NextResponse.json(
        { success: false, message: "Please select a valid duration." },
        { status: 400 }
      );
    }

    const startTimeMinutes = timeToMinutes(startTime);
    const endTimeMinutes = startTimeMinutes + normalizedDurationBlocks * 30;

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
        durationBlocks: normalizedDurationBlocks,
        title: normalizedTitle,
        notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
        opponent:
          typeof opponent === "string" && opponent.trim()
            ? opponent.trim()
            : null,
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