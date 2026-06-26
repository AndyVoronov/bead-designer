import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { NextRequest } from "next/server";

// GET /api/admin/books-stories — all book-products (category slug "knigi")
export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    const booksCategory = await prisma.category.findUnique({ where: { slug: "knigi" } });
    if (!booksCategory) {
      return NextResponse.json([]);
    }
    const products = await prisma.product.findMany({
      where: { categoryId: booksCategory.id },
      include: { images: { orderBy: { order: "asc" } } },
      orderBy: { id: "asc" },
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error("Failed to fetch book stories:", error);
    return NextResponse.json({ error: "Не удалось загрузить истории" }, { status: 500 });
  }
}

// POST /api/admin/books-stories — create a new book product
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    const body = await request.json();
    const {
      name, slug, description, shortDescription,
      pricePrint, discountPrint, priceDigital, discountDigital,
      ageGroup, audience, homepageTag, cover, status,
    } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "Название и slug обязательны" }, { status: 400 });
    }

    // ensure "knigi" category exists
    let booksCategory = await prisma.category.findUnique({ where: { slug: "knigi" } });
    if (!booksCategory) {
      booksCategory = await prisma.category.create({ data: { name: "Книги", slug: "knigi", order: 999 } });
    }

    const basePrice = Number(pricePrint) || 0;
    const discountPercent = discountPrint && pricePrint
      ? Math.round((1 - Number(discountPrint) / Number(pricePrint)) * 100)
      : 0;

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: description || null,
        shortDescription: shortDescription || description || null,
        basePrice,
        discountPercent,
        type: "simple",
        status: status || "active",
        categoryId: booksCategory.id,
        recommendedAge: ageGroup || null,
        audience: audience || null,
        homepageTag: homepageTag || null,
        priceDigital: priceDigital ? Number(priceDigital) : null,
        discountDigital: discountDigital ? Number(discountDigital) : null,
        images: cover ? { create: { url: cover, isMain: true, order: 0 } } : undefined,
      },
      include: { images: true },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Failed to create book story:", error);
    return NextResponse.json({ error: "Не удалось создать историю" }, { status: 500 });
  }
}
