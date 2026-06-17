import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/blog/tags — all unique tags with published post count
export async function GET() {
  try {
    const tags = await prisma.blogPostTag.groupBy({
      by: ["tag"],
      where: {
        post: { status: "published" },
      },
      _count: {
        tag: true,
      },
      orderBy: {
        _count: { tag: "desc" },
      },
    });

    return NextResponse.json(
      tags.map((t) => ({
        tag: t.tag,
        count: t._count.tag,
      }))
    );
  } catch (error) {
    console.error("Failed to fetch blog tags:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить теги" },
      { status: 500 }
    );
  }
}
