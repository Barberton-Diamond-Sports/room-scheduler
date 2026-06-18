import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

async function ensureAdminAccess() {
  const cookieStore = await cookies();
  const adminAccess = cookieStore.get("admin_access")?.value;
  return adminAccess === "granted";
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

    await prisma.roomBlackout.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting room blackout:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete blackout." },
      { status: 500 }
    );
  }
}
