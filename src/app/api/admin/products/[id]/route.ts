import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { sendWaitlistNotifications } from "@/lib/waitlist-notify";
import { NextRequest } from "next/server";

// GET /api/admin/products/[id] — full product with all relations
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(_request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const productId = Number(id);
    if (isNaN(productId)) {
      return NextResponse.json({ error: "Неверный ID" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        images: { orderBy: { order: "asc" } },
        badges: { include: { badge: true } },
        trustBadges: { include: { trustBadge: true } },
        compositeItems: {
          include: {
            child: {
              include: {
                images: { orderBy: { order: "asc" } },
              },
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить товар" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/products/[id] — update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const productId = Number(id);
    if (isNaN(productId)) {
      return NextResponse.json({ error: "Неверный ID" }, { status: 400 });
    }

    const body = await request.json();
    const {
      name,
      shortDescription,
      description,
      basePrice,
      discountPercent,
      type,
      categoryId,
      stockQuantity,
      recommendedAge,
      status,
      badgeIds,
      trustBadgeIds,
      compositeItems: compositeItemIds,
    } = body;

    // Verify product exists (capture old stockQuantity for waitlist notification)
    const existing = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, stockQuantity: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
    }

    const oldStockQuantity = existing.stockQuantity;

    // If any relational updates are needed, wrap them in a transaction
    const hasRelationalUpdates =
      badgeIds !== undefined ||
      trustBadgeIds !== undefined ||
      compositeItemIds !== undefined;

    if (hasRelationalUpdates) {
      await prisma.$transaction(async (tx) => {
        // If badgeIds provided, replace badges
        if (badgeIds !== undefined) {
          await tx.productBadge.deleteMany({ where: { productId } });
        }

        // If trustBadgeIds provided, replace trust badges
        if (trustBadgeIds !== undefined) {
          await tx.productTrustBadge.deleteMany({ where: { productId } });
        }

        // If compositeItemIds provided, replace composite items
        if (compositeItemIds !== undefined) {
          await tx.compositeItem.deleteMany({ where: { parentId: productId } });
        }

        // Perform the update with nested creates inside the transaction
        await tx.product.update({
          where: { id: productId },
          data: {
            ...(name !== undefined && { name }),
            ...(shortDescription !== undefined && { shortDescription }),
            ...(description !== undefined && { description }),
            ...(basePrice !== undefined && { basePrice: Number(basePrice) }),
            ...(discountPercent !== undefined && { discountPercent: Number(discountPercent) }),
            ...(type !== undefined && { type }),
            ...(categoryId !== undefined && {
              categoryId: categoryId ? Number(categoryId) : null,
            }),
            ...(stockQuantity !== undefined && { stockQuantity: Number(stockQuantity) || 0 }),
            ...(recommendedAge !== undefined && { recommendedAge: recommendedAge || null }),
            ...(status !== undefined && { status }),
            ...(badgeIds !== undefined && {
              badges: {
                create: (badgeIds as number[]).map((badgeId: number) => ({
                  badge: { connect: { id: badgeId } },
                })),
              },
            }),
            ...(trustBadgeIds !== undefined && {
              trustBadges: {
                create: (trustBadgeIds as number[]).map((id: number) => ({
                  trustBadge: { connect: { id } },
                })),
              },
            }),
            ...(compositeItemIds !== undefined && {
              compositeItems: {
                create: (compositeItemIds as Array<{ childId: number; quantity: number }>).map(
                  (item) => ({
                    child: { connect: { id: item.childId } },
                    quantity: item.quantity || 1,
                  })
                ),
              },
            }),
          },
        });
      });

      // Fetch the updated product after transaction
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          category: true,
          images: { orderBy: { order: "asc" } },
          badges: { include: { badge: true } },
          trustBadges: { include: { trustBadge: true } },
          compositeItems: { include: { child: true } },
        },
      });

      // Auto-notify waitlist subscribers when stock goes from 0 to >0
      if (oldStockQuantity === 0 && stockQuantity !== undefined && Number(stockQuantity) > 0) {
        sendWaitlistNotifications(productId).catch(console.error);
      }

      return NextResponse.json(product);
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(name !== undefined && { name }),
        ...(shortDescription !== undefined && { shortDescription }),
        ...(description !== undefined && { description }),
        ...(basePrice !== undefined && { basePrice: Number(basePrice) }),
        ...(discountPercent !== undefined && { discountPercent: Number(discountPercent) }),
        ...(type !== undefined && { type }),
        ...(categoryId !== undefined && {
          categoryId: categoryId ? Number(categoryId) : null,
        }),
        ...(stockQuantity !== undefined && { stockQuantity: Number(stockQuantity) || 0 }),
        ...(recommendedAge !== undefined && { recommendedAge: recommendedAge || null }),
        ...(status !== undefined && { status }),
      },
      include: {
        category: true,
        images: { orderBy: { order: "asc" } },
        badges: { include: { badge: true } },
        trustBadges: { include: { trustBadge: true } },
        compositeItems: { include: { child: true } },
      },
    });

    // Auto-notify waitlist subscribers when stock goes from 0 to >0
    if (oldStockQuantity === 0 && stockQuantity !== undefined && Number(stockQuantity) > 0) {
      sendWaitlistNotifications(productId).catch(console.error);
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Failed to update product:", error);
    return NextResponse.json(
      { error: "Не удалось обновить товар" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/products/[id] — delete product (cascade)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(_request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const productId = Number(id);
    if (isNaN(productId)) {
      return NextResponse.json({ error: "Неверный ID" }, { status: 400 });
    }

    const existing = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
    }

    await prisma.product.delete({
      where: { id: productId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete product:", error);
    return NextResponse.json(
      { error: "Не удалось удалить товар" },
      { status: 500 }
    );
  }
}
