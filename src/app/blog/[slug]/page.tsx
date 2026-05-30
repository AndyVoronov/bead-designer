import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BlogCard, type BlogPostListItem } from "@/components/blog/BlogCard";
import { BlogPostClient } from "./BlogPostClient";

interface ProductBasic {
  id: number;
  name: string;
  slug: string;
  basePrice: number;
  discountPercent: number;
  images: { id: number; url: string }[];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const post = await prisma.blogPost.findFirst({
      where: { slug, status: "published" },
      select: {
        title: true,
        metaTitle: true,
        metaDescription: true,
        excerpt: true,
        heroImage: true,
        ogImage: true,
        publishedAt: true,
        category: { select: { name: true } },
        author: { select: { name: true } },
      },
    });

    if (!post) return {};

    const title = post.metaTitle || post.title;
    const description = post.metaDescription || post.excerpt || "";
    const ogImage = post.ogImage || post.heroImage;

    return {
      title,
      description,
      openGraph: {
        title: `${title} — 5 минут тишины`,
        description,
        type: "article",
        publishedTime: post.publishedAt?.toISOString(),
        authors: post.author?.name ? [post.author.name] : undefined,
        section: post.category?.name,
        ...(ogImage
          ? {
              images: [
                {
                  url: `/api${ogImage}`,
                  width: 1200,
                  height: 630,
                  alt: post.title,
                },
              ],
            }
          : {}),
      },
    };
  } catch {
    return {};
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://5minutesofsilence.ru";

  let post: Record<string, unknown> | null = null;
  let notFoundFlag = false;

  try {
    const res = await fetch(`${baseUrl}/api/blog/${slug}`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      notFoundFlag = true;
    } else {
      post = await res.json();
    }
  } catch {
    notFoundFlag = true;
  }

  if (notFoundFlag || !post) {
    notFound();
  }

  // Fetch related products
  const productIds = (post.relatedProductIds as number[]) || [];
  const productMap = new Map<number, ProductBasic>();

  if (productIds.length > 0) {
    try {
      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          status: "active",
        },
        select: {
          id: true,
          name: true,
          slug: true,
          basePrice: true,
          discountPercent: true,
          images: {
            where: { isMain: true },
            take: 1,
            select: { id: true, url: true },
          },
        },
      });

      // Fetch fallback images for products without main image in a single query
      const productsWithoutMain = products.filter((p) => p.images.length === 0).map((p) => p.id);
      let fallbackImageMap = new Map<number, { id: number; url: string }>();
      if (productsWithoutMain.length > 0) {
        const fallbackImages = await prisma.productImage.findMany({
          where: { productId: { in: productsWithoutMain } },
          select: { productId: true, id: true, url: true },
          orderBy: { order: "asc" },
        });
        // Use first image per product
        for (const img of fallbackImages) {
          if (!fallbackImageMap.has(img.productId)) {
            fallbackImageMap.set(img.productId, { id: img.id, url: img.url });
          }
        }
      }

      for (const p of products) {
        if (p.images.length === 0) {
          const fallback = fallbackImageMap.get(p.id);
          productMap.set(p.id, { ...p, images: fallback ? [fallback] : [] });
        } else {
          productMap.set(p.id, p);
        }
      }
    } catch {
      // Products fetch failed — continue without them
    }
  }

  // Extract typed fields from post
  const typedPost = post as {
    id: number;
    title: string;
    slug: string;
    content: string;
    excerpt: string | null;
    heroImage: string | null;
    readTime: number;
    views: number;
    publishedAt: string | null;
    isPinned: boolean;
    category: { id: number; name: string; slug: string } | null;
    author: { id: number; name: string | null; avatar: string | null } | null;
    tags: string[];
    relatedPosts: BlogPostListItem[];
  };

  const relatedPosts = typedPost.relatedPosts || [];

  // JSON-LD Article schema
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: typedPost.title,
    description: typedPost.excerpt || "",
    image: typedPost.heroImage
      ? `${baseUrl}/api${typedPost.heroImage}`
      : undefined,
    datePublished: typedPost.publishedAt,
    dateModified: typedPost.publishedAt,
    author: typedPost.author?.name
      ? { "@type": "Person", name: typedPost.author.name }
      : { "@type": "Organization", name: "5 минут тишины" },
    publisher: {
      "@type": "Organization",
      name: "5 минут тишины",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/api/uploads/og-logo.png`,
      },
    },
    mainEntityOfPage: `${baseUrl}/blog/${typedPost.slug}`,
    ...(typedPost.category?.name ? { articleSection: typedPost.category.name } : {}),
  };

  // JSON-LD BreadcrumbList
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Главная",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Блог",
        item: `${baseUrl}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: typedPost.title,
        item: `${baseUrl}/blog/${typedPost.slug}`,
      },
    ],
  };

  // Convert product map to plain array for serialization
  const productsArray = Array.from(productMap.entries()).map(([id, p]) => [id, p] as [number, ProductBasic]);

  return (
    <BlogPostClient
      post={{
        id: typedPost.id,
        title: typedPost.title,
        slug: typedPost.slug,
        content: typedPost.content,
        excerpt: typedPost.excerpt,
        heroImage: typedPost.heroImage,
        readTime: typedPost.readTime,
        views: typedPost.views,
        publishedAt: typedPost.publishedAt,
        category: typedPost.category,
        author: typedPost.author,
        tags: typedPost.tags,
      }}
      products={productsArray}
      relatedPosts={relatedPosts}
      productIds={productIds}
      articleJsonLd={articleJsonLd}
      breadcrumbJsonLd={breadcrumbJsonLd}
    />
  );
}
