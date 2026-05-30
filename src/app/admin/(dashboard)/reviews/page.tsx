"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface Review {
  id: number;
  authorName: string;
  rating: number;
  text: string;
  isApproved: boolean;
  createdAt: string;
  productId: number | null;
  categoryId: number | null;
  user?: { id: number; name: string | null; email: string | null } | null;
  product?: { id: number; name: string; slug: string } | null;
  category?: { id: number; name: string; slug: string } | null;
}

interface Product {
  id: number;
  name: string;
  slug: string;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [editing, setEditing] = useState<Review | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/reviews").then((r) => r.json()),
      fetch("/api/admin/products?limit=200").then((r) => r.json()),
    ])
      .then(([revs, prods]) => {
        setReviews(revs);
        setProducts(Array.isArray(prods) ? prods : prods?.products || prods?.items || []);
      })
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
          prev.map((r) => (r.id === id ? { ...r, isApproved: action === "approve" } : r))
        );
      }
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    const res = await fetch("/api/admin/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        id: editing.id,
        authorName: editing.authorName,
        rating: editing.rating,
        text: editing.text,
        isApproved: editing.isApproved,
        productId: editing.productId,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setReviews((prev) => prev.map((r) => (r.id === editing.id ? data.review : r)));
      setEditing(null);
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
          const count =
            f === "all"
              ? reviews.length
              : f === "pending"
                ? pendingCount
                : reviews.length - pendingCount;
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
                <div className="flex items-center gap-3 mb-2 flex-wrap">
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
                  {r.product && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                      {r.product.name}
                    </span>
                  )}
                </div>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{r.text}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span>{new Date(r.createdAt).toLocaleString("ru-RU")}</span>
                  {r.user?.email && <span>{r.user.email}</span>}
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setEditing({ ...r })}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border-none"
                >
                  Редактировать
                </button>
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

      {/* Edit modal */}
      {editing && (
        <ReviewEditModal
          review={editing}
          products={products}
          onChange={setEditing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ReviewEditModal({
  review,
  products,
  onChange,
  onSave,
  onClose,
}: {
  review: Review;
  products: Product[];
  onChange: (r: Review) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");

  const filteredProducts = search
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : products;

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Редактировать отзыв</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer border-none bg-transparent"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Author */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Имя автора</label>
            <input
              type="text"
              value={review.authorName}
              onChange={(e) => onChange({ ...review, authorName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Рейтинг</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => onChange({ ...review, rating: star })}
                  className="p-0.5 cursor-pointer bg-transparent border-none"
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill={star <= review.rating ? "#f59e0b" : "#e5e7eb"}
                    stroke={star <= review.rating ? "#f59e0b" : "#d1d5db"}
                    strokeWidth={1}
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Текст отзыва</label>
            <textarea
              value={review.text}
              onChange={(e) => onChange({ ...review, text: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Product */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Товар
              <span className="text-gray-400 font-normal ml-1">(необязательно)</span>
            </label>
            {review.product && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm px-2 py-1 bg-blue-50 text-blue-700 rounded-lg">
                  {review.product.name}
                </span>
                <button
                  onClick={() => onChange({ ...review, productId: null })}
                  className="text-xs text-gray-400 hover:text-red-500 cursor-pointer bg-transparent border-none"
                >
                  Убрать
                </button>
              </div>
            )}
            {!review.product && (
              <>
                <input
                  type="text"
                  placeholder="Поиск товара..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent mb-2"
                />
                {search && (
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                    {filteredProducts.length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-400">Ничего не найдено</div>
                    )}
                    {filteredProducts.slice(0, 20).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          onChange({ ...review, productId: p.id, product: { id: p.id, name: p.name, slug: p.slug } });
                          setSearch("");
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-rose-50 transition-colors border-none bg-transparent cursor-pointer"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Approved toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={review.isApproved}
              onChange={(e) => onChange({ ...review, isApproved: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-rose-500 focus:ring-rose-500"
            />
            <span className="text-sm text-gray-700">Опубликован</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer border-none"
          >
            Отмена
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 text-sm font-medium text-white bg-rose-500 rounded-lg hover:bg-rose-600 transition-colors cursor-pointer border-none"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
