import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CATEGORIES } from "@/lib/catalog-utils";
import CatalogClientPage from "../../page";

// Prevent static prerendering of the index route
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

/* ── Static params ───────────────────────────────────────────────────── */

export async function generateStaticParams() {
  try {
    // Combine DB categories with default categories
    const dbCategories = await prisma.category.findMany({
      select: { slug: true },
    });
    const allSlugs = new Set([
      ...DEFAULT_CATEGORIES.map((c) => c.slug),
      ...dbCategories.map((c) => c.slug),
    ]);
    return Array.from(allSlugs).map((slug) => ({ slug }));
  } catch {
    // DB unreachable during build — use defaults only
    return DEFAULT_CATEGORIES.map((c) => ({ slug: c.slug }));
  }
}

/* ── Metadata ────────────────────────────────────────────────────────── */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = DEFAULT_CATEGORIES.find((c) => c.slug === slug);

  if (!cat) {
    const dbCat = await prisma.category.findUnique({
      where: { slug },
      select: { name: true },
    });
    if (!dbCat) return {};
  }

  const title = cat ? cat.name : (await prisma.category.findUnique({ where: { slug }, select: { name: true } }))?.name ?? slug;

  return {
    title,
    description: `${title} — купить в магазине 5 минут тишины. Безопасные материалы, ручная работа, доставка по России.`,
    openGraph: {
      title: `${title} — 5 минут тишины`,
      description: `${title} для малышей. Безопасные игрушки и аксессуары ручной работы.`,
    },
  };
}

/* ── Page ────────────────────────────────────────────────────────────── */

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const cat = DEFAULT_CATEGORIES.find((c) => c.slug === slug);

  // Verify category exists (in defaults or DB)
  if (!cat) {
    const dbCat = await prisma.category.findUnique({
      where: { slug },
    });
    if (!dbCat) notFound();
  }

  // Reuse the main catalog page with category pre-selected
  return <CatalogClientPage initialCategory={slug} />;
}
