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
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const doesBaseball =
      typeof body.doesBaseball === "boolean" ? body.doesBaseball : true;
    const doesSoftball =
      typeof body.doesSoftball === "boolean" ? body.doesSoftball : false;
    const isActive =
      typeof body.isActive === "boolean" ? body.isActive : true;

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Umpire name is required." },
        { status: 400 }
      );
    }

    if (!doesBaseball && !doesSoftball) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select Baseball, Softball, or both for this umpire.",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.umpire.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "An umpire with that name already exists." },
        { status: 409 }
      );
    }

    const umpire = await prisma.umpire.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        notes: notes || null,
        doesBaseball,
        doesSoftball,
        isActive,
      },
    });

    return NextResponse.json({ success: true, umpire });
  } catch (error) {
    console.error("Error creating umpire:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create umpire." },
      { status: 500 }
    );
  }
}
