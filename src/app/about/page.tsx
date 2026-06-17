import type { Metadata } from "next";
import {
  TreePine,
  Droplets,
  Shirt,
  Shield,
  Palette,
  Clock,
  HeartHandshake,
  Truck,
  Sparkles,
  Send,
  Gem,
} from "lucide-react";

export const metadata: Metadata = {
  title: "О нас",
  description:
    "5 минут тишины — уникальные игрушки и аксессуары для малышей. Ручная работа из безопасных материалов: дерево, силикон, гипоаллергенный пластик.",
  openGraph: {
    title: "О нас — 5 минут тишины",
    description: "Узнайте больше о нашем магазине детских игрушек и аксессуаров.",
  },
};

const MATERIALS = [
  {
    icon: TreePine,
    name: "Дерево",
    desc: "Натуральное буковое дерево, шлифованное и покрытое безопасным лаком",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    icon: Droplets,
    name: "Силикон",
    desc: "Пищевой силикон, не имеет запаха, безопасен при жевании",
    color: "text-sky-500",
    bg: "bg-sky-50",
  },
  {
    icon: Shirt,
    name: "Пряжа",
    desc: "Гипоаллергенная хлопковая пряжа для вязаных игрушек",
    color: "text-rose-500",
    bg: "bg-rose-50",
  },
  {
    icon: Gem,
    name: "Пластик",
    desc: "ABS-пластик премиум-класса без бисфенола А",
    color: "text-violet-500",
    bg: "bg-violet-50",
  },
];

const ADVANTAGES = [
  { icon: HeartHandshake, text: "Ручная сборка каждого изделия" },
  { icon: Shield, text: "Безопасные материалы без токсичных веществ" },
  { icon: Sparkles, text: "Реалистичный 3D-конструктор — увидите результат до заказа" },
  { icon: Palette, text: "Индивидуальный подход — подберём цвета под ваш стиль" },
  { icon: Truck, text: "Быстрая доставка по всей России" },
  { icon: Clock, text: "Гарантия качества на каждое изделие" },
];

export default function AboutPage() {
  return (
    <div className="home-page-root min-h-screen bg-[#FFF8F5]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <a href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </a>
          <h1 className="text-lg font-bold text-gray-800">О нас</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero */}
        <section className="mb-12">
          <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-3xl p-8 md:p-10 border border-rose-100">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4 leading-tight">
              Мы —&nbsp;
              <span className="text-rose-500 font-hand text-4xl md:text-5xl">
                5 минут тишины
              </span>
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Наш магазин создаёт уникальные игрушки и аксессуары для малышей.
              Каждое изделие собирается вручную из безопасных, проверенных материалов.
              Мы знаем, как важны спокойствие мамы и безопасность ребёнка —
              именно поэтому мы называем наш магазин «5 минут тишины».
            </p>
            <p className="text-gray-500 leading-relaxed text-sm">
              Все изделия проходят контроль качества: бусины без острых краёв,
              нити крепкие и не растягиваются, клипсы надёжно фиксируются
              и легко открываются взрослым.
            </p>
          </div>
        </section>

        {/* Materials */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
            <Sparkles size={20} className="text-rose-400" />
            Материалы
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {MATERIALS.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.name} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className={`w-10 h-10 ${m.bg} rounded-xl flex items-center justify-center mb-3`}>
                    <Icon size={20} className={m.color} />
                  </div>
                  <h3 className="font-bold text-gray-800 text-sm">{m.name}</h3>
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{m.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Why us */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
            <HeartHandshake size={20} className="text-rose-400" />
            Почему мы?
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {ADVANTAGES.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.text} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-9 h-9 bg-rose-50 rounded-lg flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-rose-500" />
                  </div>
                  <span className="text-gray-700 text-sm">{item.text}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Contact */}
        <section className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-6 md:p-8 text-white">
          <h2 className="text-xl font-bold mb-2">Свяжитесь с нами</h2>
          <p className="text-rose-100 text-sm mb-5">
            Есть вопросы или хотите обсудить индивидуальный заказ?
          </p>
          <a
            href="https://t.me/karinavoronova"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2.5 px-6 py-3 bg-white text-rose-600 rounded-xl font-semibold hover:bg-rose-50 transition-colors shadow-md"
          >
            <Send size={18} />
            Написать в Telegram
          </a>
        </section>
      </div>
    </div>
  );
}
