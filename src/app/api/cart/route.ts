import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const SESSION_COOKIE_NAME = "cart_session_id";

async function getSessionId(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

async function getOrCreateSessionId(): Promise<string> {
  const existing = await getSessionId();
  if (existing) return existing;

  // Generate new session ID
  const sessionId = `guest_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  return sessionId;
}

// GET /api/cart — return cart items for current user/session
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get("count") === "1";

    const session = await auth();
    const userId = session?.user?.id ? Number(session.user.id) : null;
    const sessionId = await getSessionId();

    if (!userId && !sessionId) {
      return NextResponse.json(countOnly ? { count: 0 } : { items: [], total: 0 });
    }

    const where: Record<string, unknown> = {};
    if (userId) {
      where.userId = userId;
    } else if (sessionId) {
      where.sessionId = sessionId;
    }

    // Lightweight count-only mode
    if (countOnly) {
      const count = await prisma.cartItem.count({ where });
      return NextResponse.json({ count }, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const cartItems = await prisma.cartItem.findMany({
      where,
      include: {
        product: {
          include: {
            images: {
              where: { isMain: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const total = cartItems.reduce((sum, item) => {
      const discountedPrice =
        item.product.basePrice * (1 - item.product.discountPercent / 100);
      return sum + discountedPrice * item.quantity;
    }, 0);

    return NextResponse.json({
      items: cartItems.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        product: {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          basePrice: item.product.basePrice,
          discountPercent: item.product.discountPercent,
          categoryId: item.product.categoryId,
          mainImage: item.product.images[0]
            ? { id: item.product.images[0].id, url: item.product.images[0].url }
            : null,
        },
      })),
      total: Math.round(total * 100) / 100,
    });
  } catch (error) {
    console.error("Failed to fetch cart:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить корзину" },
      { status: 500 }
    );
  }
}

// POST /api/cart — add item to cart
export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id ? Number(session.user.id) : null;
    let sessionId = await getSessionId();

    const body = await request.json();
    const { productId, quantity } = body;

    if (!productId || !quantity || quantity < 1) {
      return NextResponse.json(
        { error: "productId и quantity обязательны" },
        { status: 400 }
      );
    }

    // Verify product exists and is active
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) },
    });
    if (!product || product.status !== "active") {
      return NextResponse.json(
        { error: "Товар не найден или недоступен" },
        { status: 404 }
      );
    }

    // For guest users, ensure session ID exists
    if (!userId) {
      if (!sessionId) {
        sessionId = await getOrCreateSessionId();
      }
    }

    // Check if item already in cart
    const whereClause: Record<string, unknown> = { productId: Number(productId) };
    if (userId) {
      whereClause.userId = userId;
    } else {
      whereClause.sessionId = sessionId;
    }

    const existingItem = await prisma.cartItem.findFirst({
      where: whereClause,
    });

    const cappedQuantity = Math.min(Number(quantity), 99);
    let cartItem;
    if (existingItem) {
      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: Math.min(existingItem.quantity + cappedQuantity, 99) },
      });
    } else {
      cartItem = await prisma.cartItem.create({
        data: {
          userId,
          sessionId,
          productId: Number(productId),
          quantity: cappedQuantity,
        },
      });
    }

    // Set session cookie for guest users
    const response = NextResponse.json(cartItem, { status: 201 });
    if (!userId && sessionId) {
      response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
      });
    }
    return response;
  } catch (error) {
    console.error("Failed to add to cart:", error);
    return NextResponse.json(
      { error: "Не удалось добавить в корзину" },
      { status: 500 }
    );
  }
}

// DELETE /api/cart — remove item from cart
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id ? Number(session.user.id) : null;
    const sessionId = await getSessionId();

    if (!userId && !sessionId) {
      return NextResponse.json({ error: "Корзина не найдена" }, { status: 404 });
    }

    const body = await request.json();
    const { itemId } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: "itemId обязателен" },
        { status: 400 }
      );
    }

    const whereClause: Record<string, unknown> = { id: Number(itemId) };
    if (userId) {
      whereClause.userId = userId;
    } else {
      whereClause.sessionId = sessionId;
    }

    const cartItem = await prisma.cartItem.findFirst({
      where: whereClause,
    });

    if (!cartItem) {
      return NextResponse.json({ error: "Товар в корзине не найден" }, { status: 404 });
    }

    await prisma.cartItem.delete({
      where: { id: cartItem.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove from cart:", error);
    return NextResponse.json(
      { error: "Не удалось удалить из корзины" },
      { status: 500 }
    );
  }
}

// PATCH /api/cart — update quantity
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id ? Number(session.user.id) : null;
    const sessionId = await getSessionId();

    if (!userId && !sessionId) {
      return NextResponse.json({ error: "Корзина не найдена" }, { status: 404 });
    }

    const body = await request.json();
    const { itemId, quantity } = body;

    if (!itemId || quantity === undefined || quantity < 1) {
      return NextResponse.json(
        { error: "itemId и quantity обязательны" },
        { status: 400 }
      );
    }

    const whereClause: Record<string, unknown> = { id: Number(itemId) };
    if (userId) {
      whereClause.userId = userId;
    } else {
      whereClause.sessionId = sessionId;
    }

    const cartItem = await prisma.cartItem.findFirst({
      where: whereClause,
    });

    if (!cartItem) {
      return NextResponse.json({ error: "Товар в корзине не найден" }, { status: 404 });
    }

    const updated = await prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity: Math.min(Number(quantity), 99) },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update cart:", error);
    return NextResponse.json(
      { error: "Не удалось обновить корзину" },
      { status: 500 }
    );
  }
}
