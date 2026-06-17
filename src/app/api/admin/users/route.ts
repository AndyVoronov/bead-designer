import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));

    const where: Record<string, unknown> = search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatar: true,
          telegramChatId: true,
          createdAt: true,
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
          accounts: {
            select: { provider: true, providerId: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const userIds = users.map((u) => u.id);
    const orderTotals =
      userIds.length > 0
        ? await prisma.catalogOrder.groupBy({
            by: ["userId"],
            where: { userId: { in: userIds } },
            _sum: { totalAmount: true },
            _count: { id: true },
          })
        : [];

    const totalByUser = Object.fromEntries(
      orderTotals.map((o) => [o.userId, { total: o._sum.totalAmount || 0, count: o._count.id }])
    );

    const enriched = users.map((u) => ({
      ...u,
      catalogOrderStats: totalByUser[u.id] || { total: 0, count: 0 },
    }));

    return NextResponse.json({
      users: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
