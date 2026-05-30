/**
 * Shared promo code utilities for discount calculation.
 * Used by /api/promo/validate and /api/cart/checkout.
 */

export interface CartItemForPromo {
  productId: number;
  basePrice: number;
  discountPercent: number;
  quantity: number;
  name?: string;
  categoryId?: number;
  slug?: string;
}

/** Effective price after product-level discount */
export function effectivePrice(item: CartItemForPromo): number {
  return item.basePrice * (1 - (item.discountPercent || 0) / 100);
}

/** Sum of effective prices × quantity for all items */
export function cartTotal(items: CartItemForPromo[]): number {
  return items.reduce((s, i) => s + effectivePrice(i) * i.quantity, 0);
}

/** Check required conditions (products, categories, min qty, min amount) */
export function checkConditions(
  promo: {
    requiredProductIds: number[];
    requiredCategoryIds: number[];
    requiredMinQuantity: Record<string, unknown>;
    conditionMode: string;
    minOrderAmount: number | null;
  },
  cartItems: CartItemForPromo[]
): { met: boolean; unmet: string[] } {
  const unmet: string[] = [];
  const results: boolean[] = [];

  if (promo.requiredProductIds.length > 0) {
    const cartProductIds = new Set(cartItems.map((i) => i.productId));
    const missing = promo.requiredProductIds.filter((id) => !cartProductIds.has(id));
    if (missing.length > 0) {
      unmet.push(`В корзине нет ${missing.length} требуем. товара(ов)`);
      results.push(false);
    } else {
      results.push(true);
    }
  }

  if (promo.requiredCategoryIds.length > 0) {
    const cartCategoryIds = new Set(
      cartItems.filter((i) => i.categoryId).map((i) => i.categoryId!)
    );
    const missingCats = promo.requiredCategoryIds.filter(
      (id) => !cartCategoryIds.has(id)
    );
    if (missingCats.length > 0) {
      unmet.push(`В корзине нет товаров из ${missingCats.length} требуем. категории(й)`);
      results.push(false);
    } else {
      results.push(true);
    }
  }

  const minQty = promo.requiredMinQuantity as Record<string, number> | null;
  if (minQty && typeof minQty === "object" && Object.keys(minQty).length > 0) {
    const qtyMap = new Map<number, number>();
    for (const item of cartItems) {
      qtyMap.set(item.productId, (qtyMap.get(item.productId) || 0) + item.quantity);
    }
    for (const [pidStr, minQ] of Object.entries(minQty)) {
      const pid = Number(pidStr);
      const actual = qtyMap.get(pid) || 0;
      if (actual < minQ) {
        unmet.push(`Товар #${pid}: нужно ${minQ} шт., в корзине ${actual}`);
        results.push(false);
      } else {
        results.push(true);
      }
    }
  }

  if (promo.minOrderAmount && cartItems.length > 0) {
    const total = cartTotal(cartItems);
    if (total < promo.minOrderAmount) {
      unmet.push(`Сумма заказа от ${promo.minOrderAmount} ₽`);
      results.push(false);
    } else {
      results.push(true);
    }
  }

  if (results.length === 0) return { met: true, unmet: [] };

  if (promo.conditionMode === "any") {
    return results.some(Boolean)
      ? { met: true, unmet: [] }
      : { met: false, unmet };
  }

  return results.every(Boolean) ? { met: true, unmet: [] } : { met: false, unmet };
}

/** Calculate discount amount for all scopes (cart, products, categories) */
export function calculateDiscount(
  promo: {
    scope: string;
    discountType: string;
    discountValue: number;
    maxDiscount: number | null;
    productIds: number[];
    categoryIds: number[];
  },
  items: CartItemForPromo[],
  total: number
): number {
  let discount = 0;

  if (promo.scope === "cart") {
    discount =
      promo.discountType === "percent"
        ? (total * promo.discountValue) / 100
        : promo.discountValue;
  } else if (promo.scope === "products") {
    for (const item of items) {
      if (promo.productIds.includes(item.productId)) {
        const eff = effectivePrice(item);
        discount +=
          promo.discountType === "percent"
            ? (eff * item.quantity * promo.discountValue) / 100
            : Math.min(promo.discountValue, eff * item.quantity);
      }
    }
  } else if (promo.scope === "categories") {
    for (const item of items) {
      if (item.categoryId && promo.categoryIds.includes(item.categoryId)) {
        const eff = effectivePrice(item);
        discount +=
          promo.discountType === "percent"
            ? (eff * item.quantity * promo.discountValue) / 100
            : Math.min(promo.discountValue, eff * item.quantity);
      }
    }
  }

  if (promo.maxDiscount && discount > promo.maxDiscount) {
    discount = promo.maxDiscount;
  }
  discount = Math.min(discount, total);
  return Math.round(discount * 100) / 100;
}
