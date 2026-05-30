import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const userId = Number(id);
    if (!userId) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        accounts: { select: { provider: true, providerId: true } },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { product: { select: { id: true, name: true, slug: true } } },
        },
        catalogOrders: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            items: {
              include: { product: { select: { id: true, name: true, slug: true } } },
            },
          },
        },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        favorites: { take: 5 },
        productFavorites: { take: 5 },
        _count: {
          select: {
            reviews: true,
            orders: true,
            catalogOrders: true,
            favorites: true,
            productFavorites: true,
            designs: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const totalSpent = await prisma.catalogOrder.aggregate({
      where: { userId },
      _sum: { totalAmount: true },
    });

    const orderCount = await prisma.catalogOrder.count({ where: { userId } });
    const orderTotal = await prisma.catalogOrder.aggregate({
      where: { userId },
      _sum: { totalAmount: true },
    });

    return NextResponse.json({
      ...user,
      totalSpent: totalSpent._sum.totalAmount || 0,
      catalogOrderStats: { total: orderTotal._sum.totalAmount || 0, count: orderCount },
    });
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}
