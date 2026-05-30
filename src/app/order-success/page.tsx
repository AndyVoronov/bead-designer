"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

export default function OrderSuccessPage() {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const id = sessionStorage.getItem("last-order-id");
    setOrderId(id);
  }, []);

  if (!mounted) {
    return (
      <div className="home-page-root min-h-screen bg-[#FFF8F5] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!orderId) {
    return (
      <div className="home-page-root min-h-screen bg-[#FFF8F5] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-500 mb-2">Заказ не найден</h1>
          <p className="text-sm text-gray-400 mb-6">Возможно, вы перешли по прямой ссылке</p>
          <Link href="/catalog" className="inline-flex items-center gap-2 px-6 py-2.5 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition-colors">
            Перейти в каталог
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page-root min-h-screen bg-[#FFF8F5]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-800">Заказ оформлен</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Success icon + order number */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Спасибо за заказ!</h2>
          <p className="text-gray-500">
            Заказ <span className="font-bold text-gray-700">#{orderId}</span> успешно создан
          </p>
        </div>

        {/* Info cards */}
        <div className="space-y-3 mb-8">
          {/* What happens next */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Что дальше?</h3>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                <span className="text-sm text-gray-600">Мы проверим заказ и свяжемся с вами для подтверждения (в Telegram или по телефону)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                <span className="text-sm text-gray-600">После подтверждения заказ будет отправлен в течение 1–2 рабочих дней</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                <span className="text-sm text-gray-600">Вы получите уведомление с трек-номером для отслеживания доставки</span>
              </li>
            </ol>
          </div>

          {/* Payment info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Оплата</h3>
            <p className="text-sm text-gray-600">Оплата производится после подтверждения заказа. Мы отправим реквизиты для перевода (СБП или на карту).</p>
          </div>

          {/* Estimated delivery */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Сроки доставки</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0">
                <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
                <polyline points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
              Доставка по России: 2–7 дней после отправки
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-5 border border-rose-100 mb-8 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-gray-800 mb-1">Остались вопросы?</h3>
            <p className="text-sm text-gray-500">Напишите нам — ответим в течение часа</p>
          </div>
          <a
            href="https://t.me/karinavoronova"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-500 text-white rounded-xl font-semibold text-sm hover:bg-rose-600 transition-colors shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
            Telegram
          </a>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/catalog"
            className="flex-1 px-6 py-3 bg-rose-500 text-white rounded-xl font-semibold hover:bg-rose-600 transition-colors text-center"
          >
            Продолжить покупки
          </Link>
          <Link
            href="/profile"
            className="flex-1 px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-center"
          >
            Мои заказы
          </Link>
          <Link
            href="/"
            className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-center"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
