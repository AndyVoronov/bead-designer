import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { designCode, beadCount } = body;

    if (!designCode || !beadCount) {
      return NextResponse.json(
        { error: "designCode and beadCount are required" },
        { status: 400 }
      );
    }

    const order = await prisma.order.create({
      data: {
        designCode,
        designState: JSON.stringify({ designCode, beadCount }),
        status: "new",
        beadCount: Number(beadCount),
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Failed to create order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
