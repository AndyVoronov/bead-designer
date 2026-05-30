import type { Metadata } from "next";
import { BlogPageClient } from "../../BlogPageClient";
import { type BlogPostListItem } from "@/components/blog/BlogCard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  return {
    title: `Тег: ${decodedTag}`,
    description: `Статьи с тегом «${decodedTag}» в блоге 5 минут тишины`,
    openGraph: {
      title: `Тег: ${decodedTag} — 5 минут тишины`,
      type: "website",
    },
  };
}

export default async function BlogTagPage({
  params,
  searchParams,
}: {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://5minutesofsilence.ru";

  const [postsRes, categoriesRes] = await Promise.all([
    fetch(
      `${baseUrl}/api/blog?tag=${encodeURIComponent(decodedTag)}&page=${page}&limit=12`,
      { next: { revalidate: 60 } }
    ),
    fetch(`${baseUrl}/api/blog/categories`, { next: { revalidate: 300 } }),
  ]);

  let posts: BlogPostListItem[] = [];
  let totalPages = 1;
  let categories: { id: number; name: string; slug: string; postCount: number }[] = [];

  if (postsRes.ok) {
    const data = await postsRes.json();
    posts = data.posts || [];
    totalPages = data.totalPages || 1;
  }

  if (categoriesRes.ok) {
    categories = await categoriesRes.json();
  }

  return (
    <BlogPageClient
      initialPosts={posts}
      initialCategories={categories}
      currentPage={page}
      totalPages={totalPages}
      heroTitle={`Тег: ${decodedTag}`}
    />
  );
}
