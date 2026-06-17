import type { Metadata } from "next";
import {
  Truck,
  Package,
  MapPin,
  CreditCard,
  Smartphone,
  ArrowLeftRight,
  Clock,
  MessageCircle,
  ChevronRight,
} from "lucide-react";
import PvzDelivery from "@/components/catalog/PvzDelivery";
import MapWidget from "./MapWidget";

export const metadata: Metadata = {
  title: "Доставка и оплата",
  description:
    "Условия доставки и оплаты в магазине 5 минут тишины. Доставка через ПВЗ Яндекс.Маркет и самовывоз.",
  openGraph: {
    title: "Доставка и оплата — 5 минут тишины",
    description: "Узнайте об условиях доставки и способах оплаты.",
  },
};

const SHIPPING = [
  {
    icon: Package,
    name: "ПВЗ Яндекс.Маркет",
    time: "2\u20135 \u0434\u043d\u0435\u0439",
    price: "250 \u20BD",
    desc: "Доставка до пункта выдачи — более 3000 ПВЗ по России",
    color: "text-rose-500",
    bg: "bg-rose-50",
    badge: "Популярный",
    badgeColor: "bg-rose-500 text-white",
  },
  {
    icon: MapPin,
    name: "Самовывоз",
    time: "1\u20132 \u0434\u043d\u044f",
    price: "Бесплатно",
    desc: "Забрать заказ лично — напишите в Telegram для координации",
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    badge: "Быстро и бесплатно",
    badgeColor: "bg-emerald-500 text-white",
  },
];

const PAYMENT = [
  {
    icon: CreditCard,
    name: "Перевод на карту",
    desc: "СберБанк, Тинькофф, Альфа-Банк",
    color: "text-violet-500",
    bg: "bg-violet-50",
  },
  {
    icon: Smartphone,
    name: "СБП (Система быстрых платежей)",
    desc: "Мгновенный перевод по номеру телефона",
    color: "text-sky-500",
    bg: "bg-sky-50",
  },
];

const RETURNS = [
  "Если изделие не подошло — напишите нам в Telegram в течение 3 дней после получения.",
  "Индивидуальные изделия (с именем, кастомными цветами) обмену и возврату не подлежат.",
  "Возврат средств производится на карту в течение 5 рабочих дней после получения изделия.",
];

export default function DeliveryPage() {
  return (
    <div className="home-page-root min-h-screen bg-[#FFF8F5]">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <a href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </a>
          <h1 className="text-lg font-bold text-gray-800">Доставка и оплата</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Shipping */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
            <Truck size={20} className="text-rose-400" />
            Доставка
          </h2>
          <div className="space-y-3">
            {SHIPPING.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.name} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
                  <div className={`w-11 h-11 ${s.bg} rounded-xl flex items-center justify-center shrink-0`}>
                    <Icon size={22} className={s.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-800 text-sm">{s.name}</h3>
                      {s.badge && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.badgeColor}`}>
                          {s.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-gray-800">{s.price}</div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 justify-end mt-0.5">
                      <Clock size={12} />
                      {s.time}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* PVZ Map Widget */}
        <PvzDelivery />

        {/* Payment */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
            <CreditCard size={20} className="text-rose-400" />
            Оплата
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PAYMENT.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.name} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className={`w-10 h-10 ${p.bg} rounded-xl flex items-center justify-center mb-3`}>
                    <Icon size={20} className={p.color} />
                  </div>
                  <h3 className="font-bold text-gray-800 text-sm">{p.name}</h3>
                  <p className="text-xs text-gray-400 mt-1">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Returns */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
            <ArrowLeftRight size={20} className="text-rose-400" />
            Возврат и обмен
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <ol className="space-y-4">
              {RETURNS.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-gray-600 text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Help CTA */}
        <section className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-6 border border-rose-100 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-gray-800 mb-1">Остались вопросы?</h3>
            <p className="text-sm text-gray-500">Мы всегда на связи и поможем разобраться.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <a
              href="https://t.me/karinavoronova"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-500 text-white rounded-xl font-semibold text-sm hover:bg-rose-600 transition-colors"
            >
              <MessageCircle size={16} />
              Telegram
            </a>
          </div>
        </section>

        {/* Yandex Map (#14) */}
        <MapWidget />
      </div>
    </div>
  );
}
