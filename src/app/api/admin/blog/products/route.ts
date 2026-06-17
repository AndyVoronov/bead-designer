import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authResult = await isAdmin(request as any);
  if (!authResult) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const products = await prisma.product.findMany({
      where: { status: "active" },
      select: {
        id: true,
        name: true,
        slug: true,
        shortDescription: true,
        basePrice: true,
        recommendedAge: true,
        images: {
          select: { url: true },
          take: 1,
          orderBy: { order: "asc" },
        },
      },
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    // Prepend "/api" to image URLs for client consumption
    const mapped = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      shortDescription: p.shortDescription,
      basePrice: p.basePrice,
      recommendedAge: p.recommendedAge,
      images: p.images.map((img) => ({ url: `/api${img.url}` })),
    }));

    return Response.json(mapped);
  } catch (err) {
    console.error("[admin/blog/products] Error:", err);
    return Response.json({ error: "Failed to load products" }, { status: 500 });
  }
}
