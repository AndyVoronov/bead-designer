import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;
    const badgesParam = searchParams.get("badges") || undefined;
    const age = searchParams.get("age") || undefined;
    const minPrice = searchParams.get("minPrice")
      ? Number(searchParams.get("minPrice"))
      : undefined;
    const maxPrice = searchParams.get("maxPrice")
      ? Number(searchParams.get("maxPrice"))
      : undefined;
    const sort = searchParams.get("sort") || "newest";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));

    const skip = (page - 1) * limit;
    const hasPriceFilter = minPrice !== undefined || maxPrice !== undefined;

    // Build where clause
    const where: Record<string, unknown> = { status: "active" };

    if (category) {
      const slugs = category.split(",").map((s) => s.trim()).filter(Boolean);
      if (slugs.length === 1) {
        where.category = { slug: slugs[0] };
      } else if (slugs.length > 1) {
        where.category = { slug: { in: slugs } };
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { shortDescription: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (badgesParam) {
      const badgeLabels = badgesParam.split(",").map((b) => b.trim()).filter(Boolean);
      if (badgeLabels.length > 0) {
        where.badges = {
          some: {
            badge: {
              label: { in: badgeLabels },
            },
          },
        };
      }
    }

    if (age) {
      where.recommendedAge = age;
    }

    // Build orderBy
    let orderBy: Record<string, string> = { id: "desc" };
    switch (sort) {
      case "price-asc":
        orderBy = { basePrice: "asc" };
        break;
      case "price-desc":
        orderBy = { basePrice: "desc" };
        break;
      case "newest":
      default:
        orderBy = { id: "desc" };
        break;
    }

    const [products, total, allBadges] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        // When price filtering, fetch all matching (generous limit) then post-filter by effective price
        skip: hasPriceFilter ? 0 : skip,
        take: hasPriceFilter ? Math.max(limit * 5, 200) : limit,
        include: {
          images: {
            orderBy: { order: "asc" },
            take: 1,
          },
          badges: {
            include: { badge: true },
          },
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      prisma.product.count({ where }),
      // Fetch all distinct active badges for the filter sidebar
      prisma.productBadge.findMany({
        where: { product: { status: "active" } },
        distinct: ["badgeId"],
        include: {
          badge: { select: { id: true, label: true, textColor: true, bgColor: true } },
        },
      }),
    ]);

    // Post-filter by effective price (basePrice with discount)
    let filteredProducts = products;
    if (hasPriceFilter) {
      const effectiveMin = minPrice !== undefined ? minPrice : 0;
      const effectiveMax = maxPrice !== undefined ? maxPrice : Infinity;
      filteredProducts = products.filter((p) => {
        const effective = p.basePrice * (1 - p.discountPercent / 100);
        return effective >= effectiveMin && effective <= effectiveMax;
      });
      // Apply pagination after filtering
      filteredProducts = filteredProducts.slice(skip, skip + limit);
    }

    // Use first image as main (already ordered, take: 1)
    const productsWithMainImage = filteredProducts.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription,
      basePrice: product.basePrice,
      discountPercent: product.discountPercent,
      type: product.type,
      mainImage: product.images[0]
        ? { id: product.images[0].id, url: product.images[0].url }
        : null,
      badges: product.badges.map((pb) => ({
        id: pb.badge.id,
        label: pb.badge.label,
        textColor: pb.badge.textColor,
        bgColor: pb.badge.bgColor,
      })),
      category: product.category || null,
      stockQuantity: product.stockQuantity,
      recommendedAge: product.recommendedAge,
      createdAt: product.createdAt.toISOString(),
    }));

    return NextResponse.json({
      products: productsWithMainImage,
      total: hasPriceFilter ? filteredProducts.length : total,
      page,
      totalPages: Math.ceil((hasPriceFilter ? filteredProducts.length : total) / limit),
      availableBadges: allBadges.map((pb) => pb.badge).filter(Boolean),
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить товары" },
      { status: 500 }
    );
  }
}
