"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/ToastProvider";

const STORAGE_KEY = "exit_promo_shown";
const STORAGE_PROMO_KEY = "exit_promo_code";

export function ExitIntentPopup() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  // Restore previously saved promo code
  useEffect(() => {
    try {
      const savedCode = localStorage.getItem(STORAGE_PROMO_KEY);
      if (savedCode) setPromoCode(savedCode);
    } catch {}
  }, []);

  const handleExit = useCallback(() => {
    if (dismissed) return;
    const shown = localStorage.getItem(STORAGE_KEY);
    if (shown) return;
    setVisible(true);
  }, [dismissed]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (e.clientY <= 0) handleExit();
    };
    document.addEventListener("mouseout", handler);
    return () => document.removeEventListener("mouseout", handler);
  }, [handleExit]);

  const dismiss = () => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      // Subscribe to newsletter
      const subRes = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "exit-intent" }),
      });

      // Generate promo code on server
      const promoRes = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: `WELCOME${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          scope: "cart",
          discountPercent: 10,
          description: "Скидка 10% за подписку",
          isActive: true,
          maxUses: 100,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });

      let code = "";
      if (promoRes.ok) {
        const data = await promoRes.json();
        code = data.code || "";
      }

      if (code) {
        setPromoCode(code);
        localStorage.setItem(STORAGE_PROMO_KEY, code);
      }
      dismiss();
      toast.success(code ? "Промокод сохранён!" : "Вы подписались на рассылку!");
    } catch {
      toast.error("Ошибка, попробуйте ещё раз");
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => e.target === e.currentTarget && dismiss()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 to-rose-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Подождите! 🛍️</h3>
              <p className="text-sm text-rose-100 mt-0.5">У нас для вас есть подарок</p>
            </div>
            <button
              onClick={dismiss}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center cursor-pointer transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {promoCode ? (
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-3">Ваш промокод на скидку 10%:</p>
              <div className="bg-rose-50 border-2 border-dashed border-rose-300 rounded-xl px-4 py-3 mb-3">
                <span className="text-2xl font-bold text-rose-600 tracking-wider">{promoCode}</span>
              </div>
              <p className="text-xs text-gray-400">Скопируйте и вставьте в корзине при оформлении заказа</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="text-sm text-gray-600 mb-4">
                Получите <span className="font-bold text-rose-500">скидку 10%</span> на первый заказ, подписавшись на наши новости и новинки
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ваш email"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent bg-gray-50 mb-3"
              />
              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="w-full py-3 bg-rose-500 text-white rounded-xl font-semibold hover:bg-rose-600 transition-colors text-sm disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Подписка..." : "Получить скидку 10%"}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="w-full mt-2 py-2 text-sm text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-none"
              >
                Нет, спасибо
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
