import type { Metadata } from "next";
import LandingClient from "./LandingClient";

export const metadata: Metadata = {
  title: "5 минут тишины — Уникальные детские игрушки и аксессуары",
  description:
    "Игрушки и аксессуары для малышей: держатели для пустышек, прорезыватели, браслеты из бусин, вязаные игрушки, наборы. Безопасные материалы, ручная сборка, доставка по всей России. Соберите уникальное изделие в 3D-конструкторе.",
  openGraph: {
    title: "5 минут тишины — Уникальные детские игрушки и аксессуары",
    description:
      "Держатели для пустышек, прорезыватели, браслеты и наборы. Безопасные материалы, ручная сборка, доставка по РФ.",
    url: "https://5minutesofsilence.ru",
    siteName: "5 минут тишины",
    type: "website",
    locale: "ru_RU",
  },
};

export default function HomePage() {
  return <LandingClient />;
}
