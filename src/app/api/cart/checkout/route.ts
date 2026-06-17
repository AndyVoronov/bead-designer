import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  checkConditions,
  calculateDiscount,
  type CartItemForPromo,
} from "@/lib/promo-utils";
import { sendOrderConfirmation } from "@/lib/email";

const SESSION_COOKIE_NAME = "cart_session_id";

// POST /api/cart/checkout — create order from cart items
export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id ? Number(session.user.id) : null;

    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!userId && !sessionId) {
      return NextResponse.json({ error: "Корзина пуста" }, { status: 400 });
    }

    const body = await request.json();
    const {
      contactName: rawName,
      contactPhone: rawPhone,
      contactEmail: rawEmail,
      contactTelegram: rawTelegram,
      deliveryMethod: rawDeliveryMethod,
      deliveryCity: rawDeliveryCity,
      deliveryAddress: rawDeliveryAddress,
      deliveryIndex: rawDeliveryIndex,
      comment: rawComment,
      promoCode: promoCodeInput,
    } = body;

    // Sanitize and validate inputs
    const contactName = String(rawName || "").trim().slice(0, 200);
    const contactPhone = String(rawPhone || "").trim().slice(0, 30);
    const contactEmail = String(rawEmail || "").trim().slice(0, 200);
    const contactTelegram = String(rawTelegram || "").trim().slice(0, 100);
    const deliveryMethod = String(rawDeliveryMethod || "").trim().slice(0, 30);
    const deliveryCity = String(rawDeliveryCity || "").trim().slice(0, 100);
    const deliveryAddress = String(rawDeliveryAddress || "").trim().slice(0, 500);
    const deliveryIndex = String(rawDeliveryIndex || "").trim().slice(0, 10);
    const comment = String(rawComment || "").trim().slice(0, 1000);

    if (!contactName) {
      return NextResponse.json(
        { error: "Имя контакта обязательно" },
        { status: 400 }
      );
    }

    // Delivery validation: only require city for yandex_pvz
    if (deliveryMethod === "yandex_pvz") {
      if (!deliveryCity) {
        return NextResponse.json(
          { error: "Укажите город доставки" },
          { status: 400 }
        );
      }
    }

    // Email format validation
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return NextResponse.json(
        { error: "Некорректный формат email" },
        { status: 400 }
      );
    }

    // Get cart items
    const cartWhere: Record<string, unknown> = {};
    if (userId) {
      cartWhere.userId = userId;
    } else if (sessionId) {
      cartWhere.sessionId = sessionId;
    }

    const cartItems = await prisma.cartItem.findMany({
      where: cartWhere,
      include: {
        product: {
          include: {
            images: {
              orderBy: { order: "asc" },
              take: 1,
            },
            compositeItems: {
              include: {
                child: {
                  include: {
                    images: { orderBy: { order: "asc" }, take: 1 },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (cartItems.length === 0) {
      return NextResponse.json({ error: "Корзина пуста" }, { status: 400 });
    }

    // Calculate total
    let totalAmount = 0;
    const orderItemsData: Array<{
      productId: number;
      productName: string;
      productPrice: number;
      quantity: number;
      compositeItems: string | null;
    }> = [];

    // Build promo-compatible cart item list
    const promoCartItems: CartItemForPromo[] = [];

    for (const item of cartItems) {
      // Cap quantity to stock if stock is tracked
      let qty = item.quantity;
      if (item.product.stockQuantity > 0 && qty > item.product.stockQuantity) {
        console.warn(
          `Stock cap: cart item ${item.id} (product ${item.product.id}) qty ${qty} > stock ${item.product.stockQuantity}, capping`
        );
        qty = item.product.stockQuantity;
      }

      const discountedPrice =
        item.product.basePrice * (1 - item.product.discountPercent / 100);
      totalAmount += discountedPrice * qty;

      let compositeItemsJson: string | null = null;
      if (item.product.type === "composite" && item.product.compositeItems.length > 0) {
        compositeItemsJson = JSON.stringify(
          item.product.compositeItems.map((ci) => ({
            name: ci.child.name,
            price: ci.child.basePrice * (1 - ci.child.discountPercent / 100),
            quantity: ci.quantity,
          }))
        );
      }

      orderItemsData.push({
        productId: item.product.id,
        productName: item.product.name,
        productPrice: Math.round(discountedPrice * 100) / 100,
        quantity: qty,
        compositeItems: compositeItemsJson,
      });

      promoCartItems.push({
        productId: item.product.id,
        basePrice: item.product.basePrice,
        discountPercent: item.product.discountPercent,
        quantity: qty,
        name: item.product.name,
        categoryId: item.product.categoryId ?? 0,
      });
    }

    totalAmount = Math.round(totalAmount * 100) / 100;

    // ── Validate and apply promo code server-side ──
    let discount = 0;
    let promoCodeId: number | null = null;
    let promoCodeRecord: Awaited<ReturnType<typeof prisma.promoCode.findFirst>> | null = null;

    if (promoCodeInput) {
      promoCodeRecord = await prisma.promoCode.findFirst({
        where: { code: String(promoCodeInput).trim().toUpperCase() },
      });

      if (promoCodeRecord) {
        const now = new Date();
        const isValid =
          promoCodeRecord.isActive &&
          (!promoCodeRecord.validFrom || now >= promoCodeRecord.validFrom) &&
          (!promoCodeRecord.validUntil || now <= promoCodeRecord.validUntil) &&
          (!promoCodeRecord.maxTotalUses || promoCodeRecord.currentUses < promoCodeRecord.maxTotalUses);

        if (isValid) {
          if (promoCodeRecord.maxUsesPerUser && userId) {
            const userUses = await prisma.promoCodeUse.count({
              where: { promoCodeId: promoCodeRecord.id, userId },
            });
            if (userUses >= promoCodeRecord.maxUsesPerUser) {
              return NextResponse.json(
                { error: "Вы уже использовали этот промокод максимальное количество раз" },
                { status: 400 }
              );
            }
          }

          const condResult = checkConditions(
            {
              requiredProductIds: (promoCodeRecord.requiredProductIds as number[]) || [],
              requiredCategoryIds: (promoCodeRecord.requiredCategoryIds as number[]) || [],
              requiredMinQuantity: (promoCodeRecord.requiredMinQuantity as Record<string, unknown>) || {},
              conditionMode: promoCodeRecord.conditionMode || "all",
              minOrderAmount: promoCodeRecord.minOrderAmount,
            },
            promoCartItems
          );

          if (!condResult.met) {
            return NextResponse.json(
              { error: `Условия промокода не выполнены: ${condResult.unmet.join("; ")}` },
              { status: 400 }
            );
          }

          if (promoCodeRecord.scope !== "gift") {
            discount = calculateDiscount(
              {
                scope: promoCodeRecord.scope,
                discountType: promoCodeRecord.discountType,
                discountValue: promoCodeRecord.discountValue,
                maxDiscount: promoCodeRecord.maxDiscount,
                productIds: (promoCodeRecord.productIds as number[]) || [],
                categoryIds: (promoCodeRecord.categoryIds as number[]) || [],
              },
              promoCartItems,
              totalAmount
            );
          }

          if (promoCodeRecord.scope === "gift" && promoCodeRecord.productIds.length > 0) {
            const giftProduct = await prisma.product.findUnique({
              where: { id: promoCodeRecord.productIds[0] },
              include: { images: { orderBy: { order: "asc" }, take: 1 } },
            });
            if (giftProduct) {
              orderItemsData.push({
                productId: giftProduct.id,
                productName: `${giftProduct.name} (подарок)`,
                productPrice: 0,
                quantity: 1,
                compositeItems: null,
              });
            }
          }

          promoCodeId = promoCodeRecord.id;
        }
      }
    }

    const finalTotal = Math.round((totalAmount - discount) * 100) / 100;

    // Create order in a transaction
    const order = await prisma.$transaction(async (tx) => {
      const catalogOrder = await tx.catalogOrder.create({
        data: {
          totalAmount: finalTotal,
          discount,
          contactName,
          contactPhone: contactPhone || null,
          contactEmail: contactEmail || null,
          contactTelegram: contactTelegram || null,
          deliveryMethod: deliveryMethod || null,
          deliveryCity: deliveryCity || null,
          deliveryAddress: deliveryAddress || null,
          deliveryIndex: deliveryIndex || null,
          comment: comment || null,
          userId,
          promoCodeId,
          items: {
            create: orderItemsData,
          },
        },
        include: { items: true },
      });

      if (promoCodeId && promoCodeRecord) {
        await tx.promoCode.update({
          where: { id: promoCodeId },
          data: { currentUses: { increment: 1 } },
        });

        await tx.promoCodeUse.create({
          data: {
            promoCodeId,
            userId: userId ?? undefined,
            sessionId: sessionId ?? undefined,
            orderId: catalogOrder.id,
            discount,
          },
        });
      }

      await tx.cartItem.deleteMany({
        where: cartWhere,
      });

      return catalogOrder;
    });

    // Send confirmation email (fire-and-forget, non-blocking)
    if (contactEmail) {
      sendOrderConfirmation({
        to: contactEmail,
        customerName: contactName,
        orderId: order.id,
        totalAmount: finalTotal,
        items: orderItemsData.map((item) => ({
          name: item.productName,
          price: item.productPrice,
          quantity: item.quantity,
        })),
        discount: discount || undefined,
      }).catch(() => {});
    }

    const response = NextResponse.json(order, { status: 201 });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Failed to create order:", error);
    return NextResponse.json(
      { error: "Не удалось оформить заказ" },
      { status: 500 }
    );
  }
}
