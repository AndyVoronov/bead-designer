import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/designs/saved/[id] — fetch a single saved design */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = parseInt(session.user.id, 10);
  const designId = parseInt(id, 10);

  if (isNaN(userId) || isNaN(designId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const design = await prisma.savedDesign.findUnique({
    where: { id: designId },
  });

  if (!design || design.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(design);
}

/** PATCH /api/designs/saved/[id] — rename a saved design */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = parseInt(session.user.id, 10);
  const designId = parseInt(id, 10);

  if (isNaN(userId) || isNaN(designId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const design = await prisma.savedDesign.findUnique({
    where: { id: designId },
  });

  if (!design || design.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.savedDesign.update({
    where: { id: designId },
    data: { name: name.trim() },
  });

  return NextResponse.json(updated);
}

/** DELETE /api/designs/saved/[id] — delete a saved design */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = Number(session.user.id);
  const designId = Number(id);

  const design = await prisma.savedDesign.findUnique({
    where: { id: designId },
  });

  if (!design || design.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.savedDesign.delete({
    where: { id: designId },
  });

  return NextResponse.json({ success: true });
}
