import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const templates = await prisma.template.findMany({
    where: { isApproved: true },
    select: {
      id: true,
      name: true,
      designCode: true,
      beadCount: true,
      isUserSubmitted: true,
      favoriteCount: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(templates);
}
