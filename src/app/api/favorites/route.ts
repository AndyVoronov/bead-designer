import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/favorites — list user's favorite templates */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    include: { template: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(favorites);
}

/** POST /api/favorites — toggle favorite on a template */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const body = await request.json();
  const templateId = body.templateId;

  if (!templateId) {
    return NextResponse.json({ error: "templateId required" }, { status: 400 });
  }

  // Check if already favorited
  const existing = await prisma.favorite.findUnique({
    where: { userId_templateId: { userId, templateId } },
  });

  if (existing) {
    // Unfavorite
    await prisma.favorite.delete({ where: { id: existing.id } });
    await prisma.template.update({
      where: { id: templateId },
      data: { favoriteCount: { decrement: 1 } },
    });
    return NextResponse.json({ favorited: false });
  }

  // Favorite
  await prisma.favorite.create({
    data: { userId, templateId },
  });
  await prisma.template.update({
    where: { id: templateId },
    data: { favoriteCount: { increment: 1 } },
  });
  return NextResponse.json({ favorited: true }, { status: 201 });
}
