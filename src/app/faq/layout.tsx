import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Частые вопросы",
  description:
    "Ответы на частые вопросы о заказе, доставке, материалах и уходе за изделиями — 5 минут тишины.",
  openGraph: {
    title: "FAQ — 5 минут тишины",
    description: "Частые вопросы о нашем магазине.",
  },
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return children;
}
