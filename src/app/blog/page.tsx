import type { Metadata } from "next";
import { type BlogPostListItem } from "@/components/blog/BlogCard";
import { BlogPageClient } from "./BlogPageClient";

export const metadata: Metadata = {
  title: "Блог",
  description:
    "Полезные статьи о развитии малышей, уходе за изделиями и выборе подарков — 5 минут тишины",
  openGraph: {
    title: "Блог — 5 минут тишины",
    description:
      "Полезные статьи о развитии малышей, уходе за изделиями и выборе подарков",
    type: "website",
  },
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://5minutesofsilence.ru";

  const [postsRes, categoriesRes] = await Promise.all([
    fetch(`${baseUrl}/api/blog?page=${page}&limit=12`, { next: { revalidate: 60 } }),
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
    />
  );
}
