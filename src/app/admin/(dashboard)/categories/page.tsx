"use client";

import { useEffect, useState, useCallback } from "react";
import { generateSlug } from "@/lib/catalog-utils";
import type { Category } from "@/types/catalog";

/* ── Types ────────────────────────────────────────────── */

interface CategoryWithCount extends Category {
  _count?: { products: number; children: number };
}

/* ── Component ────────────────────────────────────────── */

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  /* ── Fetch ── */

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/categories");
      if (!res.ok) throw new Error();
      setCategories(await res.json());
    } catch {
      setError("Не удалось загрузить категории");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  /* ── Helpers ── */

  const resetForm = () => {
    setFormName("");
    setFormSlug("");
    setSlugManuallyEdited(false);
    setEditingId(null);
    setIsCreating(false);
  };

  const startEdit = (cat: CategoryWithCount) => {
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setSlugManuallyEdited(true);
    setIsCreating(false);
  };

  const startCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  /* ── CRUD ── */

  const handleSave = async () => {
    if (!formName.trim()) {
      setError("Название обязательно");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const slug = formSlug.trim() || generateSlug(formName);

      if (isCreating) {
        const res = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            slug,
            order: categories.length,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Ошибка создания");
        }
      } else if (editingId !== null) {
        const res = await fetch(`/api/admin/categories/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            slug,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Ошибка сохранения");
        }
      }

      await fetchCategories();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Удалить категорию «${name}»?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Ошибка удаления");
      }
      await fetchCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Не удалось удалить");
    } finally {
      setDeletingId(null);
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= categories.length) return;

    setReordering(true);
    try {
      const reordered = [...categories];
      const temp = reordered[index];
      reordered[index] = reordered[newIndex];
      reordered[newIndex] = temp;

      const items = reordered.map((c, i) => ({
        id: c.id,
        order: i,
        parentId: c.parentId,
      }));

      const res = await fetch("/api/admin/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (res.ok) {
        setCategories(reordered);
      }
    } catch {
      /* silently fail for reorder */
    } finally {
      setReordering(false);
    }
  };

  /* ── Render ── */

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-1/4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-14 bg-gray-100 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  const inputClass =
    "px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Категории</h2>
          <span className="text-sm text-gray-500">{categories.length}</span>
        </div>
        <button
          onClick={startCreate}
          disabled={isCreating}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          + Новая категория
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
          {error}
          <button
            onClick={() => setError("")}
            className="ml-2 underline"
          >
            Закрыть
          </button>
        </div>
      )}

      {/* Create form */}
      {isCreating && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Новая категория
          </h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Название"
              value={formName}
              onChange={(e) => {
                setFormName(e.target.value);
                if (!slugManuallyEdited) {
                  setFormSlug(generateSlug(e.target.value));
                }
              }}
              className={inputClass + " flex-1"}
              autoFocus
            />
            <input
              type="text"
              placeholder="slug"
              value={formSlug}
              onChange={(e) => {
                setSlugManuallyEdited(true);
                setFormSlug(e.target.value);
              }}
              className={inputClass + " flex-1"}
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? "..." : "Сохранить"}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {categories.length === 0 && !isCreating ? (
        <div className="text-gray-500 py-8 text-center">
          Нет категорий. Создайте первую.
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat, index) => {
            const isEditing = editingId === cat.id;

            return (
              <div
                key={cat.id}
                className="flex items-center gap-3 border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors"
              >
                {/* Reorder */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => handleMove(index, "up")}
                    disabled={index === 0 || reordering}
                    className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
                    title="Вверх"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => handleMove(index, "down")}
                    disabled={index === categories.length - 1 || reordering}
                    className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
                    title="Вниз"
                  >
                    ▼
                  </button>
                </div>

                {/* Content or edit form */}
                {isEditing ? (
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => {
                        setFormName(e.target.value);
                        if (!slugManuallyEdited) {
                          setFormSlug(generateSlug(e.target.value));
                        }
                      }}
                      className={inputClass + " flex-1"}
                      autoFocus
                    />
                    <input
                      type="text"
                      value={formSlug}
                      onChange={(e) => {
                        setSlugManuallyEdited(true);
                        setFormSlug(e.target.value);
                      }}
                      className={inputClass + " flex-1"}
                    />
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? "..." : "✓"}
                    </button>
                    <button
                      onClick={resetForm}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {cat.name}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        {cat.slug}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 shrink-0 bg-gray-100 px-2 py-0.5 rounded-full">
                      {cat._count?.products ?? 0} {((cat._count?.products ?? 0) === 1) ? "товар" : (cat._count?.products ?? 0) >= 2 && (cat._count?.products ?? 0) <= 4 ? "товара" : "товаров"}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">
                      #{cat.id}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEdit(cat)}
                        className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                      >
                        Изменить
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
                        disabled={deletingId === cat.id}
                        className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        {deletingId === cat.id ? "..." : "Удалить"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
