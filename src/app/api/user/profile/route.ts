import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/user/profile — update user profile (name, phone)
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone } = body;

    const userId = Number(session.user.id);
    const data: { name?: string; phone?: string } = {};

    if (name !== undefined && typeof name === "string") {
      data.name = name.trim() || undefined;
    }
    if (phone !== undefined && typeof phone === "string") {
      data.phone = phone.trim() || undefined;
    }

    await prisma.user.update({
      where: { id: userId },
      data,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json(
      { error: "Не удалось обновить профиль" },
      { status: 500 }
    );
  }
}
