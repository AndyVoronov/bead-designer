"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { useCartCount } from "@/hooks/useCartCount";
import { PageHeader } from "@/components/layout/PageHeader";
import { BlogCard, type BlogPostListItem } from "@/components/blog/BlogCard";
import { Pagination } from "@/components/blog/Pagination";
import { BlogSubscribeForm } from "@/components/blog/BlogSubscribeForm";
import { Mail, BookOpen, Tag, ChevronLeft, ChevronRight } from "lucide-react";

interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  postCount: number;
  description?: string | null;
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

const FALLBACK_EMOJI: Record<string, string> = {
  "razvitie-malysha": "🧒",
  "pervye-shagi": "👶",
  "pitanie-i-prikorm": "🍼",
  "son-i-rezhim": "😴",
  "igry-i-razvlecheniya": "🎮",
  "zdorovie-malysha": "🩺",
  "bezopasnost": "🛡️",
  "psikhologiya-i-vospitanie": "🧠",
  "protezivanie-zubov": "🦷",
  "tvorchestvo-i-rukodelie": "🎨",
  "podgotovka-k-rodam": "🤰",
  "ukhod-za-malyshom": "🧴",
  "vybor-igrush": "🧸",
  "progulki-i-puteshestviya": "🚶",
  "razvivayushchie-zanyatiya": "📚",
  "odezhda-i-garderob": "👗",
  "recepty-dlya-malyshei": "🥣",
  "mamin-otdykh": "☕",
  "gotovimsya-k-shkole": "🏫",
  "podarki-i-idei": "🎁",
};

function getEmoji(cat: BlogCategory): string {
  if (cat.description) {
    // description stores just the emoji as first char
    const first = cat.description.trim()[0];
    if (first && /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u.test(first)) {
      return first;
    }
  }
  return FALLBACK_EMOJI[cat.slug] || "📌";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  // Scroll detection for fade masks on mobile
  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    window.addEventListener("resize", updateScrollButtons);
    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, []);

  const scrollBy = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = direction === "left" ? -200 : 200;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  const categoriesWithEmoji = initialCategories.map((cat) => ({
    ...cat,
    emoji: getEmoji(cat),
  }));

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

      {/* Categories — Desktop: 2 rows of 10, Mobile: horizontal scroll */}
      {!isTagPage && categoriesWithEmoji.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-5">
          {/* Desktop grid: 2 rows × 10 columns */}
          <div className="hidden lg:grid lg:grid-cols-10 lg:gap-2.5">
            {/* "Все" button first */}
            <Link
              href="/blog"
              className={`flex flex-col items-center justify-center gap-1 py-3 px-1 rounded-2xl transition-all duration-200 ${
                !activeCategorySlug
                  ? "bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-md shadow-rose-200"
                  : "bg-white text-gray-600 shadow-sm hover:-translate-y-0.5 hover:shadow-md"
              }`}
            >
              <span className="text-xl">✨</span>
              <span className="text-xs font-semibold leading-tight text-center">Все</span>
            </Link>
            {categoriesWithEmoji.map((cat) => (
              <Link
                key={cat.id}
                href={`/blog/category/${cat.slug}`}
                className={`flex flex-col items-center justify-center gap-1 py-3 px-1 rounded-2xl transition-all duration-200 ${
                  activeCategorySlug === cat.slug
                    ? "bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-md shadow-rose-200"
                    : "bg-white text-gray-600 shadow-sm hover:-translate-y-0.5 hover:shadow-md"
                }`}
              >
                <span className="text-xl">{cat.emoji}</span>
                <span className="text-[11px] font-medium leading-tight text-center">{cat.name}</span>
                {cat.postCount > 0 && (
                  <span className={`text-[10px] ${activeCategorySlug === cat.slug ? "text-white/70" : "text-gray-400"}`}>
                    {cat.postCount}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Mobile + Tablet: horizontal scroll */}
          <div className="lg:hidden relative">
            {/* Left fade mask + arrow */}
            {canScrollLeft && (
              <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center">
                <div className="absolute left-0 inset-y-0 w-8 bg-gradient-to-r from-gray-50/95 to-transparent pointer-events-none" />
                <button
                  onClick={() => scrollBy("left")}
                  className="relative ml-1 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-md text-gray-500 hover:text-rose-500 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
            )}

            {/* Scrollable cards */}
            <div
              ref={scrollRef}
              className="flex gap-2.5 overflow-x-auto pb-3 pt-1 px-1 scrollbar-hide scroll-smooth"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {/* "Все" button */}
              <Link
                href="/blog"
                className={`shrink-0 flex flex-col items-center justify-center gap-1.5 w-[80px] py-3 rounded-2xl transition-all duration-200 ${
                  !activeCategorySlug
                    ? "bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-md shadow-rose-200"
                    : "bg-white text-gray-600 shadow-sm hover:-translate-y-0.5 hover:shadow-md"
                }`}
              >
                <span className="text-2xl">✨</span>
                <span className="text-xs font-semibold">Все</span>
              </Link>
              {categoriesWithEmoji.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/blog/category/${cat.slug}`}
                  className={`shrink-0 flex flex-col items-center justify-center gap-1 w-[80px] py-3 rounded-2xl transition-all duration-200 ${
                    activeCategorySlug === cat.slug
                      ? "bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-md shadow-rose-200"
                      : "bg-white text-gray-600 shadow-sm hover:-translate-y-0.5 hover:shadow-md"
                  }`}
                >
                  <span className="text-2xl">{cat.emoji}</span>
                  <span className="text-[11px] font-medium text-center leading-tight px-1">{cat.name}</span>
                  {cat.postCount > 0 && (
                    <span className={`text-[10px] ${activeCategorySlug === cat.slug ? "text-white/70" : "text-gray-400"}`}>
                      {cat.postCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            {/* Right fade mask + arrow */}
            {canScrollRight && (
              <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center">
                <div className="absolute right-0 inset-y-0 w-8 bg-gradient-to-l from-gray-50/95 to-transparent pointer-events-none" />
                <button
                  onClick={() => scrollBy("right")}
                  className="relative mr-1 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-md text-gray-500 hover:text-rose-500 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
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
