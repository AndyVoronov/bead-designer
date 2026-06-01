import { prisma } from "@/lib/prisma";
import { generateMeta, generateContent, removeVideoPlaceholders, getAllCategorySlugs, assignCategory } from "@/lib/ai-article";
import { searchPexels, downloadPexelsImage, slugToSearchQuery } from "@/lib/pexels";

export const dynamic = "force-dynamic";

// ─── Cyrillic slug transliteration ───
const CYRILLIC_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
};

function transliterateSlug(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((ch) => CYRILLIC_MAP[ch] || ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

// ─── POST: process due scheduled posts (no admin auth — called by server cron) ───
export async function POST() {
  const now = new Date();

  const duePosts = await prisma.scheduledPost.findMany({
    where: {
      status: "pending",
      scheduledAt: { lte: now },
    },
  });

  if (duePosts.length === 0) {
    return Response.json({ processed: 0 });
  }

  console.log(`[schedule] Processing ${duePosts.length} posts`);

  // Fire-and-forget: process each post independently
  (async () => {
    for (const post of duePosts) {
      try {
        // Mark as processing
        await prisma.scheduledPost.update({
          where: { id: post.id },
          data: { status: "processing" },
        });

        const requirements = post.additionalRequirements || undefined;
        const productIds: number[] = post.productIds
          ? JSON.parse(post.productIds)
          : [];

        // Generate meta
        console.log(`[schedule] Generating meta for: "${post.topic}"`);
        const meta = await generateMeta(post.topic, requirements);

        // Load products if productIds provided
        let productsInfo: {
          name: string;
          slug: string;
          basePrice: number;
          imageUrl: string;
          shortDescription: string | null;
          recommendedAge: string | null;
        }[] | undefined;

        if (productIds.length > 0) {
          const dbProducts = await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: {
              name: true,
              slug: true,
              basePrice: true,
              recommendedAge: true,
              shortDescription: true,
              images: { select: { url: true }, take: 1, orderBy: { order: "asc" } },
            },
          });

          productsInfo = dbProducts.map((p) => ({
            name: p.name,
            slug: p.slug,
            basePrice: p.basePrice,
            imageUrl: p.images[0] ? `/api${p.images[0].url}` : "",
            shortDescription: p.shortDescription,
            recommendedAge: p.recommendedAge,
          }));
        }

        // Generate content
        console.log(`[schedule] Generating content for: "${meta.title}"`);
        let finalContent = await generateContent(post.topic, meta.title, requirements, productsInfo);

        // Remove video placeholders
        finalContent = removeVideoPlaceholders(finalContent);

        // Generate slug
        const slug = transliterateSlug(meta.title).slice(0, 80);
        let finalSlug = slug;
        let counter = 1;
        while (true) {
          const existing = await prisma.blogPost.findUnique({ where: { slug: finalSlug } });
          if (!existing) break;
          finalSlug = `${slug}-${counter++}`;
        }

        const wordCount = finalContent.replace(/<[^>]+>/g, "").split(/\s+/).length;
        const readTime = Math.max(3, Math.ceil(wordCount / 250));

        // Create article
        const saved = await prisma.blogPost.create({
          data: {
            title: meta.title,
            slug: finalSlug,
            content: finalContent,
            excerpt: meta.excerpt,
            tags: { create: (meta.tags || []).map((tag: string) => ({ tag })) },
            readTime,
            status: "published",
          },
        });

        console.log(`[schedule] Completed: slug=${saved.slug}`);

        // Auto-assign category
        try {
          const categories = await getAllCategorySlugs();
          if (categories.length > 0) {
            const categorySlug = await assignCategory(post.topic, categories);
            if (categorySlug) {
              const cat = await prisma.blogCategory.findUnique({ where: { slug: categorySlug } });
              if (cat) {
                await prisma.blogPost.update({ where: { id: saved.id }, data: { categoryId: cat.id } });
                console.log(`[schedule] Assigned category: ${cat.name} (${cat.slug})`);
              }
            }
          }
        } catch (catErr) {
          console.warn('[schedule] Category assignment failed:', catErr);
        }

        // Link scheduled post to article
        await prisma.scheduledPost.update({
          where: { id: post.id },
          data: { status: "completed", articleId: saved.id },
        });

        // Pexels hero image (non-blocking)
        try {
          const searchQuery = slugToSearchQuery(finalSlug);
          const photos = await searchPexels(searchQuery, 5);

          if (photos.length > 0) {
            const photo = photos[0];
            const imageUrl = photo.src.large2x || photo.src.original;
            const UPLOAD_DIR = "/opt/bead-designer/uploads/blog";
            const timestamp = Date.now();
            const dbPath = `/uploads/blog/hero-${timestamp}.jpg`;
            const fullPath = `${UPLOAD_DIR}/hero-${timestamp}.jpg`;

            await downloadPexelsImage(imageUrl, fullPath);

            await prisma.blogPost.update({
              where: { id: saved.id },
              data: { heroImage: dbPath },
            });

            // Inject background image into hero div
            const contentWithBg = finalContent.replace(
              /<div class="blog-hero([^>]*)">/,
              `<div class="blog-hero has-image$1" style="background-image: url('/api${dbPath}')">`
            );
            await prisma.blogPost.update({
              where: { id: saved.id },
              data: { content: contentWithBg },
            });

            console.log(`[schedule] Pexels hero set: ${dbPath}`);
          }
        } catch (pexErr) {
          console.warn("[schedule] Pexels hero failed (article still published):", pexErr);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error(`[schedule] Failed for id=${post.id}: ${msg}`);
        await prisma.scheduledPost.update({
          where: { id: post.id },
          data: { status: "failed", error: msg },
        });
      }
    }
  })();

  return Response.json({ processed: duePosts.length });
}
