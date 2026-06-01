"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { useCartCount } from "@/hooks/useCartCount";
import { PageHeader } from "@/components/layout/PageHeader";
import { BlogCard, type BlogPostListItem } from "@/components/blog/BlogCard";
import { Pagination } from "@/components/blog/Pagination";
import { BlogSubscribeForm } from "@/components/blog/BlogSubscribeForm";
import { Mail, BookOpen, Tag, Search, ChevronLeft, ChevronRight, X } from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const basePath = activeCategorySlug
    ? `/blog/category/${activeCategorySlug}`
    : heroTitle
      ? `/blog/tag/${encodeURIComponent(heroTitle.replace("Тег: ", ""))}`
      : "/blog";

  const isTagPage = !!heroTitle;
  const heroHeading = heroTitle || (activeCategoryName ? activeCategoryName : "Блог");
  const heroSubtitle = isTagPage
    ? "Статьи с этим тегом"
    : activeCategoryName
      ? `Статьи в категории «${activeCategoryName}»`
      : "Полезные статьи о развитии малышей, уходе за изделиями и выборе подарков";

  // Filter categories by search
  const categoriesWithEmoji = initialCategories.map((cat) => ({
    ...cat,
    emoji: getEmoji(cat),
  }));
  const filteredCategories = searchQuery.trim()
    ? categoriesWithEmoji.filter((cat) =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categoriesWithEmoji;

  // Mobile scroll detection
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
    el.scrollBy({ left: direction === "left" ? -200 : 200, behavior: "smooth" });
  };

  // ── Sidebar link component ──
  const SidebarLink = ({ href, emoji, label, count, active }: {
    href: string;
    emoji?: string;
    label: string;
    count?: number;
    active: boolean;
  }) => (
    <Link
      href={href}
      onClick={() => setMobileMenuOpen(false)}
      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-all duration-200 ${
        active
          ? "bg-rose-50 text-rose-600 font-semibold"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-700 font-medium"
      }`}
    >
      {emoji && <span className="text-base flex-shrink-0">{emoji}</span>}
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className={`text-xs flex-shrink-0 tabular-nums ${
          active ? "text-rose-400" : "text-gray-300"
        }`}>
          {count}
        </span>
      )}
      {active && (
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
      )}
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50/50">
      <PageHeader backHref="/" title="Блог" cartCount={cartCount} showProfile showCatalog />

      {/* Hero — compact */}
      <section className="bg-gradient-to-br from-rose-50 via-pink-50 to-rose-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-10 text-center">
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm text-rose-500 text-xs font-bold px-3 py-1.5 rounded-full mb-3 shadow-sm">
            {isTagPage ? <Tag size={14} /> : <BookOpen size={14} />}
            {isTagPage ? "Тег" : "Полезные статьи"}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{heroHeading}</h1>
          <p className="mt-2 text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">{heroSubtitle}</p>
        </div>
      </section>

      {/* Mobile: category pill bar + toggle */}
      {!isTagPage && categoriesWithEmoji.length > 0 && (
        <div className="md:hidden max-w-7xl mx-auto px-4 -mt-4 mb-2">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
            <Link
              href="/blog"
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-full transition-all ${
                !activeCategorySlug
                  ? "bg-rose-500 text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-500 hover:border-rose-300 hover:text-rose-500"
              }`}
            >
              ✨ Все
            </Link>
            {categoriesWithEmoji.map((cat) => (
              <Link
                key={cat.id}
                href={`/blog/category/${cat.slug}`}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-full transition-all ${
                  activeCategorySlug === cat.slug
                    ? "bg-rose-500 text-white shadow-sm"
                    : "bg-white border border-gray-200 text-gray-500 hover:border-rose-300 hover:text-rose-500"
                }`}
              >
                {cat.emoji} {cat.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Main content: sidebar + posts */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex gap-6">
        {/* ── LEFT SIDEBAR (desktop) ── */}
        {!isTagPage && categoriesWithEmoji.length > 0 && (
          <>
            {/* Desktop sidebar */}
            <aside className="hidden md:block w-56 flex-shrink-0">
              <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pb-6 pr-1">
                {/* Search */}
                <div className="sticky top-0 z-10 mb-5">
                  <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm">
                    <Search size={14} className="text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Найти категорию..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 min-w-0 border-none bg-transparent text-sm text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-0 py-0"
                    />
                  </div>
                </div>

                {/* All link */}
                <SidebarLink
                  href="/blog"
                  emoji="✨"
                  label="Все статьи"
                  count={initialCategories.reduce((sum, c) => sum + c.postCount, 0)}
                  active={!activeCategorySlug}
                />

                {/* Divider */}
                <div className="my-3 border-t border-gray-100" />

                {/* Category links */}
                <div className="space-y-0.5">
                  {filteredCategories.map((cat) => (
                    <SidebarLink
                      key={cat.id}
                      href={`/blog/category/${cat.slug}`}
                      emoji={cat.emoji}
                      label={cat.name}
                      count={cat.postCount}
                      active={activeCategorySlug === cat.slug}
                    />
                  ))}
                </div>

                {searchQuery && filteredCategories.length === 0 && (
                  <p className="mt-4 text-center text-xs text-gray-400">Ничего не найдено</p>
                )}
              </div>
            </aside>

            {/* Mobile: full-width category drawer */}
            <div className={`md:hidden fixed inset-0 z-40 ${mobileMenuOpen ? "block" : "hidden"}`}>
              {/* Overlay */}
              <div
                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                onClick={() => setMobileMenuOpen(false)}
              />
              {/* Drawer */}
              <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl overflow-y-auto">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-800">Категории</span>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 mb-3">
                    <Search size={14} className="text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Найти..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 min-w-0 border-none bg-transparent text-sm text-gray-600 placeholder:text-gray-400 focus:outline-none py-0"
                    />
                  </div>
                  <SidebarLink
                    href="/blog"
                    emoji="✨"
                    label="Все статьи"
                    count={initialCategories.reduce((sum, c) => sum + c.postCount, 0)}
                    active={!activeCategorySlug}
                  />
                  <div className="my-2 border-t border-gray-100" />
                  <div className="space-y-0.5">
                    {filteredCategories.map((cat) => (
                      <SidebarLink
                        key={cat.id}
                        href={`/blog/category/${cat.slug}`}
                        emoji={cat.emoji}
                        label={cat.name}
                        count={cat.postCount}
                        active={activeCategorySlug === cat.slug}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 min-w-0">
          {initialPosts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-4">📝</p>
              <p className="text-gray-400 text-lg">Пока нет статей</p>
              <p className="text-gray-300 text-sm mt-1">Скоро здесь появятся полезные материалы</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {initialPosts.map((post) => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
              <Pagination currentPage={currentPage} totalPages={totalPages} basePath={basePath} />
            </>
          )}

          {/* Subscribe */}
          <div className="mt-8 max-w-lg">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="text-center mb-3">
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-rose-50 text-rose-500 mb-2">
                  <Mail size={18} />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">Подписаться на обновления</h3>
                <p className="text-xs text-gray-400 mt-0.5">Получайте новые статьи на почту</p>
              </div>
              <BlogSubscribeForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
