import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTimeLabel(totalMinutes: number) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function inferSport(ageGroup: string | null | undefined) {
  return ageGroup?.toLowerCase().includes("softball") ? "softball" : "baseball";
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

    const {
      teamId,
      roomId,
      date,
      startTime,
      durationBlocks,
      title,
      opponent,
      notes,
      umpireId,
    } = body;

    const cleanedTitle =
      typeof title === "string" && title.trim() ? title.trim() : null;

    const cleanedTeamId =
      typeof teamId === "string" && teamId.trim() ? teamId.trim() : null;

    const isTeamlessReservedBooking =
      !cleanedTeamId && cleanedTitle === "Other";

    if (!roomId || !date || !startTime || !durationBlocks) {
      return NextResponse.json(
        { success: false, message: "Missing required booking fields." },
        { status: 400 }
      );
    }

    if (!cleanedTeamId && !isTeamlessReservedBooking) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please select a team, or choose Other to reserve a field without a team.",
        },
        { status: 400 }
      );
    }

    let team: {
      id: string;
      ageGroup: string;
      requiresUmpire: boolean;
    } | null = null;

    if (cleanedTeamId) {
      team = await prisma.team.findFirst({
        where: {
          id: cleanedTeamId,
          isActive: true,
        },
        select: {
          id: true,
          ageGroup: true,
          requiresUmpire: true,
        },
      });

      if (!team) {
        return NextResponse.json(
          { success: false, message: "Please select a valid active team." },
          { status: 400 }
        );
      }
    }

    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        isActive: true,
      },
      select: {
        id: true,
        allowGames: true,
        allowPractices: true,
        allowScrimmages: true,
        allowOther: true,
      },
    });

    if (!room) {
      return NextResponse.json(
        { success: false, message: "Please select a valid active field." },
        { status: 400 }
      );
    }

    if (!roomAllowsPurpose(room, cleanedTitle)) {
      return NextResponse.json(
        {
          success: false,
          message: cleanedTitle
            ? `That field is not available for ${cleanedTitle.toLowerCase()} bookings.`
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
            : "That field is blacked out and unavailable on that date.",
        },
        { status: 409 }
      );
    }

    const startTimeMinutes = timeToMinutes(startTime);
    const normalizedDurationBlocks = Number(durationBlocks);
    const endTimeMinutes = startTimeMinutes + normalizedDurationBlocks * 30;

    if (
      !Number.isInteger(normalizedDurationBlocks) ||
      normalizedDurationBlocks <= 0
    ) {
      return NextResponse.json(
        { success: false, message: "Please select a valid duration." },
        { status: 400 }
      );
    }

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

    const bookingNeedsUmpire =
      !!team?.requiresUmpire &&
      cleanedTitle === "Game";

    let validatedUmpireId: string | null = null;

    if (typeof umpireId === "string" && umpireId.trim()) {
      const selectedUmpireId = umpireId.trim();

      if (!team) {
        return NextResponse.json(
          {
            success: false,
            message: "An umpire can only be assigned to a team game.",
          },
          { status: 400 }
        );
      }

      if (!bookingNeedsUmpire) {
        return NextResponse.json(
          {
            success: false,
            message: "An umpire can only be assigned for games.",
          },
          { status: 400 }
        );
      }

      const umpire = await prisma.umpire.findUnique({
        where: { id: selectedUmpireId },
      });

      if (!umpire || !umpire.isActive) {
        return NextResponse.json(
          { success: false, message: "That umpire is not available." },
          { status: 404 }
        );
      }

      const sport = inferSport(team.ageGroup);

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

      const conflictingAssignment = await prisma.booking.findFirst({
        where: {
          status: "ACTIVE",
          umpireId: selectedUmpireId,
          bookingDate: { gte: bookingDate, lt: nextDay },
          startTimeMinutes: { lt: endTimeMinutes },
          endTimeMinutes: { gt: startTimeMinutes },
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
          timeZone: "America/New_York",
          month: "short",
          day: "numeric",
          year: "numeric",
        })} from ${formatTimeLabel(
          conflictingAssignment.startTimeMinutes
        )} to ${formatTimeLabel(
          conflictingAssignment.endTimeMinutes
        )} at ${conflictingAssignment.room?.name || "another field"}.`;

        return NextResponse.json(
          { success: false, message: conflictMessage },
          { status: 409 }
        );
      }

      validatedUmpireId = selectedUmpireId;
    }

    const booking = await prisma.booking.create({
      data: {
        roomId,
        teamId: team?.id ?? null,
        bookingDate,
        startTimeMinutes,
        endTimeMinutes,
        durationBlocks: normalizedDurationBlocks,
        title: cleanedTitle,
        notes:
          typeof notes === "string" && notes.trim()
            ? notes.trim()
            : null,
        opponent:
          typeof opponent === "string" && opponent.trim()
            ? opponent.trim()
            : null,
        umpireId: validatedUmpireId,
      },
      include: {
        room: true,
        team: true,
        umpireRecord: true,
      },
    });

    const message = isTeamlessReservedBooking
      ? "Reserved field booking saved successfully."
      : validatedUmpireId
      ? "Booking saved successfully with umpire assignment."
      : "Booking saved successfully.";

    return NextResponse.json({
      success: true,
      message,
      booking,
    });
  } catch (error) {
    console.error("Error creating admin booking:", error);

    return NextResponse.json(
      { success: false, message: "Failed to save booking." },
      { status: 500 }
    );
  }
}