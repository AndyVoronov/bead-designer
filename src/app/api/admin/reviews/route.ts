import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(reviews);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { id, action } = body;

  if (!id || !["approve", "reject", "delete"].includes(action)) {
    return NextResponse.json({ error: "id and action (approve/reject/delete) required" }, { status: 400 });
  }

  if (action === "delete") {
    await prisma.review.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  }

  await prisma.review.update({
    where: { id },
    data: { isApproved: action === "approve" },
  });

  return NextResponse.json({ [action === "approve" ? "approved" : "rejected"]: true });
}
