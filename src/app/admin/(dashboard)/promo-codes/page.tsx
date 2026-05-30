"use client";

import { useState, useEffect } from "react";

/* ── Types ────────────────────────────────────────────────────────────── */

interface PromoCode {
  id: number;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  scope: string;
  productIds: number[];
  categoryIds: number[];
  giftProductId: number | null;
  giftPrice: number | null;
  requiredProductIds: number[];
  requiredCategoryIds: number[];
  requiredMinQuantity: Record<string, number>;
  conditionMode: string;
  minOrderAmount: number | null;
  maxDiscount: number | null;
  validFrom: string | null;
  validUntil: string | null;
  maxTotalUses: number | null;
  maxUsesPerUser: number | null;
  currentUses: number;
  isActive: boolean;
  totalUses: number;
  createdAt: string;
}

interface Product {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

const SCOPE_LABELS: Record<string, string> = {
  cart: "Вся корзина",
  products: "Конкретные товары",
  categories: "Категории",
  gift: "Подарок",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatus(p: PromoCode) {
  const now = new Date();
  if (!p.isActive) return { label: "Отключён", color: "bg-gray-100 text-gray-500" };
  if (p.validUntil && now > new Date(p.validUntil)) return { label: "Истёк", color: "bg-red-50 text-red-600" };
  if (p.validFrom && now < new Date(p.validFrom)) return { label: "Скоро", color: "bg-amber-50 text-amber-600" };
  if (p.maxTotalUses && p.currentUses >= p.maxTotalUses) return { label: "Исчерпан", color: "bg-orange-50 text-orange-600" };
  return { label: "Активен", color: "bg-emerald-50 text-emerald-600" };
}

/* ── Form Component ──────────────────────────────────────────────────── */

function PromoForm({
  initial,
  products,
  categories,
  onSave,
  onCancel,
}: {
  initial?: PromoCode;
  products: Product[];
  categories: Category[];
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const isEdit = !!initial;

  const [form, setForm] = useState({
    code: initial?.code || "",
    description: initial?.description || "",
    discountType: initial?.discountType || "percent",
    discountValue: initial?.discountValue?.toString() || "",
    scope: initial?.scope || "cart",
    productIds: initial?.productIds || [],
    categoryIds: initial?.categoryIds || [],
    giftProductId: initial?.giftProductId?.toString() || "",
    giftPrice: initial?.giftPrice?.toString() || "0",
    requiredProductIds: initial?.requiredProductIds || [],
    requiredCategoryIds: initial?.requiredCategoryIds || [],
    requiredMinQuantity: initial?.requiredMinQuantity || {},
    conditionMode: initial?.conditionMode || "all",
    minOrderAmount: initial?.minOrderAmount?.toString() || "",
    maxDiscount: initial?.maxDiscount?.toString() || "",
    validFrom: initial?.validFrom ? initial.validFrom.slice(0, 16) : "",
    validUntil: initial?.validUntil ? initial.validUntil.slice(0, 16) : "",
    maxTotalUses: initial?.maxTotalUses?.toString() || "",
    maxUsesPerUser: initial?.maxUsesPerUser?.toString() || "",
    isActive: initial?.isActive ?? true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSave({
        ...form,
        giftProductId: form.giftProductId ? Number(form.giftProductId) : null,
        giftPrice: Number(form.giftPrice) || 0,
        discountValue: form.scope === "gift" ? 0 : Number(form.discountValue),
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : null,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
        maxTotalUses: form.maxTotalUses ? Number(form.maxTotalUses) : null,
        maxUsesPerUser: form.maxUsesPerUser ? Number(form.maxUsesPerUser) : null,
        // Clean up min quantity: remove zeros
        requiredMinQuantity: Object.fromEntries(
          Object.entries(form.requiredMinQuantity).filter(([, v]) => Number(v) > 0)
        ),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const toggleProductId = (id: number) => {
    setForm((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(id)
        ? prev.productIds.filter((x) => x !== id)
        : [...prev.productIds, id],
    }));
  };

  const toggleCategoryId = (id: number) => {
    setForm((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(id)
        ? prev.categoryIds.filter((x) => x !== id)
        : [...prev.categoryIds, id],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Code */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Промокод <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.code}
            onChange={(e) => update("code", e.target.value.toUpperCase())}
            placeholder="SALE2026"
            disabled={isEdit}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:opacity-50 uppercase tracking-wider"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Описание
          </label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Скидка на День рождения"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {/* Discount type */}
        <div className={form.scope === "gift" ? "opacity-40 pointer-events-none" : ""}>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Тип скидки
          </label>
          <select
            value={form.discountType}
            onChange={(e) => update("discountType", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-400"
          >
            <option value="percent">Процент (%)</option>
            <option value="fixed">Фиксированная (₽)</option>
          </select>
        </div>

        {/* Discount value */}
        <div className={form.scope === "gift" ? "opacity-40 pointer-events-none" : ""}>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Значение <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            value={form.discountValue}
            onChange={(e) => update("discountValue", e.target.value)}
            placeholder={form.discountType === "percent" ? "15" : "500"}
            min="0"
            step={form.discountType === "percent" ? "1" : "0.01"}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>

        {/* Scope */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Область действия
          </label>
          <select
            value={form.scope}
            onChange={(e) => update("scope", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-400"
          >
            <option value="cart">Вся корзина</option>
            <option value="products">Конкретные товары</option>
            <option value="categories">Категории товаров</option>
            <option value="gift">🎁 Подарок</option>
          </select>
        </div>
      </div>

      {/* Product picker */}
      {form.scope === "products" && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">
            Выберите товары
          </label>
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-1 bg-gray-50">
            {products.map((p) => (
              <label
                key={p.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  form.productIds.includes(p.id)
                    ? "bg-rose-50 text-rose-700"
                    : "hover:bg-gray-100"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.productIds.includes(p.id)}
                  onChange={() => toggleProductId(p.id)}
                  className="accent-rose-500"
                />
                <span className="text-sm truncate">{p.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Category picker */}
      {form.scope === "categories" && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">
            Выберите категории
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCategoryId(c.id)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors cursor-pointer ${
                  form.categoryIds.includes(c.id)
                    ? "bg-rose-50 border-rose-300 text-rose-700"
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Gift picker */}
      {form.scope === "gift" && (
        <div className="grid sm:grid-cols-2 gap-4 bg-purple-50/50 rounded-xl p-4 border border-purple-100">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Подарочный товар <span className="text-red-400">*</span>
            </label>
            <select
              value={form.giftProductId}
              onChange={(e) => update("giftProductId", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-400"
            >
              <option value="">Выберите товар</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Цена подарка (₽)
            </label>
            <div className="relative">
              <input
                type="number"
                value={form.giftPrice}
                onChange={(e) => update("giftPrice", e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-400 pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                {Number(form.giftPrice) === 0
                  ? "Бесплатно!"
                  : `${form.giftPrice} ₽`}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              0 = товар в подарок бесплатно
            </p>
          </div>
        </div>
      )}

      {/* ── Conditions Section ── */}
      <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
        <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 12l2 2 4-4"/>
            <circle cx="12" cy="12" r="10"/>
          </svg>
          Условия применения
        </h3>

        {/* Condition mode */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Логика условий
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => update("conditionMode", "all")}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                form.conditionMode === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              Все обязательны
            </button>
            <button
              type="button"
              onClick={() => update("conditionMode", "any")}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                form.conditionMode === "any"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              Хотя бы одно
            </button>
          </div>
        </div>

        {/* Required products */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Требуемые товары в корзине
          </label>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {form.requiredProductIds.map((pid) => {
              const prod = products.find((p) => p.id === pid);
              return (
                <span
                  key={pid}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg text-xs"
                >
                  {prod?.name || `#${pid}`}
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        requiredProductIds: f.requiredProductIds.filter((id) => id !== pid),
                        requiredMinQuantity: (() => {
                          const m = { ...f.requiredMinQuantity };
                          delete m[pid];
                          return m;
                        })(),
                      }))
                    }
                    className="text-blue-400 hover:text-blue-700 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
          <select
            value=""
            onChange={(e) => {
              if (!e.target.value) return;
              const pid = Number(e.target.value);
              if (form.requiredProductIds.includes(pid)) return;
              setForm((f) => ({
                ...f,
                requiredProductIds: [...f.requiredProductIds, pid],
                requiredMinQuantity: {
                  ...f.requiredMinQuantity,
                  [pid]: 1,
                },
              }));
            }}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">+ Добавить товар</option>
            {products
              .filter((p) => !form.requiredProductIds.includes(p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          {form.requiredProductIds.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Мин. количество для каждого:
            </p>
          )}
        </div>

        {/* Min quantity per required product */}
        {form.requiredProductIds.map((pid) => {
          const prod = products.find((p) => p.id === pid);
          return (
            <div key={pid} className="flex items-center gap-2 ml-2 mb-2">
              <span className="text-xs text-gray-600 w-32 truncate">
                {prod?.name || `#${pid}`}
              </span>
              <input
                type="number"
                value={form.requiredMinQuantity[pid] || 1}
                min="1"
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    requiredMinQuantity: {
                      ...f.requiredMinQuantity,
                      [pid]: Math.max(1, Number(e.target.value)),
                    },
                  }))
                }
                className="w-16 px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <span className="text-xs text-gray-400">шт. мин.</span>
            </div>
          );
        })}

        {/* Required categories */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Требуемые категории в корзине
          </label>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {form.requiredCategoryIds.map((cid) => {
              const cat = categories.find((c) => c.id === cid);
              return (
                <span
                  key={cid}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg text-xs"
                >
                  {cat?.name || `#${cid}`}
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        requiredCategoryIds: f.requiredCategoryIds.filter((id) => id !== cid),
                      }))
                    }
                    className="text-blue-400 hover:text-blue-700 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
          <select
            value=""
            onChange={(e) => {
              if (!e.target.value) return;
              const cid = Number(e.target.value);
              if (form.requiredCategoryIds.includes(cid)) return;
              setForm((f) => ({
                ...f,
                requiredCategoryIds: [...f.requiredCategoryIds, cid],
              }));
            }}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">+ Добавить категорию</option>
            {categories
              .filter((c) => !form.requiredCategoryIds.includes(c.id))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </div>

        <p className="text-xs text-gray-400">
          {form.conditionMode === "all"
            ? "Все перечисленные условия должны быть выполнены"
            : "Достаточно выполнения хотя бы одного условия"}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Min order */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Мин. сумма заказа (₽)
          </label>
          <input
            type="number"
            value={form.minOrderAmount}
            onChange={(e) => update("minOrderAmount", e.target.value)}
            placeholder="1000"
            min="0"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>

        {/* Max discount */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Макс. скидка (₽)
          </label>
          <input
            type="number"
            value={form.maxDiscount}
            onChange={(e) => update("maxDiscount", e.target.value)}
            placeholder="500"
            min="0"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>

        {/* Max total uses */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Макс. использований (всего)
          </label>
          <input
            type="number"
            value={form.maxTotalUses}
            onChange={(e) => update("maxTotalUses", e.target.value)}
            placeholder="100"
            min="0"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>

        {/* Max uses per user */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            На пользователя
          </label>
          <input
            type="number"
            value={form.maxUsesPerUser}
            onChange={(e) => update("maxUsesPerUser", e.target.value)}
            placeholder="1"
            min="0"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Valid from */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Действует с
          </label>
          <input
            type="datetime-local"
            value={form.validFrom}
            onChange={(e) => update("validFrom", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>

        {/* Valid until */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Действует до
          </label>
          <input
            type="datetime-local"
            value={form.validUntil}
            onChange={(e) => update("validUntil", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-2">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => update("isActive", e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-rose-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500" />
        </label>
        <span className="text-sm text-gray-600">Активен</span>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 bg-rose-500 text-white text-sm rounded-xl font-medium hover:bg-rose-600 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving
            ? "Сохранение..."
            : isEdit
              ? "Сохранить"
              : "Создать"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 bg-gray-100 text-gray-600 text-sm rounded-xl font-medium hover:bg-gray-200 transition-colors cursor-pointer"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function PromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    try {
      const [codesRes, productsRes, categoriesRes] = await Promise.all([
        fetch("/api/admin/promo-codes"),
        fetch("/api/admin/products?limit=100"),
        fetch("/api/admin/categories"),
      ]);
      if (codesRes.ok) setCodes(await codesRes.json());
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(
          (data.products || data || []).map(
            (p: { id: number; name: string }) => ({ id: p.id, name: p.name })
          )
        );
      }
      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(
          (Array.isArray(data) ? data : []).map(
            (c: { id: number; name: string }) => ({ id: c.id, name: c.name })
          )
        );
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (data: Record<string, unknown>) => {
    const res = await fetch("/api/admin/promo-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Ошибка");
    }
    setCreating(false);
    fetchData();
  };

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!editing) return;
    const res = await fetch(`/api/admin/promo-codes/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Ошибка");
    }
    setEditing(null);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить промокод?")) return;
    const res = await fetch(`/api/admin/promo-codes/${id}`, {
      method: "DELETE",
    });
    if (res.ok) fetchData();
  };

  const handleToggle = async (p: PromoCode) => {
    await fetch(`/api/admin/promo-codes/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (editing) {
    return (
      <div className="max-w-3xl mx-auto">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          Редактирование: {editing.code}
        </h2>
        <PromoForm
          initial={editing}
          products={products}
          categories={categories}
          onSave={handleUpdate}
          onCancel={() => setEditing(null)}
        />
      </div>
    );
  }

  if (creating) {
    return (
      <div className="max-w-3xl mx-auto">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          Новый промокод
        </h2>
        <PromoForm
          products={products}
          categories={categories}
          onSave={handleCreate}
          onCancel={() => setCreating(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-gray-800">Промокоды</h2>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 bg-rose-500 text-white text-sm rounded-xl font-medium hover:bg-rose-600 transition-colors cursor-pointer"
        >
          + Новый промокод
        </button>
      </div>

      {codes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium mb-1">Нет промокодов</p>
          <p className="text-sm">Создайте первый промокод</p>
        </div>
      ) : (
        <div className="space-y-3">
          {codes.map((p) => {
            const status = getStatus(p);
            const discountLabel =
              p.scope === "gift"
                ? "🎁 Подарок"
                : p.discountType === "percent"
                  ? `${p.discountValue}%`
                  : `${p.discountValue} ₽`;

            return (
              <div
                key={p.id}
                className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Code & status */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-gray-800 tracking-wider font-mono">
                        {p.code}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}
                      >
                        {status.label}
                      </span>
                      <span className="text-xs text-rose-500 font-semibold">
                        −{discountLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                      <span>{SCOPE_LABELS[p.scope] || p.scope}</span>
                      {p.description && (
                        <span className="text-gray-500">
                          — {p.description}
                        </span>
                      )}
                      {p.minOrderAmount && (
                        <span>от {p.minOrderAmount} ₽</span>
                      )}
                      <span>
                        Использован: {p.currentUses}
                        {p.maxTotalUses
                          ? ` / ${p.maxTotalUses}`
                          : ""}
                      </span>
                    </div>
                    {/* Conditions display */}
                    {(p.requiredProductIds?.length || p.requiredCategoryIds?.length) && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-blue-500 flex-wrap">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>
                        </svg>
                        <span>
                          {p.requiredProductIds?.length
                            ? `Товары: ${p.requiredProductIds.length}`
                            : ""}
                          {p.requiredProductIds?.length && p.requiredCategoryIds?.length
                            ? ", "
                            : ""}
                          {p.requiredCategoryIds?.length
                            ? `Категории: ${p.requiredCategoryIds.length}`
                            : ""}
                          {p.conditionMode === "any" ? " (любое)" : ""}
                        </span>
                      </div>
                    )}
                    {p.validFrom && (
                      <p className="text-xs text-gray-300 mt-0.5">
                        {formatDate(p.validFrom)} — {formatDate(p.validUntil)}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggle(p)}
                      className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                        p.isActive
                          ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {p.isActive ? "Вкл" : "Выкл"}
                    </button>
                    <button
                      onClick={() => setEditing(p)}
                      className="px-3 py-1.5 text-xs bg-gray-50 text-gray-600 rounded-lg font-medium hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="px-3 py-1.5 text-xs bg-red-50 text-red-500 rounded-lg font-medium hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
