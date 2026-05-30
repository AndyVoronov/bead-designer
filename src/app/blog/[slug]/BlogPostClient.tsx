"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, Clock, Calendar, Tag, ChevronRight, User as UserIcon } from "lucide-react";
import { BlogContent } from "@/components/blog/BlogContent";
import { BlogCard } from "@/components/blog/BlogCard";
import { BlogComments } from "@/components/blog/BlogComments";
import { ShareButtons } from "@/components/blog/ShareButtons";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCartCount } from "@/hooks/useCartCount";
import { getEffectivePrice, formatPrice } from "@/lib/catalog-utils";

const MONTHS_RU = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function formatDateRu(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()]} ${d.getFullYear()}`;
}

interface PostData {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  heroImage: string | null;
  readTime: number;
  views: number;
  publishedAt: string | null;
  category: { id: number; name: string; slug: string } | null;
  author: { id: number; name: string | null; avatar: string | null } | null;
  tags: string[];
}

interface ProductBasic {
  id: number;
  name: string;
  slug: string;
  basePrice: number;
  discountPercent: number;
  images: { id: number; url: string }[];
}

interface BlogPostClientProps {
  post: PostData;
  products: [number, ProductBasic][];
  relatedPosts: {
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    heroImage: string | null;
    readTime: number;
    publishedAt: string | null;
    views: number;
    isPinned: boolean;
    category: { id: number; name: string; slug: string } | null;
    tags: string[];
  }[];
  productIds: number[];
  articleJsonLd: Record<string, unknown>;
  breadcrumbJsonLd: Record<string, unknown>;
}

export function BlogPostClient({
  post,
  products,
  relatedPosts,
  productIds,
  articleJsonLd,
  breadcrumbJsonLd,
}: BlogPostClientProps) {
  const { cartCount } = useCartCount();
  const productMap = new Map<number, ProductBasic>(products);

  const imageUrl = post.heroImage ? `/api${post.heroImage}` : null;
  const postUrl = typeof window !== "undefined"
    ? `${window.location.origin}/blog/${post.slug}`
    : `/blog/${post.slug}`;

  // Filter to only products that were found in DB
  const relevantProducts = productIds
    .map((id) => productMap.get(id))
    .filter((p): p is ProductBasic => !!p);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <PageHeader backHref="/blog" title="Блог" cartCount={cartCount} />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumbs */}
        <nav aria-label="Хлебные крошки" className="mb-6">
          <ol className="flex items-center gap-1.5 text-sm text-gray-400 flex-wrap">
            <li>
              <Link href="/" className="hover:text-rose-500 transition-colors">
                Главная
              </Link>
            </li>
            <li>
              <ChevronRight size={12} />
            </li>
            <li>
              <Link href="/blog" className="hover:text-rose-500 transition-colors">
                Блог
              </Link>
            </li>
            {post.category && (
              <>
                <li>
                  <ChevronRight size={12} />
                </li>
                <li>
                  <Link
                    href={`/blog/category/${post.category.slug}`}
                    className="hover:text-rose-500 transition-colors"
                  >
                    {post.category.name}
                  </Link>
                </li>
              </>
            )}
            <li>
              <ChevronRight size={12} />
            </li>
            <li className="text-gray-600 truncate max-w-[200px]" aria-current="page">
              {post.title}
            </li>
          </ol>
        </nav>

        {/* Hero image */}
        {imageUrl && (
          <div className="relative w-full max-h-[400px] rounded-xl overflow-hidden bg-gray-100 mb-8">
            <Image
              src={imageUrl}
              alt={post.title}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Article header */}
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
            {post.title}
          </h1>

          {/* Meta row */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-400">
            {/* Author */}
            <div className="flex items-center gap-1.5">
              {post.author?.avatar ? (
                <img
                  src={post.author.avatar}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
                  <UserIcon size={10} className="text-white" />
                </div>
              )}
              <span className="text-gray-600 font-medium">
                {post.author?.name || "5 минут тишины"}
              </span>
            </div>

            <span className="text-gray-200">|</span>

            {/* Date */}
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {formatDateRu(post.publishedAt)}
            </span>

            {/* Read time */}
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {post.readTime} мин
            </span>

            {/* Views */}
            <span className="flex items-center gap-1">
              <Eye size={14} />
              {post.views}
            </span>

            {/* Category */}
            {post.category && (
              <>
                <span className="text-gray-200">|</span>
                <Link
                  href={`/blog/category/${post.category.slug}`}
                  className="text-rose-500 hover:text-rose-600 font-medium transition-colors"
                >
                  {post.category.name}
                </Link>
              </>
            )}
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Tag size={14} className="text-gray-300" />
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/blog/tag/${encodeURIComponent(tag)}`}
                  className="px-2.5 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-rose-50 hover:text-rose-500 rounded-full transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Share */}
          <div className="mt-4">
            <ShareButtons title={post.title} url={postUrl} />
          </div>
        </header>

        {/* Article content */}
        <BlogContent content={post.content} products={productMap} />

        {/* Share bottom */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <ShareButtons title={post.title} url={postUrl} />
        </div>

        {/* Product recommendations */}
        {relevantProducts.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              🛍️ Товары из статьи
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relevantProducts.map((product) => {
                const price = getEffectivePrice(product.basePrice, product.discountPercent);
                const img = product.images.length > 0 ? `/api${product.images[0].url}` : null;

                return (
                  <div
                    key={product.id}
                    className="flex gap-3 bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <Link
                      href={`/catalog/${product.slug}`}
                      className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0"
                    >
                      {img ? (
                        <Image
                          src={img}
                          alt={product.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-rose-50 to-pink-50 text-gray-300 text-lg">
                          📦
                        </div>
                      )}
                    </Link>
                    <div className="flex flex-col justify-between flex-1 min-w-0">
                      <Link
                        href={`/catalog/${product.slug}`}
                        className="font-semibold text-sm text-gray-900 line-clamp-2 hover:text-rose-600 transition-colors"
                      >
                        {product.name}
                      </Link>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm font-bold text-rose-600">
                          {formatPrice(price)}
                        </span>
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/cart", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ productId: product.id, quantity: 1 }),
                              });
                              if (res.ok) {
                                window.dispatchEvent(new CustomEvent("cart-updated"));
                              }
                            } catch { /* ignore */ }
                          }}
                          className="text-xs font-semibold text-rose-500 hover:text-rose-600 px-2 py-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          В корзину
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Comments */}
        <BlogComments postId={post.id} />

        {/* Related posts */}
        {relatedPosts.length > 0 && (
          <section className="mt-12 pt-8 border-t border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Похожие статьи
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedPosts.map((rp) => (
                <BlogCard
                  key={rp.id}
                  post={{
                    ...rp,
                    tags: rp.tags || [],
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
