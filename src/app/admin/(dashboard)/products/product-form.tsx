"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { generateSlug, formatPrice } from "@/lib/catalog-utils";
import type { Product, Category, Badge, ProductImage } from "@/types/catalog";
import { TrustIcon } from "@/components/catalog/TrustIcon";

/* ── Types ────────────────────────────────────────────── */

interface CompositeItem {
  childId: number;
  quantity: number;
  childName?: string;
}

interface TrustBadge {
  id: number;
  label: string;
  icon: string;
  description: string | null;
  order: number;
  isActive: boolean;
}

interface ProductFormProps {
  product?: Product | null;
  mode: "create" | "edit";
}

interface ProductFormData {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  basePrice: string;
  discountPercent: number;
  type: "simple" | "composite";
  categoryId: string;
  stockQuantity: number;
  recommendedAge: string;
  status: "draft" | "active" | "archived";
  badgeIds: number[];
  trustBadgeIds: number[];
  compositeItems: CompositeItem[];
}

/* ── Simple product for selector (composite child) ── */

interface SimpleProduct {
  id: number;
  name: string;
  basePrice: number;
  discountPercent: number;
  categoryId: number | null;
  categoryName: string | null;
  stockQuantity: number;
  recommendedAge: string | null;
}

/* ── Component ────────────────────────────────────────── */

