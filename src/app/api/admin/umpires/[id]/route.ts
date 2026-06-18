import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

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

    const existingUmpire = await prisma.umpire.findUnique({
      where: { id },
    });

    if (!existingUmpire) {
      return NextResponse.json(
        { success: false, message: "Umpire not found." },
        { status: 404 }
      );
    }

    const data: {
      name?: string;
      phone?: string | null;
      email?: string | null;
      notes?: string | null;
      doesBaseball?: boolean;
      doesSoftball?: boolean;
      isActive?: boolean;
    } = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();

      if (!name) {
        return NextResponse.json(
          { success: false, message: "Umpire name is required." },
          { status: 400 }
        );
      }

      const existing = await prisma.umpire.findFirst({
        where: {
          id: { not: id },
          name: { equals: name, mode: "insensitive" },
        },
      });

      if (existing) {
        return NextResponse.json(
          { success: false, message: "An umpire with that name already exists." },
          { status: 409 }
        );
      }

      data.name = name;
    }

    if (typeof body.phone === "string") data.phone = body.phone.trim() || null;
    if (typeof body.email === "string") data.email = body.email.trim() || null;
    if (typeof body.notes === "string") data.notes = body.notes.trim() || null;
    if (typeof body.doesBaseball === "boolean") data.doesBaseball = body.doesBaseball;
    if (typeof body.doesSoftball === "boolean") data.doesSoftball = body.doesSoftball;
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { success: false, message: "No changes were provided." },
        { status: 400 }
      );
    }

    const finalDoesBaseball =
      typeof data.doesBaseball === "boolean"
        ? data.doesBaseball
        : existingUmpire.doesBaseball;

    const finalDoesSoftball =
      typeof data.doesSoftball === "boolean"
        ? data.doesSoftball
        : existingUmpire.doesSoftball;

    if (!finalDoesBaseball && !finalDoesSoftball) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select Baseball, Softball, or both for this umpire.",
        },
        { status: 400 }
      );
    }

    const umpire = await prisma.umpire.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, umpire });
  } catch (error) {
    console.error("Error updating umpire:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update umpire." },
      { status: 500 }
    );
  }
}