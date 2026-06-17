"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";

interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  order: number;
  _count?: { posts: number };
}

const inputClass =
  "px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function AdminBlogCategoriesPage() {
  const toast = useToast();
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formOrder, setFormOrder] = useState(0);
  const [autoSlug, setAutoSlug] = useState(true);

  /* ── Fetch ── */
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/blog/categories");
      if (!res.ok) throw new Error();
      setCategories(await res.json());
    } catch {
      toast.error("Не удалось загрузить рубрики");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  /* ── Helpers ── */
  const resetForm = () => {
    setFormName("");
    setFormSlug("");
    setFormDescription("");
    setFormOrder(0);
    setAutoSlug(true);
    setEditingId(null);
    setIsCreating(false);
  };

  const startEdit = (cat: BlogCategory) => {
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormDescription(cat.description ?? "");
    setFormOrder(cat.order);
    setAutoSlug(false);
    setIsCreating(false);
  };

  const handleNameChange = (name: string) => {
    setFormName(name);
    if (autoSlug) {
      setFormSlug(slugify(name));
    }
  };

  /* ── Save ── */
  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Название рубрики обязательно");
      return;
    }
    if (!formSlug.trim()) {
      toast.error("Slug обязателен");
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: formName.trim(),
        slug: formSlug.trim(),
        description: formDescription.trim() || null,
        order: Number(formOrder),
      };

      let res: Response;
      if (isCreating) {
        res = await fetch("/api/admin/blog/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else if (editingId !== null) {
        res = await fetch(`/api/admin/blog/categories/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Ошибка сохранения");
      }

      toast.success(isCreating ? "Рубрика создана" : "Рубрика обновлена");
      await fetchCategories();
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async (id: number, name: string) => {
    const cat = categories.find((c) => c.id === id);
    const postCount = cat?._count?.posts ?? 0;
    const msg =
      postCount > 0
        ? `Удалить рубрику «${name}»? ${postCount} стат(ья/ей) потеряют привязку к рубрике.`
        : `Удалить рубрику «${name}»?`;

    if (!confirm(msg)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/blog/categories/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Рубрика удалена");
      await fetchCategories();
    } catch {
      toast.error("Не удалось удалить рубрику");
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Render ── */
  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-lg w-48 mb-6" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Рубрики блога</h1>
          <span className="text-sm text-gray-500">{categories.length}</span>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsCreating(true);
          }}
          disabled={isCreating}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500 text-white text-sm font-medium rounded-lg hover:bg-rose-600 transition-colors disabled:opacity-50 cursor-pointer border-none"
        >
          <Plus className="w-4 h-4" />
          Добавить рубрику
        </button>
      </div>

      {/* Create / Edit inline form */}
      {(isCreating || editingId !== null) && (
        <div className="bg-white rounded-xl border-2 border-rose-200 p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {isCreating ? "Новая рубрика" : `Редактирование: ${formName}`}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Например: Полезные советы"
                className={inputClass + " w-full"}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug
              </label>
              <input
                type="text"
                value={formSlug}
                onChange={(e) => {
                  setFormSlug(e.target.value);
                  setAutoSlug(false);
                }}
                placeholder="poleznye-sovety"
                className={inputClass + " w-full font-mono text-xs"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Порядок
              </label>
              <input
                type="number"
                value={formOrder}
                onChange={(e) => setFormOrder(Number(e.target.value))}
                min={0}
                className={inputClass + " w-full"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание
              </label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Краткое описание рубрики"
                className={inputClass + " w-full"}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-500 text-white text-sm font-medium rounded-lg hover:bg-rose-600 transition-colors disabled:opacity-50 cursor-pointer border-none"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
            <button
              onClick={resetForm}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer border-none"
            >
              <X className="w-3.5 h-3.5" />
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {categories.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            Нет рубрик. Создайте первую.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  Название
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  Slug
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  Описание
                </th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">
                  Статей
                </th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {cat.name}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {cat.slug}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                    {cat.description || "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full min-w-[24px]">
                      {cat._count?.posts ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => startEdit(cat)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer border-none bg-transparent"
                        title="Редактировать"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
                        disabled={deletingId === cat.id}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer border-none bg-transparent disabled:opacity-50"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
