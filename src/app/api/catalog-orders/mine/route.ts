import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/catalog-orders/mine — list current user's catalog orders
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orders = await prisma.catalogOrder.findMany({
      where: { userId: Number(session.user.id) },
      include: {
        items: {
          select: {
            productName: true,
            productPrice: true,
            quantity: true,
            productId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("GET /api/catalog-orders/mine error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
