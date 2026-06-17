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

    const cleanedTitle =
      typeof title === "string" && title.trim() ? title.trim() : null;

    const bookingNeedsUmpire =
      !!team.requiresUmpire &&
      (cleanedTitle === "Game" ||
        cleanedTitle === "Scrimmage" ||
        cleanedTitle === "Tournament");

    let validatedUmpireId: string | null = null;

    if (typeof umpireId === "string" && umpireId.trim()) {
      const selectedUmpireId = umpireId.trim();

      if (!bookingNeedsUmpire) {
        return NextResponse.json(
          {
            success: false,
            message:
              "An umpire can only be assigned for games, scrimmages, or tournaments that require one.",
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

      validatedUmpireId = selectedUmpireId;
    }

    const booking = await prisma.booking.create({
      data: {
        roomId,
        teamId: team.id,
        bookingDate,
        startTimeMinutes,
        endTimeMinutes,
        durationBlocks: Number(durationBlocks),
        title: cleanedTitle,
        notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
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

    return NextResponse.json({
      success: true,
      message: validatedUmpireId
        ? "Booking saved successfully with umpire assignment."
        : "Booking saved successfully.",
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