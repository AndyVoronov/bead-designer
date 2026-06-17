"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageGallery } from "@/components/catalog/ImageGallery";
import { FavoriteButton } from "@/components/catalog/ProductCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCartCount } from "@/hooks/useCartCount";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useToast } from "@/components/ui/ToastProvider";
import { TrustIcon } from "@/components/catalog/TrustIcon";
import {
  getEffectivePrice,
  formatPrice,
} from "@/lib/catalog-utils";

/* ── Types ────────────────────────────────────────────────────────────── */

export interface ProductImage {
  id: number;
  url: string;
  order: number;
  isMain: boolean;
}

interface Badge {
  id: number;
  label: string;
  textColor: string;
  bgColor: string;
}

interface TrustBadge {
  id: number;
  label: string;
  icon: string;
  description: string | null;
}

interface CompositeChildItem {
  id: number;
  quantity: number;
  child: {
    id: number;
    name: string;
    slug: string;
    basePrice: number;
    discountPercent: number;
    mainImage: { id: number; url: string } | null;
  };
}

interface IncludedInBundle {
  id: number;
  quantity: number;
  bundle: {
    id: number;
    name: string;
    slug: string;
    basePrice: number;
    discountPercent: number;
    mainImage: { id: number; url: string } | null;
  };
}

interface ProductDetail {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  basePrice: number;
  discountPercent: number;
  type: "simple" | "composite";
  category: { id: number; name: string; slug: string } | null;
  images: ProductImage[];
  badges: Badge[];
  trustBadges: TrustBadge[];
  compositeItems: CompositeChildItem[];
  includedInBundles: IncludedInBundle[];
  stockQuantity: number;
  recommendedAge: string | null;
}

interface RelatedProduct {
  id: number;
  name: string;
  slug: string;
  basePrice: number;
  discountPercent: number;
  mainImage: { id: number; url: string } | null;
}

interface ProductReview {
  id: number;
  authorName: string;
  rating: number;
  text: string;
  createdAt: string;
  product: { id: number; name: string; slug: string } | null;
}

/* ── Small product image helper (reusable for composite/bundle/related) ── */

function SmallProductImage({
  mainImage,
  name,
  className,
  sizes,
}: {
  mainImage: { id: number; url: string } | null;
  name: string;
  className?: string;
  sizes?: string;
}) {
  if (!mainImage) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-100 ${className ?? ""}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
        </svg>
      </div>
    );
  }
  return (
    <Image
      src={`/api${mainImage.url}`}
      alt={name}
      fill
      className={`object-cover ${className ?? ""}`}
      sizes={sizes ?? "48px"}
    />
  );
}

/* ── Description with "read more" collapse (#13) ── */

const DESCRIPTION_COLLAPSE_LENGTH = 200;

function CollapsibleDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > DESCRIPTION_COLLAPSE_LENGTH;

  return (
    <div className="mb-6">
      <h2 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
        Описание
      </h2>
      <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
        {isLong && !expanded ? text.slice(0, DESCRIPTION_COLLAPSE_LENGTH) + "..." : text}
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1.5 text-sm text-rose-500 hover:text-rose-600 font-medium transition-colors cursor-pointer"
        >
          {expanded ? "Свернуть" : "Читать далее"}
        </button>
      )}
    </div>
  );
}

/* ── FAQ Accordion Item (#6) ── */

function ProductFaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer bg-white hover:bg-gray-50 transition-colors"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-gray-700">{question}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-gray-400 transition-transform shrink-0 ml-2 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-3 text-sm text-gray-600 leading-relaxed" role="region">
          {answer}
        </div>
      )}
    </div>
  );
}

/* ── Share Buttons (#10) ──────────────────────────────────────────────── */

function ShareButtons({ product }: { product: ProductDetail }) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/catalog/${product.slug}`
      : "";

  const shareData = {
    title: product.name,
    text: `Посмотри что нашла: ${product.name}`,
    url,
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareData.text)}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(shareData.text + " " + url)}`;

  return (
    <div className="flex items-center gap-2 mb-4">
      {canNativeShare ? (
        <button
          onClick={handleNativeShare}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-rose-500 transition-colors cursor-pointer font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Поделиться
        </button>
      ) : (
        <>
          <a
            href={tgUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#2AABEE] transition-colors font-medium"
            aria-label="Поделиться в Telegram"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            Telegram
          </a>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#25D366] transition-colors font-medium"
            aria-label="Поделиться в WhatsApp"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </a>
        </>
      )}
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors cursor-pointer font-medium"
        aria-label="Скопировать ссылку"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        {copied ? "Скопировано!" : "Ссылка"}
      </button>
    </div>
  );
}

