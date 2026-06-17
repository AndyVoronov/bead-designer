import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// GET /api/trust-badges — active trust badges (public)
// Optional ?productId=N param: if product has specific trust badges, return only those;
// if product has none, return all active defaults
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId")
      ? Number(searchParams.get("productId"))
      : undefined;

    if (productId && !isNaN(productId)) {
      // Check if product has specific trust badges assigned
      const productBadges = await prisma.productTrustBadge.findMany({
        where: { productId },
        include: { trustBadge: true },
      });

      if (productBadges.length > 0) {
        // Return only the product-specific trust badges
        const badges = productBadges
          .filter((pb) => pb.trustBadge.isActive)
          .map((pb) => ({
            id: pb.trustBadge.id,
            label: pb.trustBadge.label,
            icon: pb.trustBadge.icon,
            description: pb.trustBadge.description,
            order: pb.trustBadge.order,
          }))
          .sort((a, b) => a.order - b.order);

        return NextResponse.json(badges);
      }

      // Product has no specific trust badges — fall through to all active defaults
    }

    // Return all active trust badges
    const badges = await prisma.trustBadge.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: {
        id: true,
        label: true,
        icon: true,
        description: true,
        order: true,
      },
    });

    return NextResponse.json(badges);
  } catch (error) {
    console.error("Failed to fetch trust badges:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить сигналы доверия" },
      { status: 500 }
    );
  }
}
