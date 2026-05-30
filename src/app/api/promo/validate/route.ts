import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  effectivePrice,
  cartTotal,
  checkConditions,
  calculateDiscount,
  type CartItemForPromo,
} from "@/lib/promo-utils";

// POST /api/promo/validate — validate promo code and calculate discount
export async function POST(request: NextRequest) {
  try {
    const { code, cartItems, userId: clientUserId, sessionId } = await request.json();

    if (!code) {
      return NextResponse.json({ error: "Укажите промокод" }, { status: 400 });
    }

    // If no cartItems provided, fetch from DB using userId/sessionId
    let items: CartItemForPromo[] = cartItems || [];
    if (items.length === 0 && (clientUserId || sessionId)) {
      const cartWhere: Record<string, unknown> = {};
      if (clientUserId) cartWhere.userId = Number(clientUserId);
      else if (sessionId) cartWhere.sessionId = sessionId;

      const dbItems = await prisma.cartItem.findMany({
        where: cartWhere,
        include: {
          product: {
            select: {
              id: true,
              basePrice: true,
              discountPercent: true,
              name: true,
              categoryId: true,
            },
          },
        },
      });
      items = dbItems.map((ci) => ({
        productId: ci.product.id,
        basePrice: ci.product.basePrice,
        discountPercent: ci.product.discountPercent,
        quantity: ci.quantity,
        name: ci.product.name,
        categoryId: ci.product.categoryId ?? 0,
      }));
    }

    const promoCode = await prisma.promoCode.findFirst({
      where: { code: code.trim().toUpperCase() },
    });

    if (!promoCode) {
      return NextResponse.json({ valid: false, error: "Промокод не найден" });
    }

    if (!promoCode.isActive) {
      return NextResponse.json({ valid: false, error: "Промокод неактивен" });
    }

    const now = new Date();
    if (promoCode.validFrom && now < promoCode.validFrom) {
      return NextResponse.json({ valid: false, error: "Промокод ещё не действует" });
    }
    if (promoCode.validUntil && now > promoCode.validUntil) {
      return NextResponse.json({ valid: false, error: "Срок действия промокода истёк" });
    }

    if (promoCode.maxTotalUses && promoCode.currentUses >= promoCode.maxTotalUses) {
      return NextResponse.json({ valid: false, error: "Промокод исчерпан" });
    }

    if (promoCode.maxUsesPerUser) {
      const session = await auth().catch(() => null);
      const userId = session?.user?.id ?? null;
      if (userId) {
        const userUses = await prisma.promoCodeUse.count({
          where: { promoCodeId: promoCode.id, userId: Number(userId) },
        });
        if (userUses >= promoCode.maxUsesPerUser) {
          return NextResponse.json({ valid: false, error: "Вы уже использовали этот промокод" });
        }
      }
    }

    // ── Check cart conditions ──
    const condResult = checkConditions(
      {
        requiredProductIds: (promoCode.requiredProductIds as number[]) || [],
        requiredCategoryIds: (promoCode.requiredCategoryIds as number[]) || [],
        requiredMinQuantity: (promoCode.requiredMinQuantity as Record<string, unknown>) || {},
        conditionMode: promoCode.conditionMode || "all",
        minOrderAmount: promoCode.minOrderAmount,
      },
      items
    );

    if (!condResult.met) {
      return NextResponse.json({
        valid: false,
        error: `Условия не выполнены: ${condResult.unmet.join("; ")}`,
        unmetConditions: condResult.unmet,
      });
    }

    // ── Gift scope ──
    if (promoCode.scope === "gift") {
      if (!promoCode.giftProductId) {
        return NextResponse.json({ valid: false, error: "Промокод настроен неверно" });
      }

      const giftProduct = await prisma.product.findUnique({
        where: { id: promoCode.giftProductId },
        include: {
          images: { where: { isMain: true }, take: 1 },
          category: { select: { id: true, name: true, slug: true } },
        },
      });

      if (!giftProduct || giftProduct.status !== "active") {
        return NextResponse.json({ valid: false, error: "Подарочный товар недоступен" });
      }

      const giftPrice = promoCode.giftPrice ?? 0;
      const originalPrice = giftProduct.basePrice * (1 - giftProduct.discountPercent / 100);
      const savings = Math.max(0, originalPrice - giftPrice);

      return NextResponse.json({
        valid: true,
        code: promoCode.code,
        description: promoCode.description,
        discountType: "gift",
        scope: "gift",
        gift: {
          productId: giftProduct.id,
          name: giftProduct.name,
          slug: giftProduct.slug,
          originalPrice: Math.round(originalPrice * 100) / 100,
          giftPrice: Math.round(giftPrice * 100) / 100,
          savings: Math.round(savings * 100) / 100,
          isFree: giftPrice === 0,
          mainImage: giftProduct.images[0]
            ? { id: giftProduct.images[0].id, url: giftProduct.images[0].url }
            : null,
          category: giftProduct.category,
        },
      });
    }

    // ── Discount scopes: cart / products / categories ──
    if (items.length === 0) {
      return NextResponse.json({ valid: false, error: "Корзина пуста" }, { status: 400 });
    }

    const total = cartTotal(items);

    // Per-item discount details for UI feedback
    const discountDetails: { itemIndex: number; itemName: string; itemDiscount: number }[] = [];

    if (promoCode.scope === "products" || promoCode.scope === "categories") {
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        const eff = effectivePrice(item);
        const matchesScope =
          (promoCode.scope === "products" && promoCode.productIds.includes(item.productId)) ||
          (promoCode.scope === "categories" && item.categoryId && promoCode.categoryIds.includes(item.categoryId));

        if (matchesScope) {
          const d =
            promoCode.discountType === "percent"
              ? (eff * item.quantity * promoCode.discountValue) / 100
              : Math.min(promoCode.discountValue, eff * item.quantity);
          discountDetails.push({
            itemIndex: idx,
            itemName: item.name || `Товар #${item.productId}`,
            itemDiscount: Math.round(d * 100) / 100,
          });
        }
      }
      if (discountDetails.length === 0) {
        return NextResponse.json({ valid: false, error: "Промокод не подходит к товару в корзине" });
      }
    }

    const discount = calculateDiscount(
      {
        scope: promoCode.scope,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        maxDiscount: promoCode.maxDiscount,
        productIds: (promoCode.productIds as number[]) || [],
        categoryIds: (promoCode.categoryIds as number[]) || [],
      },
      items,
      total
    );

    return NextResponse.json({
      valid: true,
      code: promoCode.code,
      description: promoCode.description,
      discountType: promoCode.discountType,
      discountValue: promoCode.discountValue,
      scope: promoCode.scope,
      cartTotal: Math.round(total * 100) / 100,
      discount,
      finalTotal: Math.round((total - discount) * 100) / 100,
      discountDetails,
    });
  } catch (error) {
    console.error("Failed to validate promo code:", error);
    return NextResponse.json({ error: "Ошибка при проверке промокода" }, { status: 500 });
  }
}
