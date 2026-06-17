"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCartCount } from "@/hooks/useCartCount";

interface Review {
  id: number;
  authorName: string;
  rating: number;
  text: string;
  createdAt: string;
  product: { id: number; name: string; slug: string } | null;
}

const RATING_FILTERS = [
  { value: 0, label: "Все" },
  { value: 5, label: "5 ★" },
  { value: 4, label: "4 ★" },
  { value: 3, label: "3 ★" },
  { value: 2, label: "2 ★" },
  { value: 1, label: "1 ★" },
];

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState(0);
  const { cartCount } = useCartCount();

  useEffect(() => {
    fetch("/api/reviews")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Review[]) => {
        setReviews(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = ratingFilter === 0 ? reviews : reviews.filter((r) => r.rating === ratingFilter);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0";
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    percent: reviews.length > 0 ? (reviews.filter((r) => r.rating === star).length / reviews.length) * 100 : 0,
  }));

  return (
    <div className="home-page-root min-h-screen bg-[#FFF8F5]">
      <PageHeader title="Отзывы" subtitle={`${reviews.length} отзывов`} cartCount={cartCount} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl h-24" />
            ))}
          </div>
        ) : (
          <>
            {/* Rating summary */}
            {reviews.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Average */}
                  <div className="text-center shrink-0">
                    <div className="text-4xl font-bold text-gray-800">{avgRating}</div>
                    <div className="flex gap-0.5 justify-center mt-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <svg key={s} width="18" height="18" viewBox="0 0 24 24" fill={s <= Math.round(Number(avgRating)) ? "#f59e0b" : "#e5e7eb"}>
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{reviews.length} отзывов</p>
                  </div>

                  {/* Distribution */}
                  <div className="flex-1 w-full space-y-1.5">
                    {distribution.map(({ star, count, percent }) => (
                      <button
                        key={star}
                        onClick={() => setRatingFilter(ratingFilter === star ? 0 : star)}
                        className={`flex items-center gap-2 w-full cursor-pointer group ${ratingFilter === star ? "opacity-100" : "opacity-70 hover:opacity-100"} transition-opacity`}
                      >
                        <span className="text-xs text-gray-500 w-6 shrink-0">{star}★</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-6 text-right shrink-0">{count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Filter */}
            <div className="flex flex-wrap gap-2 mb-4">
              {RATING_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setRatingFilter(f.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    ratingFilter === f.value
                      ? "bg-rose-500 text-white shadow-sm"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-rose-300"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Reviews list */}
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg font-medium mb-1">Отзывов пока нет</p>
                <p className="text-sm">Будьте первым, кто оставит отзыв!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((review) => (
                  <div key={review.id} className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex items-start justify-between mb-1.5">
                      <div>
                        <span className="text-sm font-medium text-gray-800">{review.authorName}</span>
                        <div className="flex gap-0.5 mt-0.5" aria-label={`${review.rating} из 5`}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill={s <= review.rating ? "#f59e0b" : "#e5e7eb"}>
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString("ru-RU")}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{review.text}</p>
                    {review.product && (
                      <Link
                        href={`/catalog/${review.product.slug}`}
                        className="inline-flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 mt-2 font-medium"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        {review.product.name}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
