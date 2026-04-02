import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/designs/saved — list user's saved designs */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 401 });
  }

  const designs = await prisma.savedDesign.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(designs);
}

/** POST /api/designs/saved — save current design */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id, 10);
  console.log("[saved-designs] POST userId from session:", session.user.id, "parsed:", userId);
  if (isNaN(userId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 401 });
  }

  const body = await request.json();
  const { name, designCode, beadCount } = body;

  if (!name || !designCode || !beadCount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const design = await prisma.savedDesign.create({
    data: {
      name,
      designCode,
      beadCount: Number(beadCount),
      user: { connect: { id: userId } },
    },
  });

  return NextResponse.json(design, { status: 201 });
}
