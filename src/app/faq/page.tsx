"use client";

import { useState } from "react";
import {
  ChevronDown,
  HelpCircle,
  MessageCircle,
  Puzzle,
  Shield,
  Truck,
  Sparkles,
  Heart,
  Clock,
  Gift,
} from "lucide-react";
import { FAQJsonLd } from "@/components/seo/JsonLd";

const FAQS = [
  {
    icon: Puzzle,
    q: "Из чего сделаны бусины?",
    a: "Мы используем натуральное буковое дерево, пищевой силикон и ABS-пластик без бисфенола А. Все материалы сертифицированы и безопасны для детей.",
  },
  {
    icon: Sparkles,
    q: "Как ухаживать за изделием?",
    a: "Деревянные бусины протирайте влажной тканью. Силиконовые можно мыть тёплой водой с мылом. Вязаные игрушки — стирка при 30°C на деликатном режиме.",
  },
  {
    icon: Heart,
    q: "Можно ли заказать индивидуальный дизайн?",
    a: "Да! Используйте наш 3D-конструктор, чтобы собрать уникальный держатель или браслет. Или напишите нам в Telegram — мы подберём цвета и материалы под ваш запрос.",
  },
  {
    icon: Shield,
    q: "Безопасно ли изделие для ребёнка?",
    a: "Все изделия собираются из проверенных материалов. Нить крепкая, не рвётся при обычном использовании. Клипса открывается только взрослым — ребёнок не сможет снять изделие самостоятельно.",
  },
  {
    icon: Truck,
    q: "Сколько идёт доставка?",
    a: "Москва — 1–2 дня курьером. Россия — 3–14 дней (СДЭК или Почта). Точный срок рассчитаем при оформлении заказа.",
  },
  {
    icon: Clock,
    q: "Можно ли вернуть изделие?",
    a: "Да, в течение 3 дней после получения (кроме индивидуальных изделий с именем). Напишите нам в Telegram, и мы решим вопрос.",
  },
  {
    icon: Gift,
    q: "Подходит ли для подарка?",
    a: "Конечно! Многие наши клиенты заказывают изделия как подарок на выписку, крещение или день рождения. Красивая упаковка включена.",
  },
  {
    icon: Puzzle,
    q: "Как сделать заказ через 3D-конструктор?",
    a: "Откройте раздел «Конструктор», выберите бусины и расположите их на нити. Когда дизайн готов — нажмите «Заказать». Мы свяжемся с вами для подтверждения.",
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="home-page-root min-h-screen bg-[#FFF8F5]">
      <FAQJsonLd faqs={FAQS.map((f) => ({ q: f.q, a: f.a }))} />
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <a href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </a>
          <h1 className="text-lg font-bold text-gray-800">Частые вопросы</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <HelpCircle size={24} className="text-rose-400" />
            Частые вопросы
          </h2>
          <p className="text-gray-500 text-sm">
            Ответы на самые популярные вопросы о наших изделиях, доставке и заказах.
          </p>
        </div>

        {/* FAQ accordion */}
        <div className="space-y-2">
          {FAQS.map((faq, index) => {
            const Icon = faq.icon;
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.q}
                className={`bg-white rounded-2xl border shadow-sm transition-all duration-200 ${
                  isOpen ? "border-rose-200 shadow-md" : "border-gray-100"
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                  id={`faq-question-${index}`}
                  className="w-full px-5 py-4 flex items-center gap-3 text-left cursor-pointer"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isOpen ? "bg-rose-50" : "bg-gray-50"
                  }`}>
                    <Icon size={18} className={isOpen ? "text-rose-500" : "text-gray-400"} />
                  </div>
                  <span className={`font-semibold text-sm flex-1 transition-colors ${
                    isOpen ? "text-rose-600" : "text-gray-800"
                  }`}>
                    {faq.q}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`text-gray-400 transition-transform duration-200 shrink-0 ${
                      isOpen ? "rotate-180 text-rose-400" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div
                    id={`faq-answer-${index}`}
                    role="region"
                    aria-labelledby={`faq-question-${index}`}
                    className="px-5 pb-4 text-gray-600 text-sm leading-relaxed border-t border-gray-50 pt-3 ml-12"
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Contact CTA */}
        <div className="mt-10 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-6 md:p-8 text-white flex flex-col sm:flex-row items-center gap-5">
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-bold text-lg mb-1">Не нашли ответ?</h3>
            <p className="text-rose-100 text-sm">
              Напишите нам в Telegram — ответим в течение часа.
            </p>
          </div>
          <a
            href="https://t.me/karinavoronova"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2.5 px-6 py-3 bg-white text-rose-600 rounded-xl font-semibold hover:bg-rose-50 transition-colors shadow-md shrink-0"
          >
            <MessageCircle size={18} />
            Написать
          </a>
        </div>
      </div>
    </div>
  );
}
