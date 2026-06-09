import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
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
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const activeBookings = await prisma.booking.count({
      where: {
        roomId: id,
        status: "ACTIVE",
      },
    });

    if (activeBookings > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This field has active bookings. Deactivate it first or clear the bookings before deleting.",
        },
        { status: 409 }
      );
    }

    await prisma.room.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting room:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete field." },
      { status: 500 }
    );
  }
}