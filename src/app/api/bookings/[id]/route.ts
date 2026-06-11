
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function isoDay(dateText: string) {
  return new Date(`${dateText}T00:00:00`);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const {
      name,
      email,
      teamGroup,
      roomId,
      date,
      startTime,
      durationBlocks,
      title,
      opponent,
      umpire,
      notes,
    } = body;

    if (!name || !teamGroup || !roomId || !date || !startTime || !durationBlocks) {
      return NextResponse.json(
        { success: false, message: "Missing required booking fields." },
        { status: 400 }
      );
    }

    const existingRecord = await prisma.booking.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { success: false, message: "Booking not found." },
        { status: 404 }
      );
    }

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

    const updateData: {
      roomId: string;
      bookingDate: Date;
      startTimeMinutes: number;
      endTimeMinutes: number;
      durationBlocks: number;
      bookedByName: string;
      bookedByEmail: string | null;
      title: string | null;
      notes: string | null;
      teamGroup: string;
      opponent: string | null;
      umpire?: string | null;
    } = {
      roomId,
      bookingDate,
      startTimeMinutes,
      endTimeMinutes,
      durationBlocks: Number(durationBlocks),
      bookedByName: name,
      bookedByEmail: email || null,
      title: title || null,
      notes: notes || null,
      teamGroup,
      opponent: opponent || null,
    };

    if (typeof umpire === "string") {
      updateData.umpire = umpire.trim() || null;
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: { room: true },
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
              bookedByName: existingRecord.bookedByName,
              bookedByEmail: existingRecord.bookedByEmail,
              roomId: existingRecord.roomId,
              roomName: existingRecord.room?.name || null,
              bookingDate: existingRecord.bookingDate.toISOString(),
              startTimeMinutes: existingRecord.startTimeMinutes,
              endTimeMinutes: existingRecord.endTimeMinutes,
              durationBlocks: existingRecord.durationBlocks,
              title: existingRecord.title,
              notes: existingRecord.notes,
              teamGroup: existingRecord.teamGroup ?? null,
              opponent: existingRecord.opponent ?? null,
              umpire: existingRecord.umpire ?? null,
            },
            after: {
              bookedByName: booking.bookedByName,
              bookedByEmail: booking.bookedByEmail,
              roomId: booking.roomId,
              roomName: booking.room?.name || null,
              bookingDate: booking.bookingDate.toISOString(),
              startTimeMinutes: booking.startTimeMinutes,
              endTimeMinutes: booking.endTimeMinutes,
              durationBlocks: booking.durationBlocks,
              title: booking.title,
              notes: booking.notes,
              teamGroup: booking.teamGroup ?? null,
              opponent: booking.opponent ?? null,
            },
          },
        },
      });
    }

    return NextResponse.json({ success: true, message: "Booking updated successfully.", booking });
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update booking." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const existingRecord = await prisma.booking.findUnique({
      where: { id },
      include: { room: true },
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
      include: { room: true },
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
              bookedByName: booking.bookedByName,
              bookedByEmail: booking.bookedByEmail,
              roomId: booking.roomId,
              roomName: booking.room?.name || null,
              bookingDate: booking.bookingDate.toISOString(),
              startTimeMinutes: booking.startTimeMinutes,
              endTimeMinutes: booking.endTimeMinutes,
              durationBlocks: booking.durationBlocks,
              title: booking.title,
              notes: booking.notes,
              status: booking.status,
              teamGroup: booking.teamGroup ?? null,
              opponent: booking.opponent ?? null,
            },
          },
        },
      });
    }

    return NextResponse.json({ success: true, message: "Booking deleted successfully." });
  } catch (error) {
    console.error("Error deleting booking:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete booking." },
      { status: 500 }
    );
  }
}
