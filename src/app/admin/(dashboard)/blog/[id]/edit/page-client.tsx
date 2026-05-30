"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import BlogEditor from "@/components/blog/BlogEditor";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  heroImage: string | null;
  status: "draft" | "published" | "archived";
  publishedAt: string | null;
  isPinned: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  readTime: number | null;
  categoryId: number | null;
  category?: { id: number; name: string; slug: string } | null;
  tags: string[];
  relatedProductIds: number[];
}

export default function EditBlogPost() {
  const params = useParams();
  const id = params.id as string;
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/blog/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setPost(data))
      .catch(() => setError("Не удалось загрузить статью"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-lg w-48" />
        <div className="h-64 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">{error || "Статья не найдена"}</p>
        <a
          href="/admin/blog"
          className="text-rose-500 hover:underline text-sm"
        >
          ← Вернуться к списку
        </a>
      </div>
    );
  }

  return <BlogEditor initialData={post} />;
}
