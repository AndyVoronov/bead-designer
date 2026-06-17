import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        images: {
          orderBy: { order: "asc" },
        },
        badges: {
          include: { badge: true },
        },
        trustBadges: {
          include: { trustBadge: true },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
        compositeItems: {
          include: {
            child: {
              include: {
                images: {
                  orderBy: { order: "asc" },
                  take: 1,
                },
              },
            },
          },
        },
        // Bundles that include this product as a child
        compositeIn: {
          include: {
            parent: {
              include: {
                images: {
                  orderBy: { order: "asc" },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!product || product.status !== "active") {
      return NextResponse.json(
        { error: "Товар не найден" },
        { status: 404 }
      );
    }

    // Composite children with main image (already fetched, no fallback query needed)
    const compositeItems = product.compositeItems.map((ci) => ({
      id: ci.id,
      quantity: ci.quantity,
      child: {
        id: ci.child.id,
        name: ci.child.name,
        slug: ci.child.slug,
        basePrice: ci.child.basePrice,
        discountPercent: ci.child.discountPercent,
        mainImage: ci.child.images[0]
          ? { id: ci.child.images[0].id, url: ci.child.images[0].url }
          : null,
      },
    }));

    // "Included in bundles" list (already fetched)
    const includedInBundles = product.compositeIn.map((ci) => ({
      id: ci.id,
      quantity: ci.quantity,
      bundle: {
        id: ci.parent.id,
        name: ci.parent.name,
        slug: ci.parent.slug,
        basePrice: ci.parent.basePrice,
        discountPercent: ci.parent.discountPercent,
        mainImage: ci.parent.images[0]
          ? { id: ci.parent.images[0].id, url: ci.parent.images[0].url }
          : null,
      },
    }));

    return NextResponse.json({
      id: product.id,
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription,
      description: product.description,
      basePrice: product.basePrice,
      discountPercent: product.discountPercent,
      type: product.type,
      category: product.category || null,
      images: product.images.map((img) => ({
        id: img.id,
        url: img.url,
        order: img.order,
        isMain: img.isMain,
      })),
      badges: product.badges.map((pb) => ({
        id: pb.badge.id,
        label: pb.badge.label,
        textColor: pb.badge.textColor,
        bgColor: pb.badge.bgColor,
      })),
      trustBadges: product.trustBadges.map((ptb) => ({
        id: ptb.trustBadge.id,
        label: ptb.trustBadge.label,
        icon: ptb.trustBadge.icon,
        description: ptb.trustBadge.description,
      })),
      compositeItems,
      includedInBundles,
      stockQuantity: product.stockQuantity,
      recommendedAge: product.recommendedAge,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить товар" },
      { status: 500 }
    );
  }
}
