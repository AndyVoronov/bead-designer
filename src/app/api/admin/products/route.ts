import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { generateSlug } from "@/lib/catalog-utils";

// GET /api/admin/products — list all products (any status)
export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const categoryId = searchParams.get("categoryId")
      ? Number(searchParams.get("categoryId"))
      : undefined;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { id: "desc" },
        skip,
        take: limit,
        include: {
          category: {
            select: { id: true, name: true },
          },
          images: {
            where: { isMain: true },
            take: 1,
          },
          badges: {
            include: { badge: true },
          },
          trustBadges: {
            include: { trustBadge: true },
          },
          _count: {
            select: { compositeItems: true },
          },
          waitlistEntries: {
            where: { notified: false },
            select: { id: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      products: products.map((p) => ({
        ...p,
        waitlistCount: p.waitlistEntries.length,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Failed to fetch admin products:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить товары" },
      { status: 500 }
    );
  }
}

// POST /api/admin/products — create product
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      slug,
      shortDescription,
      description,
      basePrice,
      discountPercent,
      type,
      categoryId,
      stockQuantity,
      recommendedAge,
      status,
      badgeIds,
      trustBadgeIds,
      compositeItems: compositeItemIds,
    } = body;

    if (!name || basePrice === undefined) {
      return NextResponse.json(
        { error: "Название и цена обязательны" },
        { status: 400 }
      );
    }

    const productSlug = slug || generateSlug(name);

    // Check slug uniqueness
    const existing = await prisma.product.findUnique({
      where: { slug: productSlug },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Товар с таким slug уже существует" },
        { status: 409 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug: productSlug,
        shortDescription: shortDescription || null,
        description: description || null,
        basePrice: Number(basePrice),
        discountPercent: Number(discountPercent) || 0,
        type: type || "simple",
        categoryId: categoryId ? Number(categoryId) : null,
        stockQuantity: Number(stockQuantity) || 0,
        recommendedAge: recommendedAge || null,
        status: status || "draft",
        badges: badgeIds?.length
          ? {
              create: (badgeIds as number[]).map((badgeId: number) => ({
                badge: { connect: { id: badgeId } },
              })),
            }
          : undefined,
        trustBadges: (trustBadgeIds as number[])?.length
          ? {
              create: (trustBadgeIds as number[]).map((id: number) => ({
                trustBadge: { connect: { id } },
              })),
            }
          : undefined,
        compositeItems: compositeItemIds?.length
          ? {
              create: (compositeItemIds as Array<{ childId: number; quantity: number }>).map(
                (item) => ({
                  child: { connect: { id: item.childId } },
                  quantity: item.quantity || 1,
                })
              ),
            }
          : undefined,
      },
      include: {
        category: true,
        badges: { include: { badge: true } },
        trustBadges: { include: { trustBadge: true } },
        compositeItems: { include: { child: true } },
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Failed to create product:", error);
    return NextResponse.json(
      { error: "Не удалось создать товар" },
      { status: 500 }
    );
  }
}
