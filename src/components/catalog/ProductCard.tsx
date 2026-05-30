"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ProductListItem, Badge } from "@/types/catalog";
import { getEffectivePrice, formatPrice } from "@/lib/catalog-utils";
import { useToast } from "@/components/ui/ToastProvider";

/* ── Helpers ──────────────────────────────────────────────────────────── */

function PlaceholderImage() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 text-gray-300">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      <span className="text-[10px] mt-1.5 text-gray-400 font-medium">Фото скоро</span>
    </div>
  );
}

/* ── Favorite Button ─────────────────────────────────────────────────── */

export function FavoriteButton({
  productId,
  initialFavorited = false,
  className = "absolute top-2.5 right-2.5 z-10",
  size = "sm",
  showToast = false,
}: {
  productId: number;
  initialFavorited?: boolean;
  className?: string;
  size?: "sm" | "lg";
  showToast?: boolean;
}) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  // Sync with external state (e.g. when product data changes)
  useEffect(() => {
    setFavorited(initialFavorited);
  }, [initialFavorited]);

  const toggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setLoading(true);
      try {
        const res = await fetch("/api/product-favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        if (res.ok) {
          const data = await res.json();
          setFavorited(data.favorited);
          if (showToast) {
            toast.success(data.favorited ? "Добавлено в избранное" : "Убрано из избранного");
          }
        } else if (res.status === 401) {
          // Not authenticated — prompt login
          window.dispatchEvent(new CustomEvent("auth-required"));
        }
      } catch {
        /* network error — ignore */
      } finally {
        setLoading(false);
      }
    },
    [productId]
  );

  const iconSize = size === "lg" ? 20 : 16;
  const btnSize = size === "lg" ? "w-10 h-10" : "w-9 h-9";

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`${className} ${btnSize} flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white transition-all cursor-pointer disabled:opacity-50`}
      aria-label={favorited ? "Убрать из избранного" : "В избранное"}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill={favorited ? "#f43f5e" : "none"}
        stroke={favorited ? "#f43f5e" : "#9ca3af"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-colors"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}

/* ── Component ────────────────────────────────────────────────────────── */

interface ProductCardProps {
  product: ProductListItem;
  priority?: boolean;
  onQuickView?: (slug: string) => void;
}

export function ProductCard({ product, priority, onQuickView }: ProductCardProps) {
  const imageUrl = product.mainImage ? `/api${product.mainImage.url}` : "";
  const effectivePrice = getEffectivePrice(
    product.basePrice,
    product.discountPercent
  );
  const hasDiscount = product.discountPercent > 0;

  return (
    <Link
      href={`/catalog/${product.slug}`}
      prefetch={false}
      className="group block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            fill
            priority={priority}
          />
        ) : (
          <PlaceholderImage />
        )}

        {/* Badges */}
        {product.badges.length > 0 && (
          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
            {product.badges.map((badge: Badge) => (
              <span
                key={badge.id}
                className="px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide shadow-sm"
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

        {/* Discount badge (when not in badge list) */}
        {hasDiscount && !product.badges.some((b) => b.label === "SALE") && !product.recommendedAge && (
          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500 text-white shadow-sm z-10">
            −{product.discountPercent}%
          </span>
        )}

        {/* Age badge */}
        {product.recommendedAge && (
          <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/90 text-gray-700 shadow-sm z-10">
            {product.recommendedAge}
          </span>
        )}

        {/* Stock badge at bottom-left */}
        {product.stockQuantity === 0 && (
          <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-200 text-gray-600 shadow-sm z-10">
            Под заказ
          </span>
        )}
        {product.stockQuantity > 0 && product.stockQuantity <= 3 && (
          <span
            className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-white shadow-sm z-10"
            style={{ animation: "pulse-badge 1.5s ease-in-out 3" }}
          >
            Осталось мало!
          </span>
        )}

        {/* Auto NEW badge for products created in last 14 days */}
        {product.createdAt && !product.badges.some((b) => b.label === "NEW" || b.label === "SALE" || b.label === "HIT") && (
          (() => {
            const age = Date.now() - new Date(product.createdAt).getTime();
            const isNew = age < 14 * 24 * 60 * 60 * 1000;
            return isNew ? (
              <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-sm z-10">
                NEW
              </span>
            ) : null;
          })()
        )}

        {/* Favorite button (shown when discount badge is NOT in that position) */}
        <FavoriteButton productId={product.id} />
      </div>

      {/* Info */}
      <div className="p-3.5 flex flex-col gap-1">
        {/* Category */}
        {product.category && (
          <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider truncate">
            {product.category.name}
          </span>
        )}

        {/* Name */}
        <h3 className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 group-hover:text-rose-600 transition-colors">
          {product.name}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-1">
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(product.basePrice)}
            </span>
          )}
          <span
            className={`text-base font-bold ${
              hasDiscount ? "text-red-500" : "text-gray-800"
            }`}
          >
            {formatPrice(effectivePrice)}
          </span>
        </div>

        {/* Stock indicator */}
        {product.stockQuantity > 0 && product.stockQuantity <= 3 && (
          <span className="text-[11px] font-medium text-amber-600">
            Осталось {product.stockQuantity} шт.
          </span>
        )}

        {/* Quick view button */}
        {onQuickView && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickView(product.slug);
            }}
            className="mt-1.5 text-xs text-gray-400 hover:text-rose-500 font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Быстрый просмотр
          </button>
        )}
      </div>
    </Link>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────────────── */

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-100" />
      <div className="p-3.5 flex flex-col gap-2">
        <div className="h-3 w-16 bg-gray-100 rounded" />
        <div className="h-4 w-3/4 bg-gray-100 rounded" />
        <div className="h-4 w-1/3 bg-gray-100 rounded" />
      </div>
    </div>
  );
}
