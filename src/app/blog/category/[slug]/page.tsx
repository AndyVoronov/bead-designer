import type { Metadata } from "next";
import { BlogPageClient } from "../../BlogPageClient";
import { type BlogPostListItem } from "@/components/blog/BlogCard";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const category = await prisma.blogCategory.findUnique({
      where: { slug },
      select: { name: true },
    });

    const title = category ? `Блог — ${category.name}` : "Блог — категория";
    const description = category
      ? `Статьи в категории «${category.name}» — 5 минут тишины`
      : "Статьи в категории блога";

    return {
      title,
      description,
      openGraph: {
        title: `${title} — 5 минут тишины`,
        description,
        type: "website",
      },
    };
  } catch {
    return {
      title: "Блог — категория",
      description: "Статьи в категории блога",
    };
  }
}

export default async function BlogCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://5minutesofsilence.ru";

  const [postsRes, categoriesRes] = await Promise.all([
    fetch(`${baseUrl}/api/blog?category=${encodeURIComponent(slug)}&page=${page}&limit=12`, {
      next: { revalidate: 60 },
    }),
    fetch(`${baseUrl}/api/blog/categories`, { next: { revalidate: 300 } }),
  ]);

  let posts: BlogPostListItem[] = [];
  let totalPages = 1;
  let categoryName = slug;
  let categories: { id: number; name: string; slug: string; postCount: number }[] = [];

  if (postsRes.ok) {
    const data = await postsRes.json();
    posts = data.posts || [];
    totalPages = data.totalPages || 1;
    // Get category name from first post
    if (posts.length > 0 && posts[0].category) {
      categoryName = posts[0].category.name;
    }
  }

  if (categoriesRes.ok) {
    categories = await categoriesRes.json();
    const matched = categories.find((c: { slug: string }) => c.slug === slug);
    if (matched) categoryName = matched.name;
  }

  return (
    <BlogPageClient
      initialPosts={posts}
      initialCategories={categories}
      currentPage={page}
      totalPages={totalPages}
      activeCategorySlug={slug}
      activeCategoryName={categoryName}
    />
  );
}
