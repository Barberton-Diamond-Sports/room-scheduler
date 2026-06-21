import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

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

  const offsetPart = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
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

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;
}

function dayBounds(dateText: string) {
  const start = easternDateTimeToUtc(dateText);
  const end = easternDateTimeToUtc(addDaysToDateText(dateText, 1));

  return { start, end };
}

async function ensureAdminAccess() {
  const cookieStore = await cookies();
  const adminAccess = cookieStore.get("admin_access")?.value;
  return adminAccess === "granted";
}

export async function POST(request: Request) {
  try {
    const isAdmin = await ensureAdminAccess();
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const roomIds: string[] = Array.isArray(body.roomIds)
      ? body.roomIds.filter(
          (item: unknown): item is string =>
            typeof item === "string" && item.trim().length > 0
        )
      : [];

    const date = typeof body.date === "string" ? body.date : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!date) {
      return NextResponse.json(
        { success: false, message: "A blackout date is required." },
        { status: 400 }
      );
    }

    if (roomIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "Choose at least one field to black out." },
        { status: 400 }
      );
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
      const roomNames = Array.from(
        new Set(conflictingBookings.map((item) => item.room.name))
      );

      return NextResponse.json(
        {
          success: false,
          message: `Cannot create blackout because bookings already exist for: ${roomNames.join(
            ", "
          )}.`,
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
      const roomNames = Array.from(
        new Set(existingBlackouts.map((item) => item.room.name))
      );

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
    return NextResponse.json(
      { success: false, message: "Failed to create blackout." },
      { status: 500 }
    );
  }
}