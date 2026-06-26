import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
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

async function getBooksData() {
  // Parallel fetch of all /books page content from the DB.
  const [
    booksCategory,
    faqItems,
    demoPairs,
    livePhotos,
    settingsRows,
  ] = await Promise.all([
    prisma.category.findUnique({ where: { slug: "knigi" } }),
    prisma.productFaq.findMany({ where: { scope: "books" }, orderBy: { order: "asc" } }),
    prisma.demoPair.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    prisma.livePhoto.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    prisma.siteSettings.findMany({ where: { key: { startsWith: "books_" } } }),
  ]);

  // Story products (active, in books category)
  const stories = booksCategory
    ? await prisma.product.findMany({
        where: { categoryId: booksCategory.id, status: "active" },
        include: { images: { where: { isMain: true }, take: 1 } },
        orderBy: { id: "asc" },
      })
    : [];

  // Reviews (approved, attached to books category)
  const reviews = booksCategory
    ? await prisma.review.findMany({
        where: { categoryId: booksCategory.id, isApproved: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    : [];

  // settings → map
  const settings: Record<string, string> = {};
  settingsRows.forEach((s) => { settings[s.key] = s.value; });

  return {
    stories: stories.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      description: s.shortDescription || s.description || "",
      cover: s.images[0]?.url || "",
      pricePrint: s.basePrice,
      discountPrint: Math.round(s.basePrice * (1 - s.discountPercent / 100)),
      ageGroup: s.recommendedAge || "",
      audience: s.audience || "",
      homepageTag: s.homepageTag || "",
    })),
    reviews: reviews.map((r) => ({
      authorName: r.authorName,
      rating: r.rating,
      // review text may contain "[role]" appended during seed
      text: r.text.replace(/\s*\[([^\]]+)\]\s*$/, (m, role) => ` [${role}]`).split(" ["),
      role: "",
    })),
    faqItems: faqItems.map((f) => ({ question: f.question, answer: f.answer })),
    demoPairs: demoPairs.map((p) => ({ photoUrl: p.photoUrl, characterUrl: p.characterUrl })),
    livePhotos: livePhotos.map((p) => p.url),
    settings,
  };
}

export default async function BooksPage() {
  const data = await getBooksData();
  return <BooksPageClient {...data} />;
}
