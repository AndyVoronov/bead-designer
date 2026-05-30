import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CATEGORIES } from "@/lib/catalog-utils";

// Dynamic sitemap — fetches active products from DB at request time
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://5minutesofsilence.ru";
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/catalog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/delivery`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Category pages — try DB first, fallback to DEFAULT_CATEGORIES
  let categoryPages: MetadataRoute.Sitemap;
  try {
    const dbCategories = await prisma.category.findMany({
      where: { products: { some: { status: "active" } } },
      select: { slug: true },
    });
    categoryPages = dbCategories.map((cat) => ({
      url: `${baseUrl}/catalog/category/${cat.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    }));
  } catch {
    categoryPages = DEFAULT_CATEGORIES.map((cat) => ({
      url: `${baseUrl}/catalog/category/${cat.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    }));
  }

  // Dynamic product pages — use real updatedAt from DB
  try {
    const products = await prisma.product.findMany({
      where: { status: "active" },
      select: { slug: true, updatedAt: true },
    });

    const productPages: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${baseUrl}/catalog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    // Blog post pages
    const blogPosts = await prisma.blogPost.findMany({
      where: { status: "published" },
      select: {
        slug: true,
        updatedAt: true,
        publishedAt: true,
        category: { select: { slug: true } },
      },
    });

    const blogPages: MetadataRoute.Sitemap = blogPosts.map((p) => ({
      url: `${baseUrl}/blog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

    // Blog category pages
    const blogCategories = await prisma.blogCategory.findMany({
      where: { posts: { some: { status: "published" } } },
      select: { slug: true },
    });

    const blogCategoryPages: MetadataRoute.Sitemap = blogCategories.map((c) => ({
      url: `${baseUrl}/blog/category/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    return [...staticPages, ...categoryPages, ...productPages, ...blogPages, ...blogCategoryPages];
  } catch {
    // Fallback to static + category pages only if DB is unreachable
    return [...staticPages, ...categoryPages];
  }
}
