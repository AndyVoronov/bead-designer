"use client";

import Link from "next/link";
import { useCartCount } from "@/hooks/useCartCount";
import { PageHeader } from "@/components/layout/PageHeader";
import { BlogCard, type BlogPostListItem } from "@/components/blog/BlogCard";
import { Pagination } from "@/components/blog/Pagination";
import { BlogSubscribeForm } from "@/components/blog/BlogSubscribeForm";
import { Mail, BookOpen, Tag } from "lucide-react";

interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  postCount: number;
}

interface BlogPageClientProps {
  initialPosts: BlogPostListItem[];
  initialCategories: BlogCategory[];
  currentPage: number;
  totalPages: number;
  activeCategorySlug?: string;
  activeCategoryName?: string;
  heroTitle?: string;
}

export function BlogPageClient({
  initialPosts,
  initialCategories,
  currentPage,
  totalPages,
  activeCategorySlug,
  activeCategoryName,
  heroTitle,
}: BlogPageClientProps) {
  const { cartCount } = useCartCount();

  // Determine the base path for pagination
  const basePath = activeCategorySlug
    ? `/blog/category/${activeCategorySlug}`
    : heroTitle
      ? `/blog/tag/${encodeURIComponent(heroTitle.replace("Тег: ", ""))}`
      : "/blog";

  // Determine hero content
  const isTagPage = !!heroTitle;
  const heroHeading = heroTitle || (activeCategoryName ? activeCategoryName : "Блог");
  const heroSubtitle = isTagPage
    ? "Статьи с этим тегом"
    : activeCategoryName
      ? `Статьи в категории «${activeCategoryName}»`
      : "Полезные статьи о развитии малышей, уходе за изделиями и выборе подарков";

  return (
    <div className="min-h-screen bg-gray-50/50">
      <PageHeader backHref="/" title="Блог" cartCount={cartCount} showProfile showCatalog />

      {/* Hero */}
      <section className="bg-gradient-to-br from-rose-50 via-pink-50 to-rose-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14 text-center">
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm text-rose-500 text-xs font-bold px-3 py-1.5 rounded-full mb-4 shadow-sm">
            {isTagPage ? <Tag size={14} /> : <BookOpen size={14} />}
            {isTagPage ? "Тег" : "Полезные статьи"}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            {heroHeading}
          </h1>
          <p className="mt-3 text-gray-500 max-w-xl mx-auto leading-relaxed">
            {heroSubtitle}
          </p>
        </div>
      </section>

      {/* Categories */}
      {!isTagPage && initialCategories.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-5">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Link
              href="/blog"
              className={`shrink-0 px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
                !activeCategorySlug
                  ? "bg-rose-500 text-white shadow-sm hover:bg-rose-600"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-rose-300 hover:text-rose-500"
              }`}
            >
              Все
            </Link>
            {initialCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/blog/category/${cat.slug}`}
                className={`shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  activeCategorySlug === cat.slug
                    ? "bg-rose-500 text-white shadow-sm hover:bg-rose-600"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-rose-300 hover:text-rose-500"
                }`}
              >
                {cat.name}
                <span className="ml-1.5 text-xs text-gray-400">
                  {cat.postCount}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Posts grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {initialPosts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">📝</p>
            <p className="text-gray-400 text-lg">Пока нет статей</p>
            <p className="text-gray-300 text-sm mt-1">
              Скоро здесь появятся полезные материалы
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {initialPosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        )}

        <Pagination currentPage={currentPage} totalPages={totalPages} basePath={basePath} />
      </div>

      {/* Subscribe */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-12">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-rose-50 text-rose-500 mb-2">
              <Mail size={20} />
            </div>
            <h3 className="font-bold text-gray-900">Подписаться на обновления</h3>
            <p className="text-sm text-gray-400 mt-1">
              Получайте новые статьи на почту
            </p>
          </div>
          <BlogSubscribeForm />
        </div>
      </div>
    </div>
  );
}
