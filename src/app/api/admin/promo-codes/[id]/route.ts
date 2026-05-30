import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";

// GET /api/admin/promo-codes/[id] — single promo code with usage stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const promo = await prisma.promoCode.findUnique({
      where: { id: Number(id) },
      include: {
        _count: { select: { uses: true } },
        uses: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!promo) {
      return NextResponse.json(
        { error: "Промокод не найден" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...promo,
      totalUses: promo._count.uses,
      _count: undefined,
    });
  } catch (error) {
    console.error("Failed to fetch promo code:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить промокод" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/promo-codes/[id] — update promo code
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const promoId = Number(id);
    if (isNaN(promoId)) {
      return NextResponse.json({ error: "Неверный ID" }, { status: 400 });
    }

    const existing = await prisma.promoCode.findUnique({
      where: { id: promoId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Промокод не найден" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      code,
      description,
      discountType,
      discountValue,
      scope,
      productIds,
      categoryIds,
      minOrderAmount,
      maxDiscount,
      validFrom,
      validUntil,
      maxTotalUses,
      maxUsesPerUser,
      isActive,
      giftProductId,
      giftPrice,
      requiredProductIds,
      requiredCategoryIds,
      requiredMinQuantity,
      conditionMode,
    } = body;

    const promo = await prisma.promoCode.update({
      where: { id: promoId },
      data: {
        ...(code !== undefined && {
          code: code.trim().toUpperCase(),
        }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
        ...(discountType !== undefined && { discountType }),
        ...(discountValue !== undefined && {
          discountValue: Number(discountValue),
        }),
        ...(scope !== undefined && { scope }),
        ...(productIds !== undefined && {
          productIds: productIds || [],
        }),
        ...(categoryIds !== undefined && {
          categoryIds: categoryIds || [],
        }),
        ...(giftProductId !== undefined && {
          giftProductId: giftProductId ? Number(giftProductId) : null,
        }),
        ...(giftPrice !== undefined && {
          giftPrice: Number(giftPrice),
        }),
        ...(requiredProductIds !== undefined && {
          requiredProductIds: requiredProductIds || [],
        }),
        ...(requiredCategoryIds !== undefined && {
          requiredCategoryIds: requiredCategoryIds || [],
        }),
        ...(requiredMinQuantity !== undefined && {
          requiredMinQuantity: requiredMinQuantity || {},
        }),
        ...(conditionMode !== undefined && {
          conditionMode: conditionMode || "all",
        }),
        ...(minOrderAmount !== undefined && {
          minOrderAmount: minOrderAmount ? Number(minOrderAmount) : null,
        }),
        ...(maxDiscount !== undefined && {
          maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        }),
        ...(validFrom !== undefined && {
          validFrom: validFrom ? new Date(validFrom) : null,
        }),
        ...(validUntil !== undefined && {
          validUntil: validUntil ? new Date(validUntil) : null,
        }),
        ...(maxTotalUses !== undefined && {
          maxTotalUses: maxTotalUses ? Number(maxTotalUses) : null,
        }),
        ...(maxUsesPerUser !== undefined && {
          maxUsesPerUser: maxUsesPerUser ? Number(maxUsesPerUser) : null,
        }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(promo);
  } catch (error) {
    console.error("Failed to update promo code:", error);
    return NextResponse.json(
      { error: "Не удалось обновить промокод" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/promo-codes/[id] — delete promo code
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(_request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const promoId = Number(id);
    if (isNaN(promoId)) {
      return NextResponse.json({ error: "Неверный ID" }, { status: 400 });
    }

    await prisma.promoCode.delete({ where: { id: promoId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete promo code:", error);
    return NextResponse.json(
      { error: "Не удалось удалить промокод" },
      { status: 500 }
    );
  }
}