export default function ProductForm({ product, mode }: ProductFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── State ── */

  const [categories, setCategories] = useState<Category[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [trustBadges, setTrustBadges] = useState<TrustBadge[]>([]);
  const [simpleProducts, setSimpleProducts] = useState<SimpleProduct[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [form, setForm] = useState<ProductFormData>({
    name: "",
    slug: "",
    shortDescription: "",
    description: "",
    basePrice: "",
    discountPercent: 0,
    type: "simple",
    categoryId: "",
    stockQuantity: 0,
    recommendedAge: "",
    status: "draft",
    badgeIds: [],
    trustBadgeIds: [],
    compositeItems: [],
  });

  const [compositeSearch, setCompositeSearch] = useState("");

  /* ── Init from product (edit mode) ── */

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        slug: product.slug,
        shortDescription: product.shortDescription ?? "",
        description: product.description ?? "",
        basePrice: String(product.basePrice),
        discountPercent: product.discountPercent,
        type: product.type,
        categoryId: product.categoryId ? String(product.categoryId) : "",
        stockQuantity: product.stockQuantity ?? 0,
        recommendedAge: product.recommendedAge ?? "",
        status: product.status,
        badgeIds: product.badges.map((b) => b.badgeId),
        trustBadgeIds: (product as Product & { trustBadges?: Array<{ trustBadgeId: number }> }).trustBadges?.map((tb) => tb.trustBadgeId) ?? [],
        compositeItems: product.compositeItems.map((ci) => ({
          childId: ci.childId,
          quantity: ci.quantity,
          childName: ci.child?.name ?? "",
        })),
      });
      setImages(product.images);
      setSlugManuallyEdited(true); // don't auto-generate on edit
    }
  }, [product]);

  /* ── Fetch metadata ── */

  useEffect(() => {
    (async () => {
      try {
        const [catRes, badgeRes, trustBadgeRes, prodRes] = await Promise.all([
          fetch("/api/admin/categories"),
          fetch("/api/admin/badges"),
          fetch("/api/admin/trust-badges"),
          fetch("/api/admin/products?limit=1000"),
        ]);
        if (catRes.ok) setCategories(await catRes.json());
        if (badgeRes.ok) setBadges(await badgeRes.json());
        if (trustBadgeRes.ok) setTrustBadges(await trustBadgeRes.json());
        if (prodRes.ok) {
          const data = await prodRes.json();
          setSimpleProducts(
            data.products
              .filter(
                (p: { type: string; status: string }) =>
                  p.type === "simple" && p.status === "active"
              )
              .map((p: SimpleProduct & { category?: { id: number; name: string } }) => ({
                id: p.id,
                name: p.name,
                basePrice: p.basePrice,
                discountPercent: p.discountPercent,
                categoryId: p.categoryId ?? p.category?.id ?? null,
                categoryName: p.categoryName ?? p.category?.name ?? null,
              }))
          );
        }
      } catch {
        setError("Не удалось загрузить справочники");
      } finally {
        setLoadingMeta(false);
      }
    })();
  }, []);

  /* ── Handlers ── */

  const updateField = <K extends keyof ProductFormData>(
    key: K,
    value: ProductFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "name" && !slugManuallyEdited) {
      setForm((prev) => ({
        ...prev,
        slug: generateSlug(value as string),
      }));
    }
  };

  const toggleBadge = (badgeId: number) => {
    setForm((prev) => ({
      ...prev,
      badgeIds: prev.badgeIds.includes(badgeId)
        ? prev.badgeIds.filter((id) => id !== badgeId)
        : [...prev.badgeIds, badgeId],
    }));
  };

  const toggleTrustBadge = (trustBadgeId: number) => {
    setForm((prev) => ({
      ...prev,
      trustBadgeIds: prev.trustBadgeIds.includes(trustBadgeId)
        ? prev.trustBadgeIds.filter((id) => id !== trustBadgeId)
        : [...prev.trustBadgeIds, trustBadgeId],
    }));
  };

  const addCompositeItem = (childId: number) => {
    const existing = form.compositeItems.find((ci) => ci.childId === childId);
    if (existing) return;
    const prod = simpleProducts.find((p) => p.id === childId);

    const newItems = [
      ...form.compositeItems,
      { childId, quantity: 1, childName: prod?.name ?? "" },
    ];

    // Auto-calculate base price as sum of components (before bundle discount)
    const componentsTotal = newItems.reduce((sum, item) => {
      const sp = simpleProducts.find((_sp) => _sp.id === item.childId);
      if (!sp) return sum;
      const price =
        Math.round(sp.basePrice * (1 - sp.discountPercent / 100) * 100) / 100;
      return sum + price * item.quantity;
    }, 0);

    setForm((prev) => ({
      ...prev,
      compositeItems: newItems,
      basePrice: String(Math.round(componentsTotal)),
      discountPercent: 10,
    }));
    setCompositeSearch("");
  };

  const removeCompositeItem = (childId: number) => {
    const newItems = form.compositeItems.filter((ci) => ci.childId !== childId);

    const componentsTotal = newItems.reduce((sum, item) => {
      const sp = simpleProducts.find((_sp) => _sp.id === item.childId);
      if (!sp) return sum;
      const price =
        Math.round(sp.basePrice * (1 - sp.discountPercent / 100) * 100) / 100;
      return sum + price * item.quantity;
    }, 0);

    setForm((prev) => ({
      ...prev,
      compositeItems: newItems,
      basePrice: newItems.length > 0 ? String(Math.round(componentsTotal)) : prev.basePrice,
    }));
  };

  const updateCompositeQty = (childId: number, qty: number) => {
    const newItems = form.compositeItems.map((ci) =>
      ci.childId === childId ? { ...ci, quantity: Math.max(1, qty) } : ci
    );

    const componentsTotal = newItems.reduce((sum, item) => {
      const sp = simpleProducts.find((_sp) => _sp.id === item.childId);
      if (!sp) return sum;
      const price =
        Math.round(sp.basePrice * (1 - sp.discountPercent / 100) * 100) / 100;
      return sum + price * item.quantity;
    }, 0);

    setForm((prev) => ({
      ...prev,
      compositeItems: newItems,
      basePrice: String(Math.round(componentsTotal)),
    }));
  };

  /* ── Image upload ── */

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || !product?.id && mode === "edit") return;
      if (mode === "create") {
        alert("Сначала сохраните товар, чтобы загрузить изображения");
        return;
      }

      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          const fd = new FormData();
          fd.append("image", file);
          const res = await fetch(`/api/admin/products/${product!.id}/images`, {
            method: "POST",
            body: fd,
          });
          if (!res.ok) {
            const data = await res.json().catch(() => null);
            throw new Error(data?.error ?? "Ошибка загрузки");
          }
          const img: ProductImage = await res.json();
          setImages((prev) => [...prev, img]);
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : "Ошибка загрузки изображений");
      } finally {
        setUploading(false);
      }
    },
    [product?.id, mode]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleUpload(e.dataTransfer.files);
    },
    [handleUpload]
  );

  const removeImage = useCallback(
    async (imageId: number) => {
      if (!product?.id) return;
      try {
        const res = await fetch(`/api/admin/products/${product.id}/images`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageId }),
        });
        if (!res.ok) throw new Error();
        setImages((prev) => prev.filter((img) => img.id !== imageId));
      } catch {
        alert("Не удалось удалить изображение");
      }
    },
    [product?.id]
  );

  const setMainImage = useCallback(
    async (imageId: number) => {
      if (!product?.id) return;
      try {
        const res = await fetch(`/api/admin/products/${product.id}/images`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageId }),
        });
        if (res.ok) {
          // Update local state: move selected image to front
          setImages((prev) => {
            const idx = prev.findIndex((img) => img.id === imageId);
            if (idx === -1) return prev;
            const newImages = [...prev];
            const [selected] = newImages.splice(idx, 1);
            newImages.unshift(selected);
            return newImages;
          });
        } else {
          alert("Не удалось изменить главное изображение");
        }
      } catch {
        alert("Ошибка при изменении изображения");
      }
    },
    [product?.id]
  );

  /* ── Save ── */

  const handleSave = async () => {
    setError("");

    if (!form.name.trim()) {
      setError("Название обязательно");
      return;
    }
    if (!form.basePrice || Number(form.basePrice) < 0) {
      setError("Укажите корректную цену");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        slug: form.slug.trim() || generateSlug(form.name),
        shortDescription: form.shortDescription.trim() || null,
        description: form.description.trim() || null,
        basePrice: Number(form.basePrice),
        discountPercent: form.discountPercent,
        type: form.type,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        stockQuantity: form.stockQuantity,
        recommendedAge: form.recommendedAge || null,
        status: form.status,
        badgeIds: form.badgeIds,
        trustBadgeIds: form.trustBadgeIds,
        compositeItems:
          form.type === "composite"
            ? form.compositeItems.map((ci) => ({
                childId: ci.childId,
                quantity: ci.quantity,
              }))
            : undefined,
      };

      const url =
        mode === "create"
          ? "/api/admin/products"
          : `/api/admin/products/${product!.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Ошибка сохранения");
      }

      const saved = await res.json();
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!product?.id) return;
    if (!confirm(`Удалить товар «${product.name}»?`)) return;
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      router.push("/admin/products");
      router.refresh();
    } catch {
      alert("Не удалось удалить товар");
    }
  };

  /* ── Composite product search ── */

  const availableProducts = simpleProducts.filter(
    (p) =>
      !form.compositeItems.some((ci) => ci.childId === p.id) &&
      (compositeSearch === "" ||
        p.name.toLowerCase().includes(compositeSearch.toLowerCase()))
  );

  /* ── Render ── */

  if (loadingMeta) {
    return <div className="text-gray-500">Загрузка...</div>;
  }

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const sectionClass = "border border-gray-200 rounded-lg p-4 bg-white";

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {mode === "create" ? "Новый товар" : `Редактирование: ${product?.name ?? ""}`}
        </h2>
        {mode === "edit" && (
          <button
            onClick={handleDelete}
            className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
          >
            Удалить
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
          {error}
        </div>
      )}

      {/* Basic info */}
      <div className={sectionClass + " mb-4"}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Основная информация</h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Name */}
          <div>
            <label className={labelClass}>Название *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Название товара"
              className={inputClass}
            />
          </div>

          {/* Slug */}
          <div>
            <label className={labelClass}>
              Slug{" "}
              <span className="font-normal text-gray-400">(автогенерация)</span>
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => {
                setSlugManuallyEdited(true);
                updateField("slug", e.target.value);
              }}
              placeholder="url-slug-tovara"
              className={inputClass}
            />
          </div>

          {/* Short Description */}
          <div className="sm:col-span-2">
            <label className={labelClass}>Краткое описание</label>
            <textarea
              value={form.shortDescription}
              onChange={(e) => updateField("shortDescription", e.target.value)}
              placeholder="Краткое описание для карточки товара"
              rows={2}
              className={inputClass}
            />
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className={labelClass}>Полное описание</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Подробное описание товара"
              rows={5}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Price & Status */}
      <div className={sectionClass + " mb-4"}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Цена и статус</h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Base Price */}
          <div>
            <label className={labelClass}>Базовая цена (₽) *</label>
            <input
              type="number"
              value={form.basePrice}
              onChange={(e) => updateField("basePrice", e.target.value)}
              min="0"
              step="0.01"
              placeholder="0"
              className={inputClass}
            />
          </div>

          {/* Discount */}
          <div>
            <label className={labelClass}>
              Скидка: {form.discountPercent}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={form.discountPercent}
              onChange={(e) =>
                updateField("discountPercent", Number(e.target.value))
              }
              className="w-full mt-2 accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
            {form.basePrice && form.discountPercent > 0 && (
              <p className="text-sm text-green-600 mt-1">
                Итоговая цена:{" "}
                {formatPrice(
                  Math.round(
                    Number(form.basePrice) *
                      (1 - form.discountPercent / 100) *
                      100
                  ) / 100
                )}
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className={labelClass}>Статус</label>
            <select
              value={form.status}
              onChange={(e) =>
                updateField("status", e.target.value as ProductFormData["status"])
              }
              className={inputClass}
            >
              <option value="draft">Черновик</option>
              <option value="active">Активный</option>
              <option value="archived">Архив</option>
            </select>
          </div>
        </div>
      </div>

      {/* Type & Category */}
      <div className={sectionClass + " mb-4"}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Тип и категория</h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Type */}
          <div>
            <label className={labelClass}>Тип товара</label>
            <div className="flex items-center gap-4 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="simple"
                  checked={form.type === "simple"}
                  onChange={() => updateField("type", "simple")}
                  className="accent-blue-600"
                />
                <span className="text-sm">Простой</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="composite"
                  checked={form.type === "composite"}
                  onChange={() => updateField("type", "composite")}
                  className="accent-blue-600"
                />
                <span className="text-sm">Набор</span>
              </label>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className={labelClass}>Категория</label>
            <select
              value={form.categoryId}
              onChange={(e) => updateField("categoryId", e.target.value)}
              className={inputClass}
            >
              <option value="">— Без категории —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock quantity */}
          <div className="col-span-6 sm:col-span-3">
            <label className={labelClass}>Количество на складе</label>
            <input
              type="number"
              min="0"
              value={form.stockQuantity}
              onChange={(e) => updateField("stockQuantity", Number(e.target.value))}
              className={inputClass}
              placeholder="0 = под заказ"
            />
            <p className="text-xs text-gray-400 mt-1">0 = под заказ, 1-3 = &quot;осталось мало&quot;, 4+ = в наличии</p>
          </div>

          {/* Recommended age */}
          <div className="col-span-6 sm:col-span-3">
            <label className={labelClass}>Рекомендуемый возраст</label>
            <select
              value={form.recommendedAge}
              onChange={(e) => updateField("recommendedAge", e.target.value)}
              className={inputClass}
            >
              <option value="">Не указан</option>
              <option value="0+">0+ (от рождения)</option>
              <option value="6m+">6+ месяцев</option>
              <option value="1+">1+ год</option>
              <option value="3+">3+ лет</option>
              <option value="6+">6+ лет</option>
            </select>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className={sectionClass + " mb-4"}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Бейджи</h3>
        {badges.length === 0 ? (
          <p className="text-sm text-gray-500">Нет доступных бейджей</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {badges.map((badge) => {
              const isSelected = form.badgeIds.includes(badge.id);
              return (
                <label
                  key={badge.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer border text-sm transition-colors ${
                    isSelected
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleBadge(badge.id)}
                    className="accent-blue-600"
                  />
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      color: badge.textColor,
                      backgroundColor: badge.bgColor,
                    }}
                  >
                    {badge.label}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Trust Badges */}
      <div className={sectionClass + " mb-4"}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Сигналы доверия</h3>
        {trustBadges.length === 0 ? (
          <div className="text-sm text-gray-500">
            <p>Нет доступных сигналов доверия</p>
            <a
              href="/admin/trust-badges"
              className="text-blue-600 hover:text-blue-700 underline mt-1 inline-block"
            >
              Создать сигналы доверия
            </a>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {trustBadges.map((tb) => {
              const isSelected = form.trustBadgeIds.includes(tb.id);
              return (
                <label
                  key={tb.id}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer border text-sm transition-colors ${
                    isSelected
                      ? "border-rose-300 bg-rose-50"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleTrustBadge(tb.id)}
                    className="accent-rose-600"
                  />
                  <span className="w-6 h-6 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                    <TrustIcon name={tb.icon} className="w-3.5 h-3.5 text-rose-500" />
                  </span>
                  <span className="font-medium text-gray-700">{tb.label}</span>
                  {tb.description && (
                    <span className="text-xs text-gray-400 hidden sm:inline">
                      — {tb.description}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Composite items */}
      {form.type === "composite" && (
        <div className={sectionClass + " mb-4"}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Состав набора
          </h3>

          {/* Search & add */}
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              placeholder="Поиск товара..."
              value={compositeSearch}
              onChange={(e) => setCompositeSearch(e.target.value)}
              className={inputClass + " flex-1"}
            />
            <select
              disabled={availableProducts.length === 0}
              className={inputClass + " max-w-xs"}
              value=""
              onChange={(e) => {
                if (e.target.value) addCompositeItem(Number(e.target.value));
              }}
            >
              <option value="">
                {availableProducts.length === 0
                  ? "Нет товаров"
                  : "Добавить товар..."}
              </option>
              {availableProducts.map((p) => {
                const effectivePrice = Math.round(
                  p.basePrice * (1 - p.discountPercent / 100) * 100
                ) / 100;
                return (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.categoryName ? ` [${p.categoryName}]` : ""} — {formatPrice(effectivePrice)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Items list */}
          {form.compositeItems.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">
              Добавьте товары в набор
            </p>
          ) : (
            <div className="space-y-2">
              {form.compositeItems.map((item) => {
                const prod = simpleProducts.find(
                  (p) => p.id === item.childId
                );
                const price = prod
                  ? Math.round(
                      prod.basePrice *
                        (1 - prod.discountPercent / 100) *
                        100
                    ) / 100
                  : 0;

                return (
                  <div
                    key={item.childId}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-md"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.childName ?? `Товар #${item.childId}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatPrice(price)} × {item.quantity} ={" "}
                        {formatPrice(price * item.quantity)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500">Кол-во:</label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateCompositeQty(
                            item.childId,
                            Number(e.target.value)
                          )
                        }
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCompositeItem(item.childId)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Удалить"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              {/* Total */}
              <div className="pt-2 border-t border-gray-200 text-right">
                <span className="text-sm text-gray-600">Итого компонентов: </span>
                <span className="font-semibold text-gray-900">
                  {formatPrice(
                    form.compositeItems.reduce((sum, item) => {
                      const prod = simpleProducts.find(
                        (p) => p.id === item.childId
                      );
                      if (!prod) return sum;
                      const price =
                        Math.round(
                          prod.basePrice *
                            (1 - prod.discountPercent / 100) *
                            100
                        ) / 100;
                      return sum + price * item.quantity;
                    }, 0)
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Images */}
      <div className={sectionClass + " mb-4"}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Изображения</h3>

        {mode === "create" ? (
          <p className="text-sm text-gray-500">
            Сохраните товар, чтобы загрузить изображения.
          </p>
        ) : (
          <>
            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
              />
              <p className="text-sm text-gray-600">
                {uploading ? (
                  <span className="text-blue-600">Загрузка...</span>
                ) : (
                  <>
                    Перетащите изображения сюда или{" "}
                    <span className="text-blue-600 underline">
                      выберите файлы
                    </span>
                  </>
                )}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                JPG, PNG, GIF, WebP — макс. 10 МБ
              </p>
            </div>

            {/* Thumbnails */}
            {images.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-4">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="relative group w-24 h-24 rounded-md overflow-hidden border border-gray-200 bg-gray-100"
                  >
                    <img
                      src={`/api${img.url}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {img.isMain && (
                      <span className="absolute top-1 left-1 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        ★
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMainImage(img.id);
                        }}
                        className="p-1 bg-white rounded text-yellow-500 text-xs hover:bg-yellow-50"
                        title="Сделать главным"
                      >
                        ★
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(img.id);
                        }}
                        className="p-1 bg-white rounded text-red-500 text-xs hover:bg-red-50"
                        title="Удалить"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving
            ? "Сохранение..."
            : mode === "create"
              ? "Создать товар"
              : "Сохранить изменения"}
        </button>
        <button
          onClick={() => router.push("/admin/products")}
          className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
