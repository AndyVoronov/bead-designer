"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useToast } from "@/components/ui/ToastProvider";
import { getEffectivePrice, formatPrice } from "@/lib/catalog-utils";
import { FavoriteButton } from "@/components/catalog/ProductCard";
import { useCartCount } from "@/hooks/useCartCount";
import type { ProductListItem, Badge } from "@/types/catalog";

interface QuickViewProps {
  slug: string | null;
  onClose: () => void;
}

interface ProductDetail {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  basePrice: number;
  discountPercent: number;
  stockQuantity: number;
  recommendedAge: string | null;
  category: { id: number; name: string; slug: string } | null;
  images: { id: number; url: string; order: number; isMain: boolean }[];
  badges: Badge[];
}

export function QuickViewModal({ slug, onClose }: QuickViewProps) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const toast = useToast();
  const { refetch } = useCartCount();
  const [mainImage, setMainImage] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/products/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setProduct(data);
          const main = data.images?.find((i: { isMain: boolean }) => i.isMain) || data.images?.[0];
          if (main) setMainImage(`/api${main.url}`);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (slug) document.addEventListener("keydown", handler);
    document.body.style.overflow = slug ? "hidden" : "";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [slug, onClose]);

  const handleAdd = async () => {
    if (!product) return;
    setAdding(true);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity }),
      });
      if (res.ok) {
        refetch();
        toast.success("Товар добавлен в корзину");
        onClose();
      } else {
        toast.error("Не удалось добавить в корзину");
      }
    } catch {
      toast.error("Ошибка при добавлении");
    } finally {
      setAdding(false);
    }
  };

  if (!slug) return null;

  const price = product ? getEffectivePrice(product.basePrice, product.discountPercent) : 0;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <div className="sticky top-0 bg-white z-10 flex justify-end p-3 pb-0">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="p-6 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : product ? (
          <div className="p-6 pt-2">
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Image */}
              <div>
                <div className="aspect-square rounded-xl overflow-hidden bg-gray-50 relative">
                  {mainImage ? (
                    <Image src={mainImage} alt={product.name} fill className="object-cover" sizes="(max-width: 640px) 100vw, 300px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">Фото скоро</div>
                  )}
                </div>
                {/* Thumbnails */}
                {product.images.length > 1 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto">
                    {product.images.map((img) => (
                      <button
                        key={img.id}
                        onClick={() => setMainImage(`/api${img.url}`)}
                        className={`w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 cursor-pointer transition-colors ${mainImage === `/api${img.url}` ? "border-rose-500" : "border-gray-200 hover:border-gray-300"}`}
                      >
                        <div className="w-full h-full relative">
                          <Image src={`/api${img.url}`} alt="" fill className="object-cover" sizes="56px" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex flex-col">
                {product.category && (
                  <Link href={`/catalog/category/${product.category.slug}`} className="text-xs text-gray-400 hover:text-rose-500 uppercase tracking-wider mb-1">
                    {product.category.name}
                  </Link>
                )}
                <h2 className="text-xl font-bold text-gray-800 mb-2">{product.name}</h2>

                {/* Badges */}
                {product.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {product.badges.map((b) => (
                      <span key={b.id} className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: b.bgColor, color: b.textColor }}>{b.label}</span>
                    ))}
                  </div>
                )}

                {/* Price */}
                <div className="flex items-baseline gap-2 mb-2">
                  {product.discountPercent > 0 && (
                    <span className="text-sm text-gray-400 line-through">{formatPrice(product.basePrice)}</span>
                  )}
                  <span className={`text-2xl font-bold ${product.discountPercent > 0 ? "text-red-500" : "text-gray-800"}`}>
                    {formatPrice(price)}
                  </span>
                </div>

                {/* Stock */}
                <div className="mb-3">
                  {product.stockQuantity > 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> В наличии
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 font-medium">
                      <span className="w-2 h-2 rounded-full bg-gray-400" /> Под заказ
                    </span>
                  )}
                </div>

                {product.shortDescription && (
                  <p className="text-sm text-gray-600 mb-4">{product.shortDescription}</p>
                )}

                {/* Quantity + Add to cart */}
                {product.stockQuantity > 0 && (
                  <div className="flex items-center gap-3 mb-4 mt-auto">
                    <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200">
                      <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-rose-500 cursor-pointer">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                      <button onClick={() => setQuantity((q) => Math.min(product.stockQuantity, q + 1))} className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-rose-500 cursor-pointer">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      </button>
                    </div>
                    <button onClick={handleAdd} disabled={adding} className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl font-semibold text-sm hover:bg-rose-600 transition-colors disabled:opacity-50 cursor-pointer">
                      {adding ? "Добавление..." : "В корзину"}
                    </button>
                    <FavoriteButton productId={product.id} size="lg" showToast />
                  </div>
                )}

                {/* Link to full page */}
                <Link
                  href={`/catalog/${product.slug}`}
                  onClick={onClose}
                  className="text-sm text-rose-500 hover:text-rose-600 font-medium transition-colors text-center"
                >
                  Подробнее →
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-400">Не удалось загрузить товар</div>
        )}
      </div>
    </div>
  );
}
