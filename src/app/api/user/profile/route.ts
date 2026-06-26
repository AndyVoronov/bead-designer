import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/user/profile — get user profile with phone and provider info
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        phone: true,
        createdAt: true,
        accounts: {
          select: { provider: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      phone: user.phone,
      providers: user.accounts.map((a) => a.provider),
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Failed to get profile:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить профиль" },
      { status: 500 }
    );
  }
}

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
