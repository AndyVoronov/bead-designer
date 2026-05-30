import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { notifyUserOrderStatusChange } from "@/lib/notifications";

const VALID_STATUSES = ["new", "processing", "completed"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const existing = await prisma.order.findUnique({
      where: { id: Number(id) },
    });

    const order = await prisma.order.update({
      where: { id: Number(id) },
      data: { status },
    });

    // Send notification if status changed
    if (existing && existing.status !== status && existing.userId) {
      notifyUserOrderStatusChange(
        existing.userId,
        "design",
        order.id,
        status
      ).catch(() => {});
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Failed to update order status:", error);
    return NextResponse.json(
      { error: "Failed to update order status" },
      { status: 500 }
    );
  }
}
