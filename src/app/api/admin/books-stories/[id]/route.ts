import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { NextRequest } from "next/server";

// GET /api/admin/books-stories/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    const { id } = await params;
    const productId = Number(id);
    if (isNaN(productId)) {
      return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
    }
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { images: { orderBy: { order: "asc" } } },
    });
    if (!product) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error) {
    console.error("Failed to fetch book story:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// PUT /api/admin/books-stories/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    const { id } = await params;
    const productId = Number(id);
    if (isNaN(productId)) {
      return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
    }
    const body = await request.json();
    const {
      name, slug, description, shortDescription,
      pricePrint, discountPrint, priceDigital, discountDigital,
      ageGroup, audience, homepageTag, cover, status,
    } = body;

    const basePrice = pricePrint !== undefined ? Number(pricePrint) : undefined;
    const discountPercent =
      discountPrint !== undefined && pricePrint !== undefined && Number(pricePrint) > 0
        ? Math.round((1 - Number(discountPrint) / Number(pricePrint)) * 100)
        : undefined;

    // Update cover image if provided
    if (cover) {
      const existingMain = await prisma.productImage.findFirst({
        where: { productId, isMain: true },
      });
      if (existingMain) {
        await prisma.productImage.update({ where: { id: existingMain.id }, data: { url: cover } });
      } else {
        await prisma.productImage.create({ data: { productId, url: cover, isMain: true, order: 0 } });
      }
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
        ...(shortDescription !== undefined && { shortDescription }),
        ...(basePrice !== undefined && { basePrice }),
        ...(discountPercent !== undefined && { discountPercent }),
        ...(ageGroup !== undefined && { recommendedAge: ageGroup }),
        ...(audience !== undefined && { audience }),
        ...(homepageTag !== undefined && { homepageTag }),
        ...(priceDigital !== undefined && { priceDigital: priceDigital ? Number(priceDigital) : null }),
        ...(discountDigital !== undefined && { discountDigital: discountDigital ? Number(discountDigital) : null }),
        ...(status !== undefined && { status }),
      },
      include: { images: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json(product);
  } catch (error) {
    console.error("Failed to update book story:", error);
    return NextResponse.json({ error: "Не удалось обновить" }, { status: 500 });
  }
}

// DELETE /api/admin/books-stories/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    const { id } = await params;
    const productId = Number(id);
    if (isNaN(productId)) {
      return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
    }
    await prisma.product.delete({ where: { id: productId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete book story:", error);
    return NextResponse.json({ error: "Не удалось удалить" }, { status: 500 });
  }
}
