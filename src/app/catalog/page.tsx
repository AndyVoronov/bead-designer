"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ProductCard, ProductCardSkeleton } from "@/components/catalog/ProductCard";
import { QuickViewModal } from "@/components/catalog/QuickViewModal";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCartCount } from "@/hooks/useCartCount";
import { useToast } from "@/components/ui/ToastProvider";
import type { ProductListItem, Badge } from "@/types/catalog";
import type { ProductsQueryParams } from "@/types/catalog";

/* ── Types ────────────────────────────────────────────────────────────── */

interface ProductsResponse {
  products: ProductListItem[];
  total: number;
  page: number;
  totalPages: number;
  availableBadges: Badge[];
}

interface CategoryOption {
  id: number;
  name: string;
  slug: string;
  _count?: { products: number };
}

/* ── Constants ────────────────────────────────────────────────────────── */

const SORT_OPTIONS: { value: ProductsQueryParams["sort"]; label: string }[] = [
  { value: "newest", label: "Новые" },
  { value: "price-asc", label: "Сначала дешёвые" },
  { value: "price-desc", label: "Сначала дорогие" },
];

const AGE_OPTIONS = [
  { value: "0+", label: "0+" },
  { value: "6m+", label: "6 мес." },
  { value: "1+", label: "1 год" },
  { value: "3+", label: "3 года" },
  { value: "6+", label: "6 лет" },
];

const PRODUCTS_PER_PAGE = 12;

/* ── Page ─────────────────────────────────────────────────────────────── */

interface CatalogPageProps {
  initialCategory?: string;
}

export default function CatalogPage({ initialCategory }: CatalogPageProps) {
  return (
    <Suspense fallback={<CatalogLoadingFallback />}>
      <CatalogContent initialCategory={initialCategory} />
    </Suspense>
  );
}

