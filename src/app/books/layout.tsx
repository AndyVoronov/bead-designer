import type { Metadata } from "next";
import { Playfair_Display, Rubik } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

const rubik = Rubik({
  subsets: ["latin", "cyrillic"],
  variable: "--font-rubik",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Книга о малыше — Персональные книги для всей семьи — 5 минут тишины",
  description:
    "Создайте уникальную книгу с персонализированными иллюстрациями, где главный герой — ваш ребенок. Маленькие годы — большие воспоминания.",
};

export default function BooksLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${playfair.variable} ${rubik.variable}`}>
      {children}
    </div>
  );
}
