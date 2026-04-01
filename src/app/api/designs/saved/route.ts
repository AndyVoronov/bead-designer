import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/designs/saved — list user's saved designs */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const designs = await prisma.savedDesign.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(designs);
}

/** POST /api/designs/save — save current design */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const body = await request.json();
  const { name, designCode, beadCount } = body;

  if (!name || !designCode || !beadCount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const design = await prisma.savedDesign.create({
    data: { userId, name, designCode, beadCount },
  });

  return NextResponse.json(design, { status: 201 });
}
