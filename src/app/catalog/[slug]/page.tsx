import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import ProductDetailClient from "./_client";
import { ProductJsonLd, BreadcrumbJsonLd } from "@/components/seo/JsonLd";

export const revalidate = 300; // ISR: regenerate every 5 minutes

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: {
        name: true,
        shortDescription: true,
        basePrice: true,
        discountPercent: true,
        images: { where: { isMain: true }, select: { url: true }, take: 1 },
        category: { select: { name: true } },
      },
    });

    if (!product) {
      return { title: "Товар не найден" };
    }

    const effectivePrice =
      product.discountPercent > 0
        ? Math.round(product.basePrice * (1 - product.discountPercent / 100))
        : product.basePrice;

    const imageUrl = product.images[0]
      ? `https://5minutesofsilence.ru/api${product.images[0].url}`
      : undefined;

    return {
      title: product.name,
      description:
        product.shortDescription ??
        `${product.name} — ${product.category?.name ?? "игрушки для малышей"} в магазине 5 минут тишины. Цена: ${effectivePrice.toLocaleString("ru-RU")} ₽.`,
      openGraph: {
        title: `${product.name} — 5 минут тишины`,
        description:
          product.shortDescription ??
          `${product.name} — ${product.category?.name ?? "игрушки для малышей"}`,
        images: imageUrl ? [{ url: imageUrl, width: 800, height: 800 }] : [],
        type: "website",
        locale: "ru_RU",
      },
      alternates: {
        canonical: `/catalog/${slug}`,
      },
    };
  } catch {
    return { title: "Товар не найден" };
  }
}

export default async function ProductDetailPage(props: PageProps) {
  const { slug } = await props.params;

  // Fetch product data for JSON-LD
  let productForLd: {
    name: string;
    description: string | null;
    basePrice: number;
    discountPercent: number;
    stockQuantity: number;
    images: { url: string }[];
    category: { name: string; slug: string } | null;
  } | null = null;
  let reviewStats: { count: number; avg: number } = { count: 0, avg: 0 };

  try {
    const p = await prisma.product.findUnique({
      where: { slug },
      select: {
        name: true,
        description: true,
        basePrice: true,
        discountPercent: true,
        status: true,
        stockQuantity: true,
        categoryId: true,
        images: { where: { isMain: true }, select: { url: true }, take: 1 },
        category: { select: { name: true, slug: true } },
      },
    });
    if (p && p.status === "active") {
      productForLd = {
        name: p.name,
        description: p.description,
        basePrice: p.basePrice,
        discountPercent: p.discountPercent,
        stockQuantity: (p as { stockQuantity: number }).stockQuantity,
        images: p.images,
        category: p.category,
      };

      // Fetch review stats for aggregate rating
      if (p.categoryId) {
        const stats = await prisma.review.aggregate({
          where: { categoryId: p.categoryId, isApproved: true },
          _count: true,
          _avg: { rating: true },
        });
        reviewStats = { count: stats._count, avg: stats._avg.rating ?? 0 };
      }
    }
  } catch { /* ignore */ }

  return (
    <>
      {productForLd && (
        <>
          <ProductJsonLd
            name={productForLd.name}
            description={productForLd.description}
            price={
              productForLd.discountPercent > 0
                ? Math.round(productForLd.basePrice * (1 - productForLd.discountPercent / 100))
                : Math.round(productForLd.basePrice)
            }
            imageUrl={productForLd.images[0]?.url ?? null}
            category={productForLd.category?.name ?? null}
            reviewCount={reviewStats.count}
            averageRating={reviewStats.avg}
            availability={
              productForLd.stockQuantity === 0
                ? "https://schema.org/PreOrder"
                : productForLd.stockQuantity <= 3
                  ? "https://schema.org/LimitedAvailability"
                  : "https://schema.org/InStock"
            }
          />
          <BreadcrumbJsonLd
            items={[
              { name: "Каталог", href: "/catalog" },
              ...(productForLd.category
                ? [{ name: productForLd.category.name, href: `/catalog/category/${productForLd.category.slug}` }]
                : []),
              { name: productForLd.name, href: `/catalog/${slug}` },
            ]}
          />
        </>
      )}
      <ProductDetailClient {...props} />
    </>
  );
}
