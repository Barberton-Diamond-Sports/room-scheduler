import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function getEasternTodayValue() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
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

    const data: {
      isActive?: boolean;
      name?: string;
      description?: string | null;
    } = {};

    if (typeof body.isActive === "boolean") {
      data.isActive = body.isActive;
    }

    if (typeof body.name === "string") {
      const name = body.name.trim();

      if (!name) {
        return NextResponse.json(
          { success: false, message: "Field name is required." },
          { status: 400 }
        );
      }

      const existing = await prisma.room.findFirst({
        where: {
          id: { not: id },
          name: { equals: name, mode: "insensitive" },
        },
      });

      if (existing) {
        return NextResponse.json(
          { success: false, message: "A field with that name already exists." },
          { status: 409 }
        );
      }

      data.name = name;
    }

    if (typeof body.description === "string") {
      const description = body.description.trim();
      data.description = description || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { success: false, message: "No changes were provided." },
        { status: 400 }
      );
    }

    const room = await prisma.room.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, room });
  } catch (error) {
    console.error("Error updating room:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update field." },
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

    const room = await prisma.room.findUnique({
      where: { id },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!room) {
      return NextResponse.json(
        { success: false, message: "Field not found." },
        { status: 404 }
      );
    }

    if (room.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "This field must be deactivated before it can be deleted.",
        },
        { status: 409 }
      );
    }

    const todayValue = getEasternTodayValue();
    const todayStart = new Date(`${todayValue}T00:00:00`);

    const futureBookings = await prisma.booking.count({
      where: {
        roomId: id,
        status: "ACTIVE",
        bookingDate: {
          gte: todayStart,
        },
      },
    });

    if (futureBookings > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This field has today or future bookings. Clear those bookings before deleting.",
        },
        { status: 409 }
      );
    }

    await prisma.room.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting room:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete field." },
      { status: 500 }
    );
  }
}