function CatalogContent({ initialCategory }: CatalogPageProps) {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [availableBadges, setAvailableBadges] = useState<Badge[]>([]);
  const { cartCount } = useCartCount();
  const toast = useToast();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read initial state from URL
  const initialSearch = searchParams.get("search") ?? "";
  const initialPage = Number(searchParams.get("page")) || 1;

  // Filters
  const [search, setSearch] = useState(initialSearch);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategory ? [initialCategory] : []);
  const [page, setPage] = useState(initialPage);
  const [sort, setSort] = useState<ProductsQueryParams["sort"]>("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [selectedAge, setSelectedAge] = useState<string>("");
  const [quickViewSlug, setQuickViewSlug] = useState<string | null>(null);

  // UI
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Debounced price filters
  const priceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedMinPrice, setDebouncedMinPrice] = useState(minPrice);
  const [debouncedMaxPrice, setDebouncedMaxPrice] = useState(maxPrice);

  // Handle price input: update display immediately, debounce URL/search update
  const handleMinPriceChange = useCallback((value: string) => {
    setMinPrice(value);
    if (priceTimerRef.current) clearTimeout(priceTimerRef.current);
    priceTimerRef.current = setTimeout(() => {
      setDebouncedMinPrice(value);
    }, 500);
  }, []);

  const handleMaxPriceChange = useCallback((value: string) => {
    setMaxPrice(value);
    if (priceTimerRef.current) clearTimeout(priceTimerRef.current);
    priceTimerRef.current = setTimeout(() => {
      setDebouncedMaxPrice(value);
    }, 500);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (priceTimerRef.current) clearTimeout(priceTimerRef.current);
    };
  }, []);

  useEffect(() => setMounted(true), []);

  // Fetch categories from API (not hardcoded)
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : []))
      .then((cats: CategoryOption[]) => {
        setCategories(cats);
        const counts: Record<string, number> = {};
        (cats || []).forEach((c) => {
          if (c._count?.products) counts[c.slug] = c._count.products;
        });
        setCategoryCounts(counts);
      })
      .catch(() => {});
  }, []);

  // Build query
  const queryParams = useMemo(() => {
    const params: ProductsQueryParams = {
      page: String(page),
      limit: String(PRODUCTS_PER_PAGE),
    };
    if (selectedCategories.length > 0) params.category = selectedCategories.join(",");
    if (search) params.search = search;
    if (sort) params.sort = sort;
    if (debouncedMinPrice) params.minPrice = debouncedMinPrice;
    if (debouncedMaxPrice) params.maxPrice = debouncedMaxPrice;
    if (selectedBadges.length > 0) params.badges = selectedBadges.join(",");
    if (selectedAge) params.age = selectedAge;
    return params;
  }, [selectedCategories, search, sort, debouncedMinPrice, debouncedMaxPrice, selectedBadges, selectedAge, page]);

  // Sync page to URL (without triggering re-render)
  const syncPageUrl = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(window.location.search);
      if (newPage > 1) params.set("page", String(newPage));
      else params.delete("page");
      const qs = params.toString();
      const newUrl = qs ? `${pathname}?${qs}` : pathname;
      window.history.replaceState(null, "", newUrl);
    },
    [pathname],
  );

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const sp = new URLSearchParams();
      Object.entries(queryParams).forEach(([k, v]) => {
        if (v) sp.set(k, v);
      });
      const res = await fetch(`/api/products?${sp}`);
      if (res.ok) {
        const data: ProductsResponse = await res.json();
        setProducts(data.products);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        if (data.availableBadges) {
          setAvailableBadges(data.availableBadges);
        }
      } else {
        setFetchError(true);
      }
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
    syncPageUrl(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategories, search, sort, debouncedMinPrice, debouncedMaxPrice, selectedBadges, selectedAge]);

  // Sync URL when page changes
  useEffect(() => {
    syncPageUrl(page);
  }, [page, syncPageUrl]);

  // Badge toggle
  const toggleBadge = (label: string) => {
    setSelectedBadges((prev) =>
      prev.includes(label) ? prev.filter((b) => b !== label) : [...prev, label],
    );
  };

  // Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearch("");
    setSearchInput("");
    setSelectedCategories([]);
    setSort("newest");
    setMinPrice("");
    setMaxPrice("");
    setDebouncedMinPrice("");
    setDebouncedMaxPrice("");
    setSelectedBadges([]);
    setSelectedAge("");
  };

  const hasActiveFilters =
    selectedCategories.length > 0 || search || selectedBadges.length > 0 || selectedAge || minPrice || maxPrice;

  // Page change handler
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    // URL is synced via useEffect
  };

  /* ── Filter sidebar content (shared desktop/mobile) ───────────────── */

  const filterContent = (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Поиск</h3>
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Название товара..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent bg-gray-50"
              aria-label="Поиск по названию"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors cursor-pointer"
            aria-label="Найти"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </form>
      </div>

      {/* Categories */}
      <div role="radiogroup" aria-label="Категории">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Категории</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategories([])}
            role="checkbox"
            aria-checked={selectedCategories.length === 0}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              selectedCategories.length === 0
                ? "bg-rose-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Все
          </button>
          {categories.map((cat) => {
            const active = selectedCategories.includes(cat.slug);
            return (
              <button
                key={cat.slug}
                onClick={() => setSelectedCategories((prev) =>
                  active ? prev.filter((s) => s !== cat.slug) : [...prev, cat.slug]
                )}
                role="checkbox"
                aria-checked={active}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  active
                    ? "bg-rose-500 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat.name}
                {categoryCounts[cat.slug] != null && (
                  <span className="ml-1 opacity-70">({categoryCounts[cat.slug]})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price range */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Цена</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            value={minPrice}
            onChange={(e) => handleMinPriceChange(e.target.value)}
            placeholder="от"
            aria-label="Минимальная цена"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent bg-gray-50"
          />
          <span className="text-gray-300">—</span>
          <input
            type="number"
            min="0"
            value={maxPrice}
            onChange={(e) => handleMaxPriceChange(e.target.value)}
            placeholder="до"
            aria-label="Максимальная цена"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent bg-gray-50"
          />
        </div>
      </div>

      {/* Badges (from all products, not just current page) */}
      {availableBadges.length > 0 && (
        <div role="group" aria-label="Фильтр по меткам">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Метки</h3>
          <div className="flex flex-wrap gap-2">
            {availableBadges.map((badge) => {
              const active = selectedBadges.includes(badge.label);
              return (
                <button
                  key={badge.id}
                  onClick={() => toggleBadge(badge.label)}
                  aria-pressed={active}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border-2 ${
                    active
                      ? "shadow-sm scale-105"
                      : "opacity-60 hover:opacity-100"
                  }`}
                  style={{
                    backgroundColor: active ? badge.bgColor : "transparent",
                    color: active ? badge.textColor : badge.bgColor,
                    borderColor: badge.bgColor,
                  }}
                >
                  {badge.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Age filter */}
      <div role="radiogroup" aria-label="Возраст">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Возраст</h3>
        <div className="flex flex-wrap gap-2">
          {AGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedAge(selectedAge === opt.value ? "" : opt.value)}
              role="radio"
              aria-checked={selectedAge === opt.value}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                selectedAge === opt.value
                  ? "bg-rose-500 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full py-2 text-sm text-rose-500 hover:text-rose-600 font-medium hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
        >
          Сбросить фильтры
        </button>
      )}
    </div>
  );

  const skeletonGrid = (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: PRODUCTS_PER_PAGE }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );

  /* ── Render ────────────────────────────────────────────────────────── */

  return (
    <div className="home-page-root min-h-screen bg-[#FFF8F5]">
      {/* Header */}
      <PageHeader
        backHref="/"
        title="Каталог"
        subtitle={
          mounted && !loading
            ? `${total} ${total === 1 ? "товар" : total < 5 ? "товара" : "товаров"}`
            : undefined
        }
        cartCount={cartCount}
        showProfile
      >
        {/* Sort dropdown (desktop) */}
        <div className="hidden sm:block">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as ProductsQueryParams["sort"])}
            className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent cursor-pointer"
            aria-label="Сортировка"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Mobile filter toggle */}
        <button
          onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          className={`sm:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            mobileFiltersOpen
              ? "bg-rose-500 text-white"
              : "bg-gray-100 text-gray-600"
          }`}
          aria-expanded={mobileFiltersOpen}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="10" y1="18" x2="14" y2="18" />
          </svg>
          Фильтры
        </button>

        <Link
          href="/cart"
          className="relative inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-sm border border-gray-100 hover:bg-rose-50 hover:border-rose-200 transition-all duration-200 group sm:hidden"
          aria-label="Корзина"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-600 group-hover:text-rose-500 transition-colors"
            aria-hidden="true"
          >
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-rose-500 text-white text-[11px] font-bold rounded-full shadow-sm">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </Link>
      </PageHeader>

      {/* Mobile sort bar */}
      <div className="sm:hidden bg-white/60 backdrop-blur-sm border-b border-gray-100 px-4 py-2">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as ProductsQueryParams["sort"])}
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent cursor-pointer"
          aria-label="Сортировка"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Active filter pills (mobile) */}
      {hasActiveFilters && (
        <div className="sm:hidden flex flex-wrap gap-1.5 px-4 pb-2">
          {selectedCategories.length > 0 && selectedCategories.map((slug) => (
            <span key={slug} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-medium">
              {categories.find(c => c.slug === slug)?.name || slug}
              <button onClick={() => setSelectedCategories((prev) => prev.filter((s) => s !== slug))} className="hover:text-rose-800 cursor-pointer" aria-label="Убрать фильтр">&times;</button>
            </span>
          ))}
          {search && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-medium">
              Поиск: {search}
              <button onClick={() => { setSearch(""); setSearchInput(""); }} className="hover:text-rose-800 cursor-pointer" aria-label="Убрать фильтр">&times;</button>
            </span>
          )}
          {selectedAge && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-medium">
              Возраст: {selectedAge}
              <button onClick={() => setSelectedAge("")} className="hover:text-rose-800 cursor-pointer" aria-label="Убрать фильтр">&times;</button>
            </span>
          )}
          {(minPrice || maxPrice) && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-medium">
              Цена: {minPrice || "0"}–{maxPrice || "∞"}
              <button onClick={() => { setMinPrice(""); setMaxPrice(""); setDebouncedMinPrice(""); setDebouncedMaxPrice(""); }} className="hover:text-rose-800 cursor-pointer" aria-label="Убрать фильтр">&times;</button>
            </span>
          )}
          {selectedBadges.map((badge) => (
            <span key={badge} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-medium">
              {badge}
              <button onClick={() => toggleBadge(badge)} className="hover:text-rose-800 cursor-pointer" aria-label="Убрать фильтр">&times;</button>
            </span>
          ))}
        </div>
      )}

      {/* #2: No duplicate <main> — use <div> */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Mobile filter drawer */}
        <div
          className={`sm:hidden overflow-hidden transition-all duration-300 ${
            mobileFiltersOpen ? "max-h-[600px] mb-4" : "max-h-0"
          }`}
        >
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            {filterContent}
          </div>
        </div>

        <div className="flex gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden sm:block w-64 shrink-0">
            <div className="sticky top-20 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              {filterContent}
            </div>
          </aside>

          {/* Product grid */}
          <div className="flex-1 min-w-0">
            {loading ? (
              skeletonGrid
            ) : fetchError ? (
              /* Error state */
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <svg
                  className="w-20 h-20 text-gray-200 mb-4"
                  viewBox="0 0 100 100"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle cx="50" cy="50" r="40" stroke="#e5e7eb" strokeWidth="2" fill="#f3f4f6" />
                  <line x1="35" y1="35" x2="65" y2="65" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                  <line x1="65" y1="35" x2="35" y2="65" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-500 mb-1">
                  Не удалось загрузить товары
                </h2>
                <p className="text-sm text-gray-400 mb-4">
                  Проверьте подключение к интернету
                </p>
                <button
                  onClick={fetchProducts}
                  className="px-4 py-2 bg-rose-500 text-white rounded-xl text-sm font-medium hover:bg-rose-600 transition-colors cursor-pointer"
                >
                  Попробовать снова
                </button>
              </div>
            ) : products.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <svg
                  className="w-24 h-24 text-gray-200 mb-4"
                  viewBox="0 0 100 100"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect width="100" height="100" rx="12" fill="currentColor" />
                  <circle
                    cx="50"
                    cy="42"
                    r="16"
                    stroke="#d1d5db"
                    strokeWidth="2"
                    fill="none"
                  />
                  <path
                    d="M28 80h44l-6-24h-32l-6 24z"
                    stroke="#d1d5db"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>
                <h2 className="text-lg font-semibold text-gray-500 mb-1">
                  Ничего не найдено
                </h2>
                <p className="text-sm text-gray-400 mb-4">
                  Попробуйте изменить параметры поиска
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-rose-50 text-rose-500 rounded-xl text-sm font-medium hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    Сбросить фильтры
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Showing X-Y of Z */}
                {mounted && !loading && products.length > 0 && (
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-400">
                      Показано {((page - 1) * PRODUCTS_PER_PAGE) + 1}–{Math.min(page * PRODUCTS_PER_PAGE, total)} из {total}
                    </p>
                  </div>
                )}
                {/* #9: priority on first batch */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {products.map((product, idx) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      priority={page === 1 && idx < 4}
                      onQuickView={setQuickViewSlug}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => handlePageChange(Math.max(1, page - 1))}
                      disabled={page <= 1}
                      className="px-3 py-2 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-default transition-all cursor-pointer"
                    >
                      ← Назад
                    </button>

                    <div className="flex items-center gap-1" role="navigation" aria-label="Пагинация">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => {
                          if (p === 1 || p === totalPages) return true;
                          if (Math.abs(p - page) <= 1) return true;
                          return false;
                        })
                        .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                          if (idx > 0) {
                            const prev = arr[idx - 1];
                            if (p - prev > 1) acc.push("...");
                          }
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((item, idx) =>
                          item === "..." ? (
                            <span
                              key={`dots-${idx}`}
                              className="px-2 text-gray-400 text-sm"
                              aria-hidden="true"
                            >
                              ...
                            </span>
                          ) : (
                            <button
                              key={item}
                              onClick={() => handlePageChange(item as number)}
                              aria-label={`Страница ${item}`}
                              aria-current={page === item ? "page" : undefined}
                              className={`w-11 h-11 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                                page === item
                                  ? "bg-rose-500 text-white shadow-sm"
                                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              {item}
                            </button>
                          ),
                        )}
                    </div>

                    <button
                      onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                      disabled={page >= totalPages}
                      className="px-3 py-2 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-default transition-all cursor-pointer"
                    >
                      Далее →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-6 border-t border-gray-100 mt-4" aria-label="Навигация по сайту">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-400">
          <Link href="/" className="hover:text-rose-500 transition-colors">Главная</Link>
          <Link href="/about" className="hover:text-rose-500 transition-colors">О нас</Link>
          <Link href="/delivery" className="hover:text-rose-500 transition-colors">Доставка</Link>
          <Link href="/faq" className="hover:text-rose-500 transition-colors">FAQ</Link>
          <Link href="/reviews" className="hover:text-rose-500 transition-colors">Отзывы</Link>
        </div>
      </nav>

      {/* Quick View Modal */}
      {quickViewSlug && (
        <QuickViewModal slug={quickViewSlug} onClose={() => setQuickViewSlug(null)} />
      )}
    </div>
  );
}

function CatalogLoadingFallback() {
  return (
    <div className="home-page-root min-h-screen bg-[#FFF8F5]">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-20 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-8 w-8 bg-gray-100 rounded-full animate-pulse" />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-24 bg-gray-100 rounded-full animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="aspect-square bg-gray-100 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
                <div className="h-5 w-1/2 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
