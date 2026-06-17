import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/care-guides — public, returns all guides with category info
export async function GET() {
  try {
    const guides = await prisma.careGuide.findMany({
      include: {
        items: { orderBy: { order: "asc" } },
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { categoryId: "asc" },
    });

    // Also return all categories so we know which ones have guides
    const categories = await prisma.category.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ guides, categories });
  } catch (error) {
    console.error("Failed to fetch care guides:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить инструкции" },
      { status: 500 }
    );
  }
}
