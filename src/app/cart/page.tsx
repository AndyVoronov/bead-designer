"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCartCount } from "@/hooks/useCartCount";
import { getEffectivePrice, formatPrice } from "@/lib/catalog-utils";
import { getDeliveryCost, getAllDeliveryOptions } from "@/lib/delivery-cost";
import { useToast } from "@/components/ui/ToastProvider";

import dynamic from "next/dynamic";
import type { CartItemType } from "@/types/catalog";

const PvzWidget = dynamic(() => import("@/components/catalog/PvzWidget"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[200px] bg-gray-50 rounded-xl">
      <div className="w-6 h-6 border-2 border-gray-200 border-t-rose-500 rounded-full animate-spin" />
    </div>
  ),
});

/* ── Free Shipping Progress Bar (#8) ──────────────────────────────────── */

const FREE_SHIPPING_THRESHOLD = 3000;

function ShippingProgressBar({ total }: { total: number }) {
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - total);
  const progress = Math.min(100, (total / FREE_SHIPPING_THRESHOLD) * 100);
  const isFree = total >= FREE_SHIPPING_THRESHOLD;

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-xs font-medium ${isFree ? "text-emerald-600" : "text-gray-500"}`}>
          {isFree ? (
            <span className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Бесплатная доставка!
            </span>
          ) : (
            <>До бесплатной доставки осталось {formatPrice(remaining)}</>
          )}
        </span>
        <span className="text-xs text-gray-400">{formatPrice(FREE_SHIPPING_THRESHOLD)}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isFree ? "bg-emerald-500" : "bg-rose-400"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/* ── Types ────────────────────────────────────────────────────────────── */

interface CartProduct {
  id: number;
  name: string;
  slug: string;
  basePrice: number;
  discountPercent: number;
  mainImage: { id: number; url: string } | null;
  categoryId: number | null;
}

interface CartItem {
  id: number;
  productId: number;
  quantity: number;
  product: CartProduct;
}

interface CartResponse {
  items: CartItem[];
  total: number;
}

interface CheckoutFormData {
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  contactTelegram: string;
  deliveryMethod: string;
  deliveryCity: string;
  deliveryAddress: string;
  deliveryIndex: string;
  comment: string;
  privacyConsent: boolean;
}

interface PromoState {
  code: string;
  discount: number;
  finalTotal: number;
  description: string | null;
  scope: string;
  gift?: {
    productId: number;
    name: string;
    slug: string;
    originalPrice: number;
    giftPrice: number;
    savings: number;
    isFree: boolean;
    mainImage: { id: number; url: string } | null;
    category: { id: number; name: string; slug: string } | null;
  };
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function CartPage() {
  const toast = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuth, setIsAuth] = useState(false);

  // Check auth state
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        setIsAuth(!!s?.user);
        if (s?.user) {
          setForm((prev) => ({
            ...prev,
            contactName: prev.contactName || s.user.name || "",
          }));
        }
      })
      .catch(() => {});
  }, []);

  const [form, setForm] = useState<CheckoutFormData>({
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    contactTelegram: "",
    deliveryMethod: "yandex_pvz",
    deliveryCity: "",
    deliveryAddress: "",
    deliveryIndex: "",
    comment: "",
    privacyConsent: false,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string | boolean>>({});
  const [showPvzWidget, setShowPvzWidget] = useState(false);
  const [pvzAddress, setPvzAddress] = useState("");

  // Two-step mobile checkout
  const [checkoutStep, setCheckoutStep] = useState<1 | 2>(1);

  // Promo code
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<PromoState | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoUnmet, setPromoUnmet] = useState<string[] | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  // Fetch cart
  const fetchCart = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cart");
      if (res.ok) {
        const data: CartResponse = await res.json();
        setItems(data.items);
        setTotal(data.total);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Re-validate promo code when cart total changes (e.g. after quantity update)
  useEffect(() => {
    if (promo && !loading && items.length > 0) {
      const timer = setTimeout(() => {
        applyPromo();
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  // Apply promo code
  const applyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const cartItems = items.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        categoryId: item.product.categoryId,
        basePrice: item.product.basePrice,
        discountPercent: item.product.discountPercent,
        quantity: item.quantity,
      }));

      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoInput.trim(), cartItems }),
      });

      const data = await res.json();

      if (data.valid) {
        setPromo({
          code: data.code,
          discount: data.discount || 0,
          finalTotal: data.finalTotal || 0,
          description: data.description,
          scope: data.scope,
          gift: data.gift || undefined,
        });
      } else {
        setPromoError(data.error || "Промокод недействителен");
        setPromoUnmet(data.unmetConditions || null);
        setPromo(null);
      }
    } catch {
      setPromoError("Ошибка при проверке промокода");
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromo = () => {
    setPromo(null);
    setPromoInput("");
    setPromoError(null);
    setPromoUnmet(null);
  };

  // PVZ point selection from widget
  const handlePvzSelect = useCallback((data: {
    id: string;
    fullAddress: string;
    locality: string;
    street: string;
    house: string;
  }) => {
    const address = data.fullAddress || `${data.locality}, ${data.street}${data.house ? `, ${data.house}` : ""}`;
    setPvzAddress(address);
    setForm((prev) => ({
      ...prev,
      deliveryAddress: address,
      deliveryCity: data.locality || prev.deliveryCity,
    }));
    setShowPvzWidget(false);
  }, []);

  // Update quantity
  const updateQuantity = async (itemId: number, quantity: number) => {
    if (quantity < 1 || quantity > 99) return;
    try {
      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, quantity }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, quantity } : item
          )
        );
        // Recalculate total
        setItems((prev) => {
          const newTotal = prev.reduce(
            (sum, item) =>
              sum +
              getEffectivePrice(
                item.product.basePrice,
                item.product.discountPercent
              ) *
                item.quantity,
            0
          );
          setTotal(Math.round(newTotal * 100) / 100);
          return prev;
        });
      }
    } catch {
      /* ignore */
    }
  };

  // Remove item with undo (#13)
  const removeItem = async (itemId: number, itemName?: string) => {
    // Find item data before removing
    const itemData = items.find((i) => i.id === itemId);
    if (!itemData) return;

    try {
      const res = await fetch("/api/cart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      if (res.ok) {
        setItems((prev) => {
          const newItems = prev.filter((item) => item.id !== itemId);
          const newTotal = newItems.reduce(
            (sum, item) =>
              sum +
              getEffectivePrice(
                item.product.basePrice,
                item.product.discountPercent
              ) *
                item.quantity,
            0
          );
          setTotal(Math.round(newTotal * 100) / 100);
          return newItems;
        });
        // Reset mobile step to 1 when item removed
        setCheckoutStep(1);
        // Show undo toast
        toast.info(`"${itemData.product.name}" удалён`, {
          action: {
            label: "Отменить",
            onClick: async () => {
              // Re-add the item
              try {
                await fetch("/api/cart", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ productId: itemData.productId, quantity: itemData.quantity }),
                });
                setItems((prev) => [...prev, itemData]);
                const newTotal = total + getEffectivePrice(itemData.product.basePrice, itemData.product.discountPercent) * itemData.quantity;
                setTotal(Math.round(newTotal * 100) / 100);
                fetchCart();
              } catch {
                /* ignore */
              }
            },
          },
        });
      }
    } catch {
      /* ignore */
    }
  };

  // Form field change
  const handleFormChange = (field: keyof CheckoutFormData, value: string) => {
    // Auto-format phone number
    if (field === "contactPhone") {
      const digits = value.replace(/\D/g, "");
      if (digits.length === 0) {
        setForm((prev) => ({ ...prev, contactPhone: "" }));
      } else {
        let formatted = digits;
        if (digits[0] === "7" || digits[0] === "8") {
          formatted = digits.slice(0, 11);
        } else if (digits[0] !== "7") {
          formatted = "7" + digits.slice(0, 10);
        }
        const d = formatted;
        let display = "";
        if (d.length > 0) display += `+${d[0]}`;
        if (d.length > 1) display += ` (${d.slice(1, 4)}`;
        if (d.length > 4) display += `) ${d.slice(4, 7)}`;
        if (d.length > 7) display += `-${d.slice(7, 9)}`;
        if (d.length > 9) display += `-${d.slice(9, 11)}`;
        setForm((prev) => ({ ...prev, contactPhone: display }));
      }
      if (formErrors[field]) {
        const next = { ...formErrors };
        delete next[field];
        setFormErrors(next);
      }
      return;
    }
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      const next = { ...formErrors };
      delete next[field];
      setFormErrors(next);
    }
  };

  // Checkout
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    const errors: Record<string, string> = {};
    if (!form.contactName.trim()) errors.contactName = "Введите имя";

    // Email validation (optional but if provided must match format)
    if (form.contactEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.contactEmail.trim())) {
        errors.contactEmail = "Введите корректный email";
      }
    }

    // Privacy consent required
    if (!form.privacyConsent) {
      errors["privacyError"] = "Необходимо согласие";
    }

    // Phone validation (optional but if provided must match format)
    if (form.contactPhone.trim()) {
      const digits = form.contactPhone.replace(/\D/g, "");
      if (digits.length < 10) {
        errors.contactPhone = "Введите корректный номер телефона";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (items.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/cart/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          promoCode: promo?.code || null,
        }),
      });

      if (res.ok) {
        const order = await res.json();
        setOrderId(order.id);
        setItems([]);
        setTotal(0);
        removePromo();
        toast.success("Заказ успешно оформлен!");
        // Save order ID and redirect
        sessionStorage.setItem("last-order-id", String(order.id));
        window.location.href = "/order-success";
        return;
      } else {
        const data = await res.json();
        setError(data.error || "Не удалось оформить заказ");
        toast.error(data.error || "Ошибка оформления заказа");
      }
    } catch {
      setError("Ошибка при оформлении заказа");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Loading ───────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="home-page-root min-h-screen bg-[#FFF8F5]">
        <PageHeader title="Корзина" maxWidth="max-w-5xl" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-gray-100 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 bg-gray-100 rounded" />
                  <div className="h-4 w-1/4 bg-gray-100 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Order success ─────────────────────────────────────────────────── */

  if (orderId) {
    return (
      <div className="home-page-root min-h-screen bg-[#FFF8F5] flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Заказ оформлен!</h2>
          <p className="text-gray-500 mb-1">Ваш заказ №{orderId} успешно создан.</p>
          <p className="text-sm text-gray-400 mb-6">
            Мы свяжемся с вами для подтверждения.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/catalog"
              className="px-6 py-2.5 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition-colors text-center"
            >
              Продолжить покупки
            </Link>
            <Link
              href="/"
              className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors text-center"
            >
              На главную
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Empty cart ────────────────────────────────────────────────────── */

  if (items.length === 0) {
    return (
      <div className="home-page-root min-h-screen bg-[#FFF8F5]">
        <PageHeader title="Корзина" maxWidth="max-w-5xl" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 text-center">
          <svg className="w-28 h-28 text-gray-200 mx-auto mb-6" viewBox="0 0 100 100" fill="none">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" transform="scale(2.5) translate(5,5)" stroke="#e5e7eb" strokeWidth="1" fill="none" />
            <path d="M16 10a4 4 0 0 1-8 0" transform="scale(2.5) translate(5,5)" stroke="#e5e7eb" strokeWidth="1" fill="none" />
          </svg>
          <h2 className="text-xl font-bold text-gray-400 mb-2">Корзина пуста</h2>
          <p className="text-sm text-gray-400 mb-6">Добавьте товары из каталога</p>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Перейти в каталог
          </Link>
        </div>
      </div>
    );
  }

  /* ── Render ────────────────────────────────────────────────────────── */

  return (
    <div className="home-page-root min-h-screen bg-[#FFF8F5]">
      {/* Header */}
      <PageHeader
        title="Корзина"
        subtitle={`${items.length} ${items.length === 1 ? "товар" : items.length < 5 ? "товара" : "товаров"}`}
        maxWidth="max-w-5xl"
      >
        <Link
          href="/catalog"
          className="text-sm text-rose-500 hover:text-rose-600 font-medium transition-colors"
        >
          Продолжить покупки
        </Link>
      </PageHeader>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Sign in to save cart prompt */}
        {!isAuth && items.length > 0 && (
          <div className="mb-4 flex items-center gap-3 bg-rose-50 rounded-xl px-4 py-3 border border-rose-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500 shrink-0">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <p className="text-sm text-rose-700 flex-1">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("auth-required"))}
                className="font-semibold underline cursor-pointer hover:text-rose-800"
              >
                Войдите
              </button>
              , чтобы сохранить корзину и отслеживать заказы
            </p>
          </div>
        )}

        {/* Mobile step indicator */}
        <div className="md:hidden flex items-center justify-center gap-4 mb-4">
          <button
            onClick={() => setCheckoutStep(1)}
            type="button"
            className={`flex items-center gap-2 text-sm font-medium ${checkoutStep === 1 ? 'text-rose-500' : 'text-gray-400'}`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${checkoutStep === 1 ? 'bg-rose-500 text-white' : 'bg-gray-200 text-gray-500'}`}>1</span>
            Товары
          </button>
          <div className="w-8 h-px bg-gray-200" />
          <button
            onClick={() => checkoutStep === 2 || (items.length > 0 && setCheckoutStep(2))}
            type="button"
            className={`flex items-center gap-2 text-sm font-medium ${checkoutStep === 2 ? 'text-rose-500' : 'text-gray-400'} ${items.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={items.length === 0}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${checkoutStep === 2 ? 'bg-rose-500 text-white' : 'bg-gray-200 text-gray-500'}`}>2</span>
            Оформление
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cart items — visible on mobile step 1, always visible on md+ */}
          <div className={`lg:col-span-2 space-y-3 ${checkoutStep === 1 ? 'block' : 'hidden md:block'}`}>
            {items.map((item) => {
              const price = getEffectivePrice(
                item.product.basePrice,
                item.product.discountPercent
              );
              const lineTotal = price * item.quantity;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex gap-4 group"
                >
                  {/* Image */}
                  <Link
                    href={`/catalog/${item.product.slug}`}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-gray-50 shrink-0 relative"
                  >
                    {item.product.mainImage ? (
                      <Image
                        src={`/api${item.product.mainImage.url}`}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 text-gray-300">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <span className="text-[9px] mt-1 text-gray-400">Фото скоро</span>
                      </div>
                    )}
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <Link
                        href={`/catalog/${item.product.slug}`}
                        className="text-sm sm:text-base font-semibold text-gray-800 hover:text-rose-500 transition-colors line-clamp-2"
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {formatPrice(price)} за шт.
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      {/* Quantity controls */}
                      <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200">
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                          className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-rose-500 transition-colors disabled:opacity-30 cursor-pointer"
                          aria-label="Уменьшить"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </button>
                        <span className="w-10 text-center text-sm font-semibold text-gray-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          disabled={item.quantity >= 99}
                          className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-rose-500 transition-colors disabled:opacity-30 cursor-pointer"
                          aria-label="Увеличить"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm sm:text-base font-bold text-gray-800">
                          {formatPrice(lineTotal)}
                        </span>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="w-11 h-11 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          aria-label="Удалить"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Mobile "Next" button at bottom of step 1 */}
            <button
              type="button"
              onClick={() => setCheckoutStep(2)}
              disabled={items.length === 0}
              className="md:hidden w-full py-3 bg-rose-500 text-white rounded-xl font-semibold hover:bg-rose-600 transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-default cursor-pointer text-sm"
            >
              Далее — Оформление
            </button>
          </div>

          {/* Order summary & checkout — visible on mobile step 2, always visible on md+ */}
          <div className={`lg:col-span-1 ${checkoutStep === 2 ? 'block' : 'hidden md:block'}`}>
            {/* Mobile "Back" button at top of step 2 */}
            <button
              type="button"
              onClick={() => setCheckoutStep(1)}
              className="md:hidden flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-rose-500 transition-colors mb-3 cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Назад к товарам
            </button>
            <div className="sticky top-20 bg-white rounded-2xl border border-gray-100 shadow-sm p-5" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))' }}>
              <h2 className="text-base font-bold text-gray-800 mb-4">
                Оформление заказа
              </h2>

              <form onSubmit={handleCheckout} className="space-y-3">
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Имя <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.contactName}
                    onChange={(e) => handleFormChange("contactName", e.target.value)}
                    placeholder="Ваше имя"
                    className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent bg-gray-50 ${
                      formErrors.contactName
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200"
                    }`}
                  />
                  {formErrors.contactName && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.contactName}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Телефон
                  </label>
                  <input
                    type="tel"
                    value={form.contactPhone}
                    onChange={(e) => handleFormChange("contactPhone", e.target.value)}
                    placeholder="+7 (___) ___-__-__"
                    className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent bg-gray-50 ${
                      formErrors.contactPhone
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200"
                    }`}
                  />
                  {formErrors.contactPhone && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.contactPhone}
                    </p>
                  )}
                </div>

                {/* Telegram */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Telegram
                  </label>
                  <input
                    type="text"
                    value={form.contactTelegram}
                    onChange={(e) =>
                      handleFormChange("contactTelegram", e.target.value)
                    }
                    placeholder="@username"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent bg-gray-50"
                  />
                </div>

                {/* Email (optional) */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Email
                    <span className="text-gray-400 font-normal"> (для подтверждения)</span>
                  </label>
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) =>
                      handleFormChange("contactEmail", e.target.value)
                    }
                    placeholder="mail@example.com"
                    className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent bg-gray-50 ${
                      formErrors.contactEmail
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200"
                    }`}
                  />
                  {formErrors.contactEmail && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.contactEmail}
                    </p>
                  )}
                </div>

                {/* Delivery method */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Способ доставки <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {getAllDeliveryOptions().map((opt) => (
                      <button
                        key={opt.method}
                        type="button"
                        onClick={() => handleFormChange("deliveryMethod", opt.method)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer border flex flex-col items-center ${
                          form.deliveryMethod === opt.method
                            ? "border-rose-300 bg-rose-50 text-rose-600"
                            : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                        }`}
                        aria-pressed={form.deliveryMethod === opt.method}
                      >
                        <span className="font-semibold">{opt.label}</span>
                        <span className="text-[10px] mt-0.5 opacity-70">
                          {opt.cost === 0 ? "Бесплатно" : `${opt.cost} ₽`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delivery fields for yandex_pvz */}
                {form.deliveryMethod === "yandex_pvz" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Город <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.deliveryCity}
                        onChange={(e) =>
                          handleFormChange("deliveryCity", e.target.value)
                        }
                        placeholder="Москва"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent bg-gray-50"
                      />
                    </div>

                    {/* PVZ selection */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Пункт выдачи
                      </label>
                      {pvzAddress ? (
                        <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 shrink-0" aria-hidden="true">
                            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          <span className="text-xs text-emerald-700 flex-1 line-clamp-1">{pvzAddress}</span>
                          <button
                            type="button"
                            onClick={() => setShowPvzWidget(true)}
                            className="text-xs text-rose-500 font-medium hover:text-rose-600 shrink-0"
                          >
                            Изменить
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowPvzWidget(true)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm border border-dashed border-rose-200 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          Выбрать пункт выдачи на карте
                        </button>
                      )}

                      {/* PVZ Widget */}
                      {showPvzWidget && (
                        <div className="mt-3">
                          <PvzWidget
                            city={form.deliveryCity || "Москва"}
                            onPointSelect={handlePvzSelect}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPvzWidget(false)}
                            className="mt-2 text-xs text-gray-400 hover:text-gray-600"
                          >
                            Скрыть карту
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Comment */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Комментарий
                  </label>
                  <textarea
                    value={form.comment}
                    onChange={(e) => handleFormChange("comment", e.target.value)}
                    placeholder="Пожелания к заказу..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent bg-gray-50 resize-none"
                  />
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100 pt-3">
                  {/* Promo code */}
                  {!promo ? (
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        Промокод
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promoInput}
                          onChange={(e) => {
                            setPromoInput(e.target.value.toUpperCase());
                            setPromoError(null);
                          }}
                          onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                          placeholder="Введите код"
                          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-400 uppercase tracking-wider"
                        />
                        <button
                          type="button"
                          onClick={applyPromo}
                          disabled={promoLoading || !promoInput.trim()}
                          className="px-4 py-2 bg-gray-800 text-white text-sm rounded-xl font-medium hover:bg-gray-900 transition-colors disabled:opacity-40 cursor-pointer shrink-0"
                        >
                          {promoLoading ? "..." : "OK"}
                        </button>
                      </div>
                      {promoError && (
                        <div className="text-xs text-red-500 mt-1">
                          <p>{promoError}</p>
                          {promoUnmet && promoUnmet.length > 0 && (
                            <ul className="mt-1 ml-3 list-disc list-inside space-y-0.5">
                              {promoUnmet.map((c, i) => (
                                <li key={i} className="text-red-400">{c}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`mb-4 rounded-xl p-3 ${
                      promo?.scope === "gift"
                        ? "bg-purple-50 border border-purple-200"
                        : "bg-emerald-50 border border-emerald-200"
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold tracking-wider font-mono ${
                              promo?.scope === "gift" ? "text-purple-700" : "text-emerald-700"
                            }`}>
                              {promo.code}
                            </span>
                            {promo.description && (
                              <span className={`text-xs truncate ${
                                promo.scope === "gift" ? "text-purple-600" : "text-emerald-600"
                              }`}>
                                {promo.description}
                              </span>
                            )}
                          </div>
                          {promo.gift ? (
                            <div className="mt-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">🎁</span>
                                <Link
                                  href={`/catalog/${promo.gift.slug}`}
                                  className="text-sm font-semibold text-purple-700 hover:text-purple-800 transition-colors"
                                >
                                  {promo.gift.name}
                                </Link>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-xs">
                                {promo.gift.isFree ? (
                                  <span className="font-bold text-purple-600">Бесплатно!</span>
                                ) : (
                                  <span className="text-purple-600">
                                    {formatPrice(promo.gift.giftPrice)} вместо {formatPrice(promo.gift.originalPrice)}
                                  </span>
                                )}
                                {!promo.gift.isFree && (
                                  <span className="text-purple-400">
                                    (экономия {formatPrice(promo.gift.savings)})
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-emerald-600 mt-0.5">
                              −{formatPrice(promo.discount)}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={removePromo}
                          className="text-gray-400 hover:text-red-500 transition-colors shrink-0 cursor-pointer mt-0.5"
                          aria-label="Удалить промокод"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Totals */}
                  <div className="space-y-1.5">
                    {/* Free shipping progress bar (#8) */}
                    <ShippingProgressBar total={total} />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Товары:</span>
                      <span className="text-sm text-gray-700">{formatPrice(total)}</span>
                    </div>
                    {/* Delivery cost */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Доставка ({getDeliveryCost(form.deliveryMethod).label}):</span>
                      <span className={`text-sm ${form.deliveryMethod === "pickup" ? "text-emerald-600 font-medium" : "text-gray-700"}`}>
                        {getDeliveryCost(form.deliveryMethod).cost === 0 ? "Бесплатно" : formatPrice(getDeliveryCost(form.deliveryMethod).cost)}
                      </span>
                    </div>
                    {promo && !promo.gift && promo.discount > 0 && (
                      <div className="flex items-center justify-between text-emerald-600">
                        <span className="text-sm">
                          Скидка ({promo.code}):
                        </span>
                        <span className="text-sm font-medium">
                          −{formatPrice(promo.discount)}
                        </span>
                      </div>
                    )}
                    {promo?.gift && (
                      <div className="flex items-center justify-between text-purple-600">
                        <span className="text-sm flex items-center gap-1">
                          🎁 {promo.gift.isFree ? "Подарок" : `Подарок`}: {promo.gift.name}
                        </span>
                        <span className="text-sm font-medium">
                          {promo.gift.isFree
                            ? "Бесплатно"
                            : formatPrice(promo.gift.giftPrice)}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-800">
                        Итого:
                      </span>
                      <span className="text-xl font-bold text-gray-800">
                        {(() => {
                          const deliveryCost = getDeliveryCost(form.deliveryMethod).cost;
                          const goodsTotal = promo && promo.gift
                            ? total + promo.gift.giftPrice
                            : promo
                              ? promo.finalTotal
                              : total;
                          // Free shipping threshold still applies
                          const finalDelivery = goodsTotal >= 3000 ? 0 : deliveryCost;
                          return formatPrice(goodsTotal + finalDelivery);
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Privacy consent */}
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.privacyConsent}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, privacyConsent: e.target.checked }));
                        if (formErrors.privacyError) {
                          const next = { ...formErrors };
                          delete next.privacyError;
                          setFormErrors(next);
                        }
                      }}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-rose-500 focus:ring-rose-400"
                    />
                    <span className="text-xs text-gray-500 leading-relaxed">
                      Согласен(-на) на{" "}
                      <Link
                        href="/privacy"
                        target="_blank"
                        className="text-rose-500 hover:text-rose-600 underline"
                      >
                        обработку персональных данных
                      </Link>
                    </span>
                  </label>
                  {formErrors.privacyError && (
                    <p className="text-xs text-red-500 -mt-1">
                      {formErrors.privacyError}
                    </p>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-rose-500 text-white rounded-xl font-semibold hover:bg-rose-600 transition-all shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-default cursor-pointer text-sm"
                  >
                    {submitting ? (
                      <span className="inline-flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Оформление...
                      </span>
                    ) : (
                      "Оформить заказ"
                    )}
                  </button>
                </div>

                {error && (
                  <p className="text-xs text-red-500 text-center">{error}</p>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
