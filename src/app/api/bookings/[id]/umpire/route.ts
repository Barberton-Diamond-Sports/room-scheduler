
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function inferSport(teamGroup: string | null) {
  return teamGroup?.toLowerCase().includes("softball") ? "softball" : "baseball";
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found." },
        { status: 404 }
      );
    }

    if (body.umpireId === null) {
      const updated = await prisma.booking.update({
        where: { id },
        data: {
          umpireId: null,
          umpire: null,
        },
      });

      return NextResponse.json({ success: true, booking: updated });
    }

    const umpireId = typeof body.umpireId === "string" ? body.umpireId.trim() : "";
    if (!umpireId) {
      return NextResponse.json(
        { success: false, message: "Choose an umpire." },
        { status: 400 }
      );
    }

    const umpire = await prisma.umpire.findUnique({
      where: { id: umpireId },
    });

    if (!umpire || !umpire.isActive) {
      return NextResponse.json(
        { success: false, message: "That umpire is not available." },
        { status: 404 }
      );
    }

    const sport = inferSport(booking.teamGroup);
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

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        umpireId: umpire.id,
        umpire: umpire.name,
      },
      include: {
        umpireRecord: true,
      },
    });

    return NextResponse.json({ success: true, booking: updated });
  } catch (error) {
    console.error("Error updating umpire assignment:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update umpire assignment." },
      { status: 500 }
    );
  }
}
