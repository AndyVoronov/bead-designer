import type { Metadata } from "next";
import BooksPageClient from "./BooksPageClient";

export const metadata: Metadata = {
  title: "Книга о малыше — Персональные книги для всей семьи",
  description:
    "Создайте уникальную книгу с персонализированными иллюстрациями, где главный герой — ваш ребенок. Маленькие годы — большие воспоминания.",
  openGraph: {
    title: "Книга о малыше — Персональные книги для всей семьи",
    description:
      "Создайте уникальную книгу с персонализированными иллюстрациями, где главный герой — ваш ребенок.",
  },
};

export default function BooksPage() {
  return <BooksPageClient />;
}
