import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Уход за изделиями",
  description:
    "Рекомендации по уходу за вязаными изделиями: держатели, браслеты-грызунки, подвески, вязаные игрушки и погремушки. Как стирать, сушить и хранить.",
  openGraph: {
    title: "Уход за изделиями — 5 минут тишины",
    description:
      "Практические советы по уходу за ручной работой из натуральных материалов.",
  },
};

export default function CareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
