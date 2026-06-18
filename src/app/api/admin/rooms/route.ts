import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

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
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Field name is required." },
        { status: 400 }
      );
    }

    const existing = await prisma.room.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "A field with that name already exists." },
        { status: 409 }
      );
    }

    const room = await prisma.room.create({
      data: {
        name,
        description: description || null,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, room });
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create field." },
      { status: 500 }
    );
  }
}
