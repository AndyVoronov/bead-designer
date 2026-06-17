import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { NextRequest } from "next/server";

// GET /api/admin/catalog-orders — list catalog orders with pagination
export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search")?.trim() || undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { contactName: { contains: search, mode: "insensitive" } },
        { contactPhone: { contains: search } },
        { contactTelegram: { contains: search } },
        { id: isNaN(Number(search)) ? undefined : Number(search) },
      ].filter(Boolean);
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.catalogOrder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          items: true,
          user: {
            select: { id: true, name: true, email: true },
          },
          promoCode: {
            select: { id: true, code: true },
          },
        },
      }),
      prisma.catalogOrder.count({ where }),
    ]);

    return NextResponse.json({
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Failed to fetch catalog orders:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить заказы" },
      { status: 500 }
    );
  }
}
