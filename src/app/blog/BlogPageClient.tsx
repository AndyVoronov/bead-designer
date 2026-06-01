"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { useCartCount } from "@/hooks/useCartCount";
import { PageHeader } from "@/components/layout/PageHeader";
import { BlogCard, type BlogPostListItem } from "@/components/blog/BlogCard";
import { Pagination } from "@/components/blog/Pagination";
import { BlogSubscribeForm } from "@/components/blog/BlogSubscribeForm";
import {
  Mail,
  BookOpen,
  Tag,
  Search,
  X,
  Baby,
  Footprints,
  Milk,
  Moon,
  Gamepad2,
  HeartPulse,
  ShieldCheck,
  Brain,
  Smile,
  Palette,
  Heart,
  Droplets,
  Shapes,
  Mountain,
  GraduationCap,
  Shirt,
  Soup,
  Coffee,
  School,
  Gift,
  Sparkles,
  LayoutGrid,
  Menu,
  type LucideIcon,
} from "lucide-react";

// ── Icon mapping for categories ──
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "razvitie-malysha": Baby,
  "pervye-shagi": Footprints,
  "pitanie-i-prikorm": Milk,
  "son-i-rezhim": Moon,
  "igry-i-razvlecheniya": Gamepad2,
  "zdorovie-malysha": HeartPulse,
  "bezopasnost": ShieldCheck,
  "psikhologiya-i-vospitanie": Brain,
  "protezivanie-zubov": Smile,
  "tvorchestvo-i-rukodelie": Palette,
  "podgotovka-k-rodam": Heart,
  "ukhod-za-malyshom": Droplets,
  "vybor-igrush": Shapes,
  "progulki-i-puteshestviya": Mountain,
  "razvivayushchie-zanyatiya": GraduationCap,
  "odezhda-i-garderob": Shirt,
  "recepty-dlya-malyshei": Soup,
  "mamin-otdykh": Coffee,
  "gotovimsya-k-shkole": School,
  "podarki-i-idei": Gift,
};

function getCatIcon(slug: string): LucideIcon {
  return CATEGORY_ICONS[slug] || LayoutGrid;
}

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

  const categoriesWithIcons = initialCategories.map((cat) => ({
    ...cat,
    Icon: getCatIcon(cat.slug),
  }));

  const filteredCategories = searchQuery.trim()
    ? categoriesWithIcons.filter((cat) =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categoriesWithIcons;

  const totalCount = initialCategories.reduce((sum, c) => sum + c.postCount, 0);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  // ── Sidebar link component ──
  const SidebarLink = ({ href, Icon: CatIcon, label, count, active }: {
    href: string;
    Icon: LucideIcon;
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
      <CatIcon
        size={16}
        className={`flex-shrink-0 ${active ? "text-rose-500" : "text-gray-400"}`}
        strokeWidth={active ? 2.2 : 1.8}
      />
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

      {/* ── MOBILE HAMBURGER + CATEGORY MENU ── */}
      {!isTagPage && (
        <div className="md:hidden sticky top-[52px] z-30 bg-white/90 backdrop-blur-lg border-b border-gray-100">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center gap-2 text-gray-600 hover:text-rose-500 transition-colors text-sm font-semibold"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {mobileMenuOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
              {activeCategoryName || "Категории"}
            </button>
            {(activeCategorySlug || activeCategoryName) && (
              <Link href="/blog" className="ml-auto text-xs text-rose-500 font-medium hover:text-rose-600 transition-colors">
                Все статьи
              </Link>
            )}
          </div>

          {/* Mobile dropdown */}
          {mobileMenuOpen && (
            <div className="border-t border-gray-100 bg-white/95 backdrop-blur-lg shadow-lg">
              {/* Search */}
              <div className="px-4 pt-3 pb-2">
                <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5">
                  <Search size={14} className="text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Найти категорию..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 min-w-0 border-none bg-transparent text-sm text-gray-600 placeholder:text-gray-400 focus:outline-none py-0"
                    autoFocus
                  />
                </div>
              </div>
              <div className="px-2 pb-3 max-h-[60vh] overflow-y-auto">
                <SidebarLink
                  href="/blog"
                  Icon={Sparkles}
                  label="Все статьи"
                  count={totalCount}
                  active={!activeCategorySlug}
                />
                <div className="my-1 border-t border-gray-100 mx-2" />
                <div className="space-y-0.5">
                  {filteredCategories.map((cat) => (
                    <SidebarLink
                      key={cat.id}
                      href={`/blog/category/${cat.slug}`}
                      Icon={cat.Icon}
                      label={cat.name}
                      count={cat.postCount}
                      active={activeCategorySlug === cat.slug}
                    />
                  ))}
                </div>
                {searchQuery && filteredCategories.length === 0 && (
                  <p className="py-6 text-center text-xs text-gray-400">Ничего не найдено</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hero — compact */}
      {(isTagPage || activeCategorySlug || activeCategoryName) && (
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
      )}

      {/* Main content: sidebar + posts */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex gap-6">
        {/* ── LEFT SIDEBAR (desktop only) ── */}
        {!isTagPage && categoriesWithIcons.length > 0 && (
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

              <SidebarLink
                href="/blog"
                Icon={Sparkles}
                label="Все статьи"
                count={totalCount}
                active={!activeCategorySlug}
              />

              <div className="my-3 border-t border-gray-100" />

              <div className="space-y-0.5">
                {filteredCategories.map((cat) => (
                  <SidebarLink
                    key={cat.id}
                    href={`/blog/category/${cat.slug}`}
                    Icon={cat.Icon}
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
        )}

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 min-w-0">
          {initialPosts.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-100 mb-4">
                <BookOpen size={28} className="text-gray-300" />
              </div>
              <p className="text-gray-400 text-lg font-medium">Пока нет статей</p>
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
