"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/catalog-utils";
import type { Category, Badge } from "@/types/catalog";

/* ── Types ────────────────────────────────────────────── */

interface ProductImage {
  id: number;
  url: string;
  isMain: boolean;
}

interface ProductBadge {
  badge: Badge;
}

interface ProductRow {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  basePrice: number;
  discountPercent: number;
  type: "simple" | "composite";
  status: "draft" | "active" | "archived";
  categoryId: number | null;
  category?: { id: number; name: string };
  images: ProductImage[];
  badges: ProductBadge[];
}

interface ProductsResponse {
  products: ProductRow[];
  total: number;
  page: number;
  totalPages: number;
}

/* ── Constants ────────────────────────────────────────── */

const STATUS_OPTIONS = [
  { value: "", label: "Все" },
  { value: "active", label: "Активные" },
  { value: "draft", label: "Черновики" },
  { value: "archived", label: "Архив" },
] as const;

const STATUS_BADGE: Record<
  string,
  { label: string; classes: string }
> = {
  active: { label: "Активный", classes: "bg-green-100 text-green-800" },
  draft: { label: "Черновик", classes: "bg-yellow-100 text-yellow-800" },
  archived: { label: "Архив", classes: "bg-gray-100 text-gray-600" },
};

const TYPE_BADGE: Record<string, { label: string; classes: string }> = {
  simple: { label: "Простой", classes: "bg-blue-100 text-blue-800" },
  composite: { label: "Набор", classes: "bg-purple-100 text-purple-800" },
};

/* ── Component ────────────────────────────────────────── */

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  /* ── Debounce search ── */

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  /* ── Fetch ── */

  const fetchProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchDebounced) params.set("search", searchDebounced);
      if (categoryFilter) params.set("categoryId", categoryFilter);
      params.set("limit", "100");

      const res = await fetch(`/api/admin/products?${params}`);
      if (!res.ok) throw new Error();
      const data: ProductsResponse = await res.json();
      setProducts(data.products);
      setTotal(data.total);
    } catch {
      setError("Не удалось загрузить товары");
    } finally {
      setLoading(false);
    }
  }, [searchDebounced, categoryFilter]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/categories");
      if (res.ok) setCategories(await res.json());
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchProducts();
  }, [fetchProducts]);

  /* ── Actions ── */

  const handleDelete = async (id: number) => {
    const name = products.find((p) => p.id === id)?.name ?? "";
    if (!confirm(`Удалить товар «${name}»? Это действие нельзя отменить.`))
      return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Ошибка удаления");
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Не удалось удалить товар");
    } finally {
      setDeleting(null);
    }
  };

  /* ── Filtering (client-side for status) ── */

  const filtered = statusFilter
    ? products.filter((p) => p.status === statusFilter)
    : products;

  /* ── Skeleton ── */

  const SkeletonRow = () => (
    <tr className="border-b border-gray-100">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="py-3 px-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
        </td>
      ))}
    </tr>
  );

  /* ── Render ── */

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Товары</h2>
          {!loading && (
            <span className="text-sm text-gray-500">
              {total}{" "}
              {total === 1
                ? "товар"
                : total >= 2 && total <= 4
                  ? "товара"
                  : "товаров"}
            </span>
          )}
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          + Новый товар
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Поиск по названию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Все категории</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
          {error}
          <button
            onClick={() => {
              setError("");
              fetchProducts();
            }}
            className="ml-2 underline"
          >
            Повторить
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 font-medium text-gray-600">ID</th>
              <th className="text-left py-3 px-2 font-medium text-gray-600">Фото</th>
              <th className="text-left py-3 px-2 font-medium text-gray-600">Название</th>
              <th className="text-left py-3 px-2 font-medium text-gray-600">Категория</th>
              <th className="text-left py-3 px-2 font-medium text-gray-600">Цена</th>
              <th className="text-left py-3 px-2 font-medium text-gray-600">Тип</th>
              <th className="text-left py-3 px-2 font-medium text-gray-600">Статус</th>
              <th className="text-left py-3 px-2 font-medium text-gray-600">Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-gray-500 py-8">
                  Нет товаров
                </td>
              </tr>
            ) : (
              filtered.map((product) => {
                const mainImage = product.images.find((img) => img.isMain) ?? product.images[0];
                const effectivePrice =
                  product.discountPercent > 0
                    ? Math.round(
                        product.basePrice * (1 - product.discountPercent / 100) * 100
                      ) / 100
                    : product.basePrice;
                const statusBadge =
                  STATUS_BADGE[product.status] ?? STATUS_BADGE.draft;
                const typeBadge =
                  TYPE_BADGE[product.type] ?? TYPE_BADGE.simple;

                return (
                  <tr
                    key={product.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-2 px-2 text-gray-500">{product.id}</td>
                    <td className="py-2 px-2">
                      {mainImage ? (
                        <img
                          src={`/api${mainImage.url}`}
                          alt={product.name}
                          className="w-10 h-10 rounded object-cover bg-gray-100"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                          —
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {product.name}
                      </Link>
                      {product.shortDescription && (
                        <p className="text-gray-500 text-xs mt-0.5 line-clamp-1 max-w-xs">
                          {product.shortDescription}
                        </p>
                      )}
                    </td>
                    <td className="py-2 px-2 text-gray-600">
                      {product.category?.name ?? "—"}
                    </td>
                    <td className="py-2 px-2 text-gray-900 whitespace-nowrap">
                      {product.discountPercent > 0 && (
                        <span className="line-through text-gray-400 mr-1 text-xs">
                          {formatPrice(product.basePrice)}
                        </span>
                      )}
                      <span className="font-medium">
                        {formatPrice(effectivePrice)}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge.classes}`}
                      >
                        {typeBadge.label}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.classes}`}
                      >
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                        >
                          Изменить
                        </Link>
                        <button
                          onClick={() => handleDelete(product.id)}
                          disabled={deleting === product.id}
                          className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          {deleting === product.id ? "..." : "Удалить"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