/* ── Star Rating (inline) ───────────────────────────────────────────── */

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="text-gray-300 hover:text-amber-400 transition-colors cursor-pointer"
          aria-label={`${star} звёзд`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={star <= value ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function ProductDetailClient({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [slug, setSlug] = useState<string>("");
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const toast = useToast();
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);
  const router = useRouter();
  const { cartCount, refetch: refetchCart } = useCartCount();
  const { addViewed } = useRecentlyViewed();
  const lastTrackedSlug = useRef("");
  const [related, setRelated] = useState<RelatedProduct[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [recommended, setRecommended] = useState<RelatedProduct[]>([]);
  const [faqs, setFaqs] = useState<{ id: number; question: string; answer: string }[]>([]);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [reviewForm, setReviewForm] = useState({ authorName: "", rating: 5, text: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Resolve params
  useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  // Fetch product
  const fetchProduct = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);

        // Track recently viewed (only when product slug changes)
        if (data.slug !== lastTrackedSlug.current) {
          lastTrackedSlug.current = data.slug;
          addViewed({
            id: data.id,
            name: data.name,
            slug: data.slug,
            basePrice: data.basePrice,
            discountPercent: data.discountPercent,
            mainImage: data.mainImage,
          });
        }

        // Fetch related products and reviews in parallel
        const categorySlug = data.category?.slug;
        const categoryId = data.category?.id;
        const productId = data.id;

        Promise.all([
          categorySlug
            ? fetch(`/api/products?category=${categorySlug}&limit=4&sort=newest`)
                .then((r) => (r.ok ? r.json() : { products: [] }))
                .then((d) => (d.products || []).filter((p: { id: number }) => p.id !== productId).slice(0, 4))
                .catch(() => [] as never[])
            : Promise.resolve([]),
          categoryId
            ? fetch(`/api/reviews?productId=${productId}&categoryId=${categoryId}&limit=20`)
                .then((r) => (r.ok ? r.json() : []))
                .then((d) => (Array.isArray(d) ? d : []))
                .catch(() => [])
            : Promise.resolve([]),
          // Fetch recommended from recently viewed categories
          fetch("/api/products?limit=4&sort=newest")
            .then((r) => (r.ok ? r.json() : { products: [] }))
            .then((d) => (d.products || [])
              .filter((p: { id: number; category?: { id: number } | null }) =>
                p.id !== productId && (!data.category || p.category?.id !== data.category.id)
              )
              .slice(0, 4))
            .catch(() => [] as never[]),
          // Fetch product FAQs
          fetch(`/api/product-faq?productId=${productId}`)
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => []),
        ]).then(([relatedProducts, reviewData, recProducts, faqData]) => {
          setRelated(relatedProducts);
          setReviews(reviewData);
          setRecommended(recProducts);
          setFaqs(faqData);
        }).catch(() => {});
      } else if (res.status === 404) {
        setError("Товар не найден");
      } else {
        setError("Не удалось загрузить товар");
      }
    } catch {
      setError("Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // Add to cart
  const handleAddToCart = async (redirectToCart = false) => {
    if (!product) return;
    setAddingToCart(true);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity }),
      });
      if (res.ok) {
        refetchCart();
        toast.success("Товар добавлен в корзину");
        if (redirectToCart) {
          window.location.href = "/cart";
        } else {
          setCartAdded(true);
          setTimeout(() => setCartAdded(false), 3000);
        }
      } else {
        toast.error("Не удалось добавить в корзину, попробуйте ещё раз");
      }
    } catch {
      toast.error("Не удалось добавить в корзину, попробуйте ещё раз");
    } finally {
      setAddingToCart(false);
    }
  };

  // Waitlist subscribe
  const handleWaitlistSubmit = async () => {
    if (!product || !waitlistEmail.trim()) return;
    setWaitlistLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, email: waitlistEmail.trim() }),
      });
      if (res.ok) {
        setWaitlistSubmitted(true);
        toast.success("Вы подписались на уведомление!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Не удалось подписаться");
      }
    } catch {
      toast.error("Ошибка при подписке");
    } finally {
      setWaitlistLoading(false);
    }
  };

  // Review submit
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setReviewSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: reviewForm.authorName.trim(),
          rating: reviewForm.rating,
          text: reviewForm.text.trim(),
          productId: product.id,
          categoryId: product.category?.id || null,
        }),
      });
      if (res.ok) {
        setReviewSubmitted(true);
        toast.success("Спасибо за отзыв! Он появится после модерации.");
      } else {
        const data = await res.json();
        toast.error(data.error || "Не удалось отправить отзыв");
      }
    } catch {
      toast.error("Ошибка при отправке отзыва");
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Compute price
  const effectivePrice = product
    ? getEffectivePrice(product.basePrice, product.discountPercent)
    : 0;
  const hasDiscount = product ? product.discountPercent > 0 : false;

  /* ── Loading skeleton ─────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="home-page-root min-h-screen bg-[#FFF8F5]">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/catalog" className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </Link>
              <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </header>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="aspect-square bg-gray-100 rounded-2xl animate-pulse" />
            <div className="space-y-4">
              <div className="h-8 w-3/4 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-gray-100 rounded animate-pulse" />
              <div className="h-12 w-1/3 bg-gray-100 rounded animate-pulse" />
              <div className="h-20 bg-gray-100 rounded animate-pulse" />
              <div className="h-40 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="home-page-root min-h-screen bg-[#FFF8F5] flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <svg className="w-24 h-24 text-gray-200 mx-auto mb-4" viewBox="0 0 100 100" fill="none" aria-hidden="true">
            <circle cx="50" cy="50" r="40" stroke="#e5e7eb" strokeWidth="2" fill="#f3f4f6" />
            <text x="50" y="55" textAnchor="middle" className="text-2xl fill-gray-400" fontSize="20">?</text>
          </svg>
          <h2 className="text-xl font-bold text-gray-500 mb-2">{error || "Товар не найден"}</h2>
          <p className="text-sm text-gray-400 mb-6">Запрашиваемый товар недоступен</p>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition-colors"
          >
            ← Вернуться в каталог
          </Link>
        </div>
      </div>
    );
  }

  /* ── Render ────────────────────────────────────────────────────────── */

  return (
    <div className="home-page-root min-h-screen bg-[#FFF8F5]">
      {/* Header */}
      <PageHeader
        backHref="/catalog"
        subtitle={product.name}
        cartCount={cartCount}
        maxWidth="max-w-6xl"
      />

      {/* Breadcrumb */}
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 py-3" aria-label="Хлебные крошки">
        <ol className="flex items-center gap-1.5 text-xs text-gray-400 overflow-x-auto scrollbar-hide">
          <li>
            <Link href="/catalog" className="hover:text-rose-500 transition-colors whitespace-nowrap">
              Каталог
            </Link>
          </li>
          {product.category && (
            <>
              <li className="shrink-0" aria-hidden="true">›</li>
              <li>
                <Link
                  href={`/catalog/category/${product.category.slug}`}
                  className="hover:text-rose-500 transition-colors whitespace-nowrap"
                >
                  {product.category.name}
                </Link>
              </li>
            </>
          )}
          <li className="shrink-0" aria-hidden="true">›</li>
          <li className="text-gray-600 font-medium truncate">{product.name}</li>
        </ol>
      </nav>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12">
        <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
          {/* Image gallery */}
          <div>
            <ImageGallery images={product.images} productName={product.name} />
          </div>

          {/* Product info */}
          <div className="flex flex-col">
            {/* Badges */}
            {product.badges.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {product.badges.map((badge) => (
                  <span
                    key={badge.id}
                    className="px-2.5 py-1 rounded-full text-xs font-bold tracking-wide shadow-sm"
                    style={{
                      backgroundColor: badge.bgColor,
                      color: badge.textColor,
                    }}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            )}

            {/* Name */}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
              {product.name}
            </h1>

            {/* Type indicator */}
            {product.type === "composite" && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full w-fit mb-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
                Набор
              </span>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-4">
              {hasDiscount && (
                <span className="text-lg text-gray-400 line-through">
                  {formatPrice(product.basePrice)}
                </span>
              )}
              <span
                className={`text-3xl font-bold ${
                  hasDiscount ? "text-red-500" : "text-gray-800"
                }`}
              >
                {formatPrice(effectivePrice)}
              </span>
            </div>

            {/* Stock status */}
            <div className="mb-3">
              {product.stockQuantity > 3 ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
                  В наличии
                </span>
              ) : product.stockQuantity > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-amber-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true" />
                  Осталось {product.stockQuantity} шт.
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-gray-400" aria-hidden="true" />
                  Под заказ
                </span>
              )}
            </div>

            {/* Out of stock info banner (#1) */}
            {product.stockQuantity === 0 && (
              <div className="bg-gray-50 rounded-xl p-3 mb-3 text-sm text-gray-600">
                <p className="font-medium text-gray-700 mb-1">Товар сейчас отсутствует на складе</p>
                <p className="text-xs text-gray-500">Оставьте email или напишите нам в Telegram — мы сообщим, когда товар будет в наличии</p>
              </div>
            )}

            {/* Trust badges */}
            {product.trustBadges.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-4">
                {product.trustBadges.map((tb) => (
                  <div key={tb.id} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center">
                      <TrustIcon name={tb.icon} className="w-4 h-4 text-rose-500" />
                    </span>
                    <span className="font-medium">{tb.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Short description */}
            {product.shortDescription && (
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                {product.shortDescription}
              </p>
            )}

            {/* Divider */}
            <div className="border-t border-gray-100 my-2" />

            {/* Waitlist form (when out of stock) + Quantity/Add-to-cart + Favorite */}
            <div className="flex items-start gap-4 mb-6">
              {product.stockQuantity === 0 ? (
                /* Waitlist: email + notify button */
                <div className="flex-1">
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      placeholder="Ваш email для уведомления"
                      disabled={waitlistSubmitted}
                      className="flex-1 px-3 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent bg-gray-50 disabled:opacity-60 disabled:bg-gray-100"
                      aria-label="Email для уведомления о поступлении"
                    />
                    <button
                      onClick={handleWaitlistSubmit}
                      disabled={waitlistLoading || waitlistSubmitted || !waitlistEmail.trim()}
                      className="px-4 py-3 rounded-xl font-semibold text-white bg-gray-800 hover:bg-gray-900 transition-all cursor-pointer text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-default"
                    >
                      {waitlistLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : waitlistSubmitted ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="inline mr-1">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Готово!
                        </>
                      ) : (
                        "Уведомить"
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {waitlistSubmitted
                      ? "Мы сообщим, когда товар появится в наличии"
                      : "Мы отправим письмо, когда товар поступит"}
                  </p>
                </div>
              ) : (
                <>
                  {/* Quantity selector */}
                  <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-rose-500 transition-colors cursor-pointer"
                      aria-label="Уменьшить"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                    <span className="w-10 text-center text-sm font-semibold text-gray-800">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(product.stockQuantity > 0 ? product.stockQuantity : 99, q + 1))}
                      disabled={product.stockQuantity > 0 && quantity >= product.stockQuantity}
                      className={`w-10 h-10 flex items-center justify-center text-gray-500 hover:text-rose-500 transition-colors cursor-pointer${
                        product.stockQuantity > 0 && quantity >= product.stockQuantity
                          ? " opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                      aria-label="Увеличить"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  </div>

                  {/* Add to cart + Buy now buttons */}
                  <div className="flex-1 flex gap-2">
                    <button
                      onClick={() => handleAddToCart(false)}
                      disabled={addingToCart}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all cursor-pointer text-sm sm:text-base ${
                        cartAdded
                          ? "bg-emerald-500"
                          : "bg-rose-500 hover:bg-rose-600 shadow-md hover:shadow-lg active:scale-[0.98]"
                      } disabled:opacity-50`}
                    >
                      {cartAdded ? (
                        <>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Добавлено!
                        </>
                      ) : addingToCart ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Добавление...
                        </>
                      ) : (
                        <>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          В корзину
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleAddToCart(true)}
                      disabled={addingToCart}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-rose-500 border-2 border-rose-500 hover:bg-rose-50 transition-all cursor-pointer text-sm sm:text-base disabled:opacity-50"
                    >
                      Купить сейчас
                    </button>
                  </div>
                </>
              )}

              {/* Favorite button (always visible) */}
              <FavoriteButton
                productId={product.id}
                size="lg"
                className="shrink-0"
                showToast
              />
            </div>

            {/* Go to cart */}
            <Link
              href="/cart"
              className="text-sm text-rose-500 hover:text-rose-600 font-medium transition-colors mb-6 inline-flex items-center gap-1"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              Перейти к корзине
            </Link>

            {/* Share buttons (#10) */}
            <ShareButtons product={product} />

            {/* Ask button — WhatsApp/Telegram (#4) */}
            <div className="flex gap-2 mb-4">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Здравствуйте! Мне интересен товар: ${product.name}\nhttps://5minutesofsilence.ru/catalog/${product.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#25D366] transition-colors px-3 py-2 rounded-lg border border-gray-200 hover:border-[#25D366]/40 hover:bg-[#25D366]/5"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </a>
              <a
                href={`https://t.me/karinavoronova?text=${encodeURIComponent(`Здравствуйте! Мне интересен товар: ${product.name}\nhttps://5minutesofsilence.ru/catalog/${product.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#2AABEE] transition-colors px-3 py-2 rounded-lg border border-gray-200 hover:border-[#2AABEE]/40 hover:bg-[#2AABEE]/5"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
                Telegram
              </a>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 my-3" />

            {/* #13: Collapsible description */}
            {product.description && (
              <CollapsibleDescription text={product.description} />
            )}

            {/* Product FAQ (#6) */}
            {faqs.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
                  Частые вопросы
                </h2>
                <div className="space-y-2">
                  {faqs.map((faq) => (
                    <ProductFaqItem key={faq.id} question={faq.question} answer={faq.answer} />
                  ))}
                </div>
              </div>
            )}

            {/* Composite items — using next/image (#1) */}
            {product.type === "composite" && product.compositeItems.length > 0 && (
              <div className="bg-purple-50/50 rounded-2xl p-4 border border-purple-100">
                <h2 className="text-sm font-bold text-purple-700 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                  Состав набора
                </h2>
                <div className="space-y-2">
                  {product.compositeItems.map((item) => {
                    const childPrice = getEffectivePrice(
                      item.child.basePrice,
                      item.child.discountPercent,
                    );
                    return (
                      <Link
                        key={item.id}
                        href={`/catalog/${item.child.slug}`}
                        className="flex items-center gap-3 p-2.5 bg-white rounded-xl hover:shadow-sm transition-shadow group"
                      >
                        {/* Child image — next/image (#1) */}
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative">
                          <SmallProductImage mainImage={item.child.mainImage} name={item.child.name} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 group-hover:text-rose-600 transition-colors truncate">
                            {item.child.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>{formatPrice(childPrice)}</span>
                            {item.quantity > 1 && (
                              <span className="text-purple-500 font-medium">
                                x {item.quantity} шт.
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Included in bundles — using next/image (#1) */}
            {product.includedInBundles.length > 0 && (
              <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100">
                <h2 className="text-sm font-bold text-amber-700 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  </svg>
                  Входит в наборы
                </h2>
                <div className="space-y-2">
                  {product.includedInBundles.map((item) => {
                    const bundlePrice = getEffectivePrice(
                      item.bundle.basePrice,
                      item.bundle.discountPercent,
                    );
                    return (
                      <Link
                        key={item.id}
                        href={`/catalog/${item.bundle.slug}`}
                        className="flex items-center gap-3 p-2.5 bg-white rounded-xl hover:shadow-sm transition-shadow group"
                      >
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative">
                          <SmallProductImage mainImage={item.bundle.mainImage} name={item.bundle.name} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 group-hover:text-amber-600 transition-colors truncate">
                            {item.bundle.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>{formatPrice(bundlePrice)}</span>
                            {item.bundle.discountPercent > 0 && (
                              <span className="line-through">{formatPrice(item.bundle.basePrice)}</span>
                            )}
                          </div>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 group-hover:text-amber-400 transition-colors shrink-0" aria-hidden="true">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reviews section */}
            {reviews.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">
                  Отзывы ({reviews.length})
                </h2>
                <div className="space-y-3">
                  {reviews.map((r) => (
                    <div key={r.id} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800">{r.authorName}</span>
                          <div className="flex gap-0.5" aria-label={`${r.rating} из 5`}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <svg
                                key={i}
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill={i < r.rating ? "#f59e0b" : "#e5e7eb"}
                                aria-hidden="true"
                              >
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(r.createdAt).toLocaleDateString("ru-RU")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{r.text}</p>
                      {r.product && product && r.product.id !== product.id && (
                        <Link
                          href={`/catalog/${r.product.slug}`}
                          className="inline-flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 mt-1.5 font-medium"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          {r.product.name}
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Review form */}
            {!reviewSubmitted && product.category && (
              <div className="mb-6 border-t border-gray-100 pt-6">
                <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Оставить отзыв</h3>
                <form onSubmit={handleReviewSubmit} className="space-y-3">
                  <input
                    type="text"
                    value={reviewForm.authorName}
                    onChange={(e) => setReviewForm(f => ({ ...f, authorName: e.target.value }))}
                    placeholder="Ваше имя"
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50"
                  />
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">Оценка:</span>
                    <StarRating value={reviewForm.rating} onChange={(v) => setReviewForm(f => ({ ...f, rating: v }))} />
                  </div>
                  <textarea
                    value={reviewForm.text}
                    onChange={(e) => setReviewForm(f => ({ ...f, text: e.target.value }))}
                    placeholder="Расскажите о товаре..."
                    required
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={reviewSubmitting || !reviewForm.authorName.trim() || !reviewForm.text.trim()}
                    className="px-4 py-2 bg-rose-500 text-white rounded-xl text-sm font-medium hover:bg-rose-600 disabled:opacity-50 cursor-pointer"
                  >
                    {reviewSubmitting ? "Отправка..." : "Отправить отзыв"}
                  </button>
                </form>
              </div>
            )}
            {reviewSubmitted && (
              <div className="mb-6 border-t border-gray-100 pt-6 text-center">
                <p className="text-sm text-emerald-600 font-medium">Спасибо за отзыв! Он появится после модерации.</p>
              </div>
            )}

            {/* Related products — using next/image (#1, #14) */}
            {related.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">
                  Похожие товары
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {related.map((p) => {
                    const price = p.discountPercent > 0
                      ? getEffectivePrice(p.basePrice, p.discountPercent)
                      : p.basePrice;
                    return (
                      <Link
                        key={p.id}
                        href={`/catalog/${p.slug}`}
                        className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all"
                      >
                        <div className="aspect-square bg-gray-50 relative">
                          <SmallProductImage
                            mainImage={p.mainImage}
                            name={p.name}
                            className="group-hover:scale-105 transition-transform"
                            sizes="(max-width: 640px) 40vw, 20vw"
                          />
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-medium text-gray-700 truncate group-hover:text-rose-600 transition-colors">
                            {p.name}
                          </p>
                          <p className="text-xs font-bold text-gray-800 mt-0.5">
                            {formatPrice(price)}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recommended from other categories (#11) */}
            {recommended.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">
                  Вам может понравиться
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {recommended.map((p) => {
                    const price = p.discountPercent > 0
                      ? getEffectivePrice(p.basePrice, p.discountPercent)
                      : p.basePrice;
                    return (
                      <Link
                        key={p.id}
                        href={`/catalog/${p.slug}`}
                        className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all"
                      >
                        <div className="aspect-square bg-gray-50 relative">
                          <SmallProductImage
                            mainImage={p.mainImage}
                            name={p.name}
                            className="group-hover:scale-105 transition-transform"
                            sizes="(max-width: 640px) 40vw, 20vw"
                          />
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-medium text-gray-700 truncate group-hover:text-rose-600 transition-colors">
                            {p.name}
                          </p>
                          <p className="text-xs font-bold text-gray-800 mt-0.5">
                            {formatPrice(price)}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Back to catalog */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <Link
                href="/catalog"
                className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-rose-500 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Все товары
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
