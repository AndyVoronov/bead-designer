import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";

// GET /api/admin/promo-codes — list all promo codes
export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const promoCodes = await prisma.promoCode.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { uses: true } },
      },
    });

    const enriched = promoCodes.map((p) => ({
      ...p,
      totalUses: p._count.uses,
      _count: undefined,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Failed to fetch promo codes:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить промокоды" },
      { status: 500 }
    );
  }
}

// POST /api/admin/promo-codes — create promo code
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
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

    if (!code) {
      return NextResponse.json(
        { error: "Код промокода обязателен" },
        { status: 400 }
      );
    }

    if (scope === "gift" && !giftProductId) {
      return NextResponse.json({ error: "Для подарка выберите товар" }, { status: 400 });
    }
    if (scope !== "gift" && discountValue === undefined) {
      return NextResponse.json({ error: "Значение скидки обязательно" }, { status: 400 });
    }

    const existing = await prisma.promoCode.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (existing) {
      return NextResponse.json({ error: "Промокод с таким кодом уже существует" }, { status: 409 });
    }

    // Build requiredMinQuantity JSONB — filter out zero/empty values
    let minQtyJson: Record<string, number> = {};
    if (requiredMinQuantity && typeof requiredMinQuantity === "object") {
      minQtyJson = {};
      for (const [pid, qty] of Object.entries(requiredMinQuantity)) {
        if (Number(qty) > 0) {
          minQtyJson[pid] = Number(qty);
        }
      }
      if (Object.keys(minQtyJson).length === 0) minQtyJson = {};
    }

    const promo = await prisma.promoCode.create({
      data: {
        code: code.trim().toUpperCase(),
        description: description?.trim() || null,
        discountType: discountType || "percent",
        discountValue: scope === "gift" ? 0 : Number(discountValue),
        scope: scope || "cart",
        productIds: productIds?.length ? productIds : [],
        categoryIds: categoryIds?.length ? categoryIds : [],
        giftProductId: giftProductId ? Number(giftProductId) : null,
        giftPrice: giftPrice !== undefined ? Number(giftPrice) : 0,
        requiredProductIds: requiredProductIds?.length ? requiredProductIds : [],
        requiredCategoryIds: requiredCategoryIds?.length ? requiredCategoryIds : [],
        requiredMinQuantity: minQtyJson,
        conditionMode: conditionMode || "all",
        minOrderAmount: minOrderAmount ? Number(minOrderAmount) : null,
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        maxTotalUses: maxTotalUses ? Number(maxTotalUses) : null,
        maxUsesPerUser: maxUsesPerUser ? Number(maxUsesPerUser) : null,
        isActive: isActive !== false,
      },
    });

    return NextResponse.json(promo, { status: 201 });
  } catch (error) {
    console.error("Failed to create promo code:", error);
    return NextResponse.json(
      { error: "Не удалось создать промокод" },
      { status: 500 }
    );
  }
}
