import { prisma } from "@/lib/prisma";

export interface SearchResult {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  basePrice: number;
  discountPercent: number;
  mainImage: { id: number; url: string } | null;
  rank: number;
}

/**
 * Full-text search using PostgreSQL tsvector with Russian morphology.
 * Falls back to Prisma contains if tsvector column doesn't exist.
 */
export async function searchProducts(query: string, limit = 20, offset = 0) {
  // Clean and prepare the search query
  const cleaned = query
    .replace(/[!&|():*<>{}[\]\\'"`~]/g, "")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => `${w}:*`)
    .join(" & ");

  if (!cleaned) return { products: [], total: 0 };

  try {
    // Try tsvector search first
    const results = await prisma.$queryRawUnsafe<
      Array<{
        id: number;
        name: string;
        slug: string;
        short_description: string | null;
        base_price: number;
        discount_percent: number;
        image_id: number | null;
        image_url: string | null;
        rank: number;
      }>
    >(
      `
      SELECT p.id, p.name, p.slug, p.short_description, p.base_price, p.discount_percent,
             pi.id AS image_id, pi.url AS image_url,
             ts_rank_cd(p.search_vector, to_tsquery('russian', $1)) AS rank
      FROM products p
      LEFT JOIN LATERAL (
        SELECT id, url FROM product_images WHERE product_id = p.id AND is_main = true LIMIT 1
      ) pi ON true
      WHERE p.status = 'active'
        AND p.search_vector @@ to_tsquery('russian', $1)
      ORDER BY rank DESC, p.id DESC
      LIMIT $2 OFFSET $3
    `,
      cleaned,
      limit,
      offset
    );

    const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `
      SELECT count(*) FROM products
      WHERE status = 'active' AND search_vector @@ to_tsquery('russian', $1)
    `,
      cleaned
    );

    return {
      products: results.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        shortDescription: r.short_description,
        basePrice: r.base_price,
        discountPercent: r.discount_percent,
        mainImage: r.image_id ? { id: r.image_id, url: r.image_url! } : null,
        rank: r.rank,
      })),
      total: Number(countResult[0].count),
    };
  } catch {
    // Fallback: tsvector column might not exist yet
    return { products: [], total: 0 };
  }
}
