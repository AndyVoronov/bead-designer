"use client";

import { useEffect, useState } from "react";

interface Review {
  id: number;
  authorName: string;
  rating: number;
  text: string;
  isApproved: boolean;
  createdAt: string;
  user?: { id: number; name: string | null; email: string | null } | null;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");

  useEffect(() => {
    fetch("/api/admin/reviews")
      .then((r) => r.json())
      .then(setReviews)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAction = async (id: number, action: "approve" | "reject" | "delete") => {
    const res = await fetch("/api/admin/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (res.ok) {
      if (action === "delete") {
        setReviews((prev) => prev.filter((r) => r.id !== id));
      } else {
        setReviews((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, isApproved: action === "approve" } : r
          )
        );
      }
    }
  };

  const filtered = reviews.filter((r) => {
    if (filter === "pending") return !r.isApproved;
    if (filter === "approved") return r.isApproved;
    return true;
  });

  const pendingCount = reviews.filter((r) => !r.isApproved).length;

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-100 rounded-xl h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Отзывы</h1>
        {pendingCount > 0 && (
          <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
            {pendingCount} на модерации
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["all", "pending", "approved"] as const).map((f) => {
          const label = f === "all" ? "Все" : f === "pending" ? "На модерации" : "Одобренные";
          const count = f === "all" ? reviews.length : f === "pending" ? pendingCount : reviews.length - pendingCount;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer border-none ${
                filter === f
                  ? "bg-rose-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">Нет отзывов</div>
      )}

      <div className="space-y-4">
        {filtered.map((r) => (
          <div
            key={r.id}
            className={`bg-white rounded-xl border p-5 ${
              r.isApproved ? "border-gray-200" : "border-amber-200 bg-amber-50/30"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-semibold text-gray-900">{r.authorName}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg
                        key={i}
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill={i < r.rating ? "#f59e0b" : "#e5e7eb"}
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      r.isApproved
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-amber-100 text-amber-600"
                    }`}
                  >
                    {r.isApproved ? "Опубликован" : "Ожидает"}
                  </span>
                </div>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{r.text}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span>{new Date(r.createdAt).toLocaleString("ru-RU")}</span>
                  {r.user?.email && <span>{r.user.email}</span>}
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                {!r.isApproved && (
                  <button
                    onClick={() => handleAction(r.id, "approve")}
                    className="px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer border-none"
                  >
                    Одобрить
                  </button>
                )}
                {r.isApproved && (
                  <button
                    onClick={() => handleAction(r.id, "reject")}
                    className="px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer border-none"
                  >
                    Снять
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm("Удалить отзыв?")) handleAction(r.id, "delete");
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors cursor-pointer border-none"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
