import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/product-favorites — list user's favorite products
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const favorites = await prisma.productFavorite.findMany({
      where: { userId: Number(session.user.id) },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            basePrice: true,
            discountPercent: true,
            status: true,
            images: {
              where: { isMain: true },
              select: { url: true, id: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Map to include mainImage from nested images
    const productsWithImages = favorites.map((fav) => ({
      ...fav,
      product: {
        ...fav.product,
        mainImage: fav.product.images[0] ?? null,
        images: undefined,
      },
    }));

    return NextResponse.json(productsWithImages);
  } catch (error) {
    console.error("GET /api/product-favorites error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/product-favorites — toggle favorite (add or remove)
 * Body: { productId: number }
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId } = await request.json();
    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 });
    }

    const userId = Number(session.user.id);
    let favorited = false;

    // Use transaction to prevent race condition on duplicate
    await prisma.$transaction(async (tx) => {
      const exists = await tx.productFavorite.findUnique({
        where: { userId_productId: { userId, productId } },
      });
      if (exists) {
        await tx.productFavorite.delete({ where: { id: exists.id } });
        favorited = false;
      } else {
        await tx.productFavorite.create({ data: { userId, productId } });
        favorited = true;
      }
    });
    return NextResponse.json({ favorited, productId });
  } catch (error) {
    console.error("POST /api/product-favorites error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
