import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

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

  // Ensure the design belongs to the user
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
