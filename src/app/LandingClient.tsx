"use client";

import dynamic from "next/dynamic";

const LandingPage = dynamic(
  () => import("@/components/landing/LandingPage"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#FFF8F5] flex items-center justify-center">
        <div className="text-rose-400 text-lg animate-pulse">Загрузка...</div>
      </div>
    ),
  }
);

export default function LandingClient() {
  return (
    <>
      <LandingPage />
      {/* SEO content for crawlers — hidden from users with JS */}
      <noscript>
        <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
          <h1>5 минут тишины — Игрушки и аксессуары для малышей</h1>
          <p>
            Уникальные детские игрушки: держатели для пустышек, прорезыватели,
            браслеты из бусин, подвески и вязаные игрушки. Соберите своё
            изделие в 3D-конструкторе или выберите из готового каталога.
          </p>
          <p>
            Все изделия из безопасных материалов: натуральное дерево,
            пищевой силикон, гипоаллергенный пластик. Ручная сборка,
            доставка по всей России.
          </p>
          <h2>Каталог товаров</h2>
          <ul>
            <li><a href="/catalog">Все товары</a></li>
            <li><a href="/editor">3D-конструктор</a></li>
            <li><a href="/about">О нас</a></li>
            <li><a href="/delivery">Доставка и оплата</a></li>
            <li><a href="/faq">Частые вопросы</a></li>
          </ul>
        </div>
      </noscript>
    </>
  );
}
