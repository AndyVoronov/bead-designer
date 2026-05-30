import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Заказ оформлен — 5 минут тишины",
  robots: { index: false, follow: false },
};

export default function OrderSuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
