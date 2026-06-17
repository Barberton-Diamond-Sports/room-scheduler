import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function isoDay(dateText: string) {
  return new Date(`${dateText}T00:00:00`);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function inferSport(ageGroup: string | null | undefined) {
  return ageGroup?.toLowerCase().includes("softball") ? "softball" : "baseball";
}

function formatTimeLabel(totalMinutes: number) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${suffix}`;
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
    const isAdmin = await ensureAdminAccess();
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
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

    const existingRecord = await prisma.booking.findUnique({
      where: { id },
      include: {
        room: true,
        team: true,
        umpireRecord: true,
      },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { success: false, message: "Booking not found." },
        { status: 404 }
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

    const cleanedTitle =
      typeof title === "string" && title.trim() ? title.trim() : null;

    const bookingNeedsUmpire =
      !!team.requiresUmpire &&
      (cleanedTitle === "Game" ||
        cleanedTitle === "Scrimmage" ||
        cleanedTitle === "Tournament");

    const startTimeMinutes = timeToMinutes(startTime);
    const endTimeMinutes = startTimeMinutes + Number(durationBlocks) * 30;

    const bookingDate = isoDay(date);
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

    const existingBooking = await prisma.booking.findFirst({
      where: {
        id: { not: id },
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
          id: { not: id },
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

    const booking = await prisma.booking.update({
      where: { id },
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

    const prismaWithAudit = prisma as typeof prisma & {
      auditLog?: {
        create: (args: {
          data: {
            entityType: string;
            entityId: string;
            action: string;
            detailsJson: Record<string, unknown>;
          };
        }) => Promise<unknown>;
      };
    };

    if (prismaWithAudit.auditLog) {
      await prismaWithAudit.auditLog.create({
        data: {
          entityType: "Booking",
          entityId: booking.id,
          action: "UPDATE",
          detailsJson: {
            before: {
              teamId: existingRecord.teamId ?? null,
              teamName: existingRecord.team?.teamName ?? null,
              coachEmail: existingRecord.team?.coachEmail ?? null,
              ageGroup: existingRecord.team?.ageGroup ?? null,
              roomId: existingRecord.roomId,
              roomName: existingRecord.room?.name || null,
              bookingDate: toDateInputValue(existingRecord.bookingDate),
              startTimeMinutes: existingRecord.startTimeMinutes,
              endTimeMinutes: existingRecord.endTimeMinutes,
              durationBlocks: existingRecord.durationBlocks,
              title: existingRecord.title,
              notes: existingRecord.notes,
              opponent: existingRecord.opponent ?? null,
              umpireId: existingRecord.umpireId ?? null,
              umpireName: existingRecord.umpireRecord?.name ?? null,
            },
            after: {
              teamId: booking.teamId ?? null,
              teamName: booking.team?.teamName ?? null,
              coachEmail: booking.team?.coachEmail ?? null,
              ageGroup: booking.team?.ageGroup ?? null,
              roomId: booking.roomId,
              roomName: booking.room?.name || null,
              bookingDate: toDateInputValue(booking.bookingDate),
              startTimeMinutes: booking.startTimeMinutes,
              endTimeMinutes: booking.endTimeMinutes,
              durationBlocks: booking.durationBlocks,
              title: booking.title,
              notes: booking.notes,
              opponent: booking.opponent ?? null,
              umpireId: booking.umpireId ?? null,
              umpireName: booking.umpireRecord?.name ?? null,
            },
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: validatedUmpireId
        ? "Booking updated successfully with umpire assignment."
        : "Booking updated successfully.",
      booking,
    });
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update booking." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await ensureAdminAccess();
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const existingRecord = await prisma.booking.findUnique({
      where: { id },
      include: {
        room: true,
        team: true,
        umpireRecord: true,
      },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { success: false, message: "Booking not found." },
        { status: 404 }
      );
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: { status: "CANCELED" },
      include: {
        room: true,
        team: true,
        umpireRecord: true,
      },
    });

    const prismaWithAudit = prisma as typeof prisma & {
      auditLog?: {
        create: (args: {
          data: {
            entityType: string;
            entityId: string;
            action: string;
            detailsJson: Record<string, unknown>;
          };
        }) => Promise<unknown>;
      };
    };

    if (prismaWithAudit.auditLog) {
      await prismaWithAudit.auditLog.create({
        data: {
          entityType: "Booking",
          entityId: booking.id,
          action: "DELETE",
          detailsJson: {
            deleted: {
              teamId: booking.teamId ?? null,
              teamName: booking.team?.teamName ?? null,
              coachEmail: booking.team?.coachEmail ?? null,
              ageGroup: booking.team?.ageGroup ?? null,
              roomId: booking.roomId,
              roomName: booking.room?.name || null,
              bookingDate: toDateInputValue(booking.bookingDate),
              startTimeMinutes: booking.startTimeMinutes,
              endTimeMinutes: booking.endTimeMinutes,
              durationBlocks: booking.durationBlocks,
              title: booking.title,
              notes: booking.notes,
              status: booking.status,
              opponent: booking.opponent ?? null,
              umpireId: booking.umpireId ?? null,
              umpireName: booking.umpireRecord?.name ?? null,
            },
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Booking deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting booking:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete booking." },
      { status: 500 }
    );
  }
}
