import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { NextRequest } from "next/server";
import { notifyUserOrderStatusChange } from "@/lib/notifications";

// GET /api/admin/catalog-orders/[id] — single order with items
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(_request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const orderId = Number(id);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: "Неверный ID" }, { status: 400 });
    }

    const order = await prisma.catalogOrder.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Failed to fetch order:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить заказ" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/catalog-orders/[id] — update order status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const orderId = Number(id);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: "Неверный ID" }, { status: 400 });
    }

    const body = await request.json();
    const { status } = body;

    const validStatuses = [
      "new",
      "confirmed",
      "processing",
      "shipped",
      "completed",
      "cancelled",
    ];

    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Неверный статус. Допустимые: " + validStatuses.join(", ") },
        { status: 400 }
      );
    }

    const existing = await prisma.catalogOrder.findUnique({
      where: { id: orderId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
    }

    const order = await prisma.catalogOrder.update({
      where: { id: orderId },
      data: { status },
      include: { items: true },
    });

    // Send notification if status actually changed
    if (existing.status !== status) {
      // Don't await — send asynchronously
      if (existing.userId) {
        notifyUserOrderStatusChange(
          existing.userId,
          "catalog",
          orderId,
          status,
          existing.totalAmount
        ).catch(() => {});
      }
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Failed to update order:", error);
    return NextResponse.json(
      { error: "Не удалось обновить заказ" },
      { status: 500 }
    );
  }
}
