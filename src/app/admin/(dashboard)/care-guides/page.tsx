"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Droplets, Wind, Sun, Eye, AlertTriangle, ShieldCheck,
  RefreshCw, Package, Heart, Sparkles, Gem, Star,
} from "lucide-react";

/* ── Types ────────────────────────────────────────────── */

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface CareGuideItem {
  id?: number;
  icon: string;
  text: string;
  order?: number;
}

interface CareGuide {
  id: number;
  categoryId: number;
  title: string;
  subtitle: string | null;
  warning: string | null;
  items: CareGuideItem[];
  category: Category;
}

const ICON_OPTIONS = [
  { value: "Droplets", label: "Капли (вода/стирка)" },
  { value: "Wind", label: "Ветер (сушка)" },
  { value: "Sun", label: "Солнце (свет/хранение)" },
  { value: "Eye", label: "Глаз (осмотр)" },
  { value: "AlertTriangle", label: "Внимание" },
  { value: "ShieldCheck", label: "Щит (безопасность)" },
  { value: "RefreshCw", label: "Обновить (замена)" },
  { value: "Package", label: "Коробка (хранение)" },
  { value: "Heart", label: "Сердце (бережный уход)" },
  { value: "Sparkles", label: "Блёстки (красота)" },
  { value: "Gem", label: "Камень (декор)" },
  { value: "Star", label: "Звезда" },
];
const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  Droplets, Wind, Sun, Eye, AlertTriangle, ShieldCheck,
  RefreshCw, Package, Heart, Sparkles, Gem, Star,
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  derzhateli: { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-200" },
  braslety: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
  "vyazanye-igrushki": { bg: "bg-pink-50", text: "text-pink-600", border: "border-pink-200" },
  "vyazannaya-pogremushka": { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" },
  podveski: { bg: "bg-sky-50", text: "text-sky-600", border: "border-sky-200" },
  nabory: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
  aksessuary: { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-200" },
};

/* ── Component ────────────────────────────────────────── */

export default function AdminCareGuidesPage() {
  const [guides, setGuides] = useState<CareGuide[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formSubtitle, setFormSubtitle] = useState("");
  const [formWarning, setFormWarning] = useState("");
  const [formItems, setFormItems] = useState<CareGuideItem[]>([]);
  const [isNew, setIsNew] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/care-guides");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setGuides(data);
    } catch {
      setError("Не удалось загрузить инструкции");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCategories(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchCategories();
  }, [fetchData, fetchCategories]);

  const selectCategory = (categoryId: number) => {
    setActiveCategory(categoryId);
    const existing = guides.find((g) => g.categoryId === categoryId);
    if (existing) {
      setFormTitle(existing.title);
      setFormSubtitle(existing.subtitle || "");
      setFormWarning(existing.warning || "");
      setFormItems([...existing.items]);
      setIsNew(false);
    } else {
      const cat = categories.find((c) => c.id === categoryId);
      setFormTitle(cat ? cat.name : "");
      setFormSubtitle("");
      setFormWarning("");
      setFormItems([]);
      setIsNew(true);
    }
    setError("");
  };

  const addItem = () => {
    setFormItems([...formItems, { icon: "Droplets", text: "" }]);
  };

  const removeItem = (idx: number) => {
    setFormItems(formItems.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: "icon" | "text", value: string) => {
    const updated = [...formItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setFormItems(updated);
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= formItems.length) return;
    const updated = [...formItems];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    setFormItems(updated);
  };

  const handleSave = async () => {
    if (!activeCategory) return;
    if (!formTitle.trim()) {
      setError("Название обязательно");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/care-guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: activeCategory,
          title: formTitle.trim(),
          subtitle: formSubtitle.trim() || null,
          warning: formWarning.trim() || null,
          items: formItems.map((item, i) => ({
            icon: item.icon,
            text: item.text.trim(),
            order: i,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Ошибка сохранения");
      }
      await fetchData();
      setIsNew(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeCategory) return;
    const cat = categories.find((c) => c.id === activeCategory);
    if (!confirm(`Удалить инструкцию для категории «${cat?.name}»?`)) return;
    try {
      const res = await fetch(`/api/admin/care-guides?categoryId=${activeCategory}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setActiveCategory(null);
      await fetchData();
    } catch {
      alert("Не удалось удалить");
    }
  };

  if (loading) {
    return (
      <div>
        <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3 mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const activeCat = categories.find((c) => c.id === activeCategory);
  const catColor = activeCat?.slug ? CATEGORY_COLORS[activeCat.slug] : null;

  const inputClass =
    "px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Уход за изделиями</h2>
        <p className="text-sm text-gray-500 mt-1">
          Инструкции по уходу для каждой категории товаров
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
          {error}
          <button onClick={() => setError("")} className="ml-2 underline">Закрыть</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: category list */}
        <div className="lg:col-span-1">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <p className="text-sm font-semibold text-gray-700">Категории</p>
            </div>
            <div className="divide-y divide-gray-100">
              {categories.map((cat) => {
                const hasGuide = guides.some((g) => g.categoryId === cat.id);
                const isActive = activeCategory === cat.id;
                const colors = CATEGORY_COLORS[cat.slug] || { bg: "bg-gray-50", text: "text-gray-600" };
                return (
                  <button
                    key={cat.id}
                    onClick={() => selectCategory(cat.id)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                      isActive ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${hasGuide ? "bg-green-400" : "bg-gray-300"}`} />
                      <span className={`text-sm font-medium ${isActive ? "text-blue-700" : "text-gray-700"}`}>
                        {cat.name}
                      </span>
                    </div>
                    {hasGuide && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                        Есть
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {activeCategory && guides.some((g) => g.categoryId === activeCategory) && (
            <a
              href={`/care?tab=${activeCat?.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block text-center text-sm text-blue-600 hover:text-blue-700 underline"
            >
              Посмотреть на сайте
            </a>
          )}
        </div>

        {/* Right: edit form */}
        <div className="lg:col-span-2">
          {!activeCategory ? (
            <div className="border border-gray-200 rounded-lg p-12 text-center">
              <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.531 3.847c-.462.462-.88.976-1.246 1.528a10.526 10.526 0 01-1.897 2.238 10.46 10.46 0 01-2.238 1.897c-.552.366-1.066.784-1.528 1.246a5.25 5.25 0 005.964 5.964c.462-.462.88-.976 1.246-1.528a10.526 10.526 0 011.897-2.238 10.46 10.46 0 002.238-1.897c.552-.366 1.066-.784 1.528-1.246A5.25 5.25 0 009.531 3.847z" />
              </svg>
              <p className="text-lg font-medium text-gray-500 mb-1">Выберите категорию</p>
              <p className="text-sm text-gray-400">
                Нажмите на категорию слева, чтобы добавить или отредактировать инструкцию
              </p>
            </div>
          ) : (
            <div className={`border rounded-lg p-5 bg-white ${catColor?.border || "border-gray-200"}`}>
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 rounded-xl ${catColor?.bg || "bg-gray-50"} flex items-center justify-center`}>
                  <span className={`text-lg font-bold ${catColor?.text || "text-gray-600"}`}>
                    {activeCat?.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{activeCat?.name}</h3>
                  <p className="text-xs text-gray-500">
                    {isNew ? "Новая инструкция" : "Редактирование"} &middot; slug: {activeCat?.slug}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Заголовок *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Уход за браслетами-грызунками"
                  className={inputClass + " w-full"}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Подзаголовок</label>
                <input
                  type="text"
                  value={formSubtitle}
                  onChange={(e) => setFormSubtitle(e.target.value)}
                  placeholder="Безопасность и гигиена зубов ребёнка"
                  className={inputClass + " w-full"}
                />
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">Предупреждение (жёлтый блок)</label>
                <textarea
                  value={formWarning}
                  onChange={(e) => setFormWarning(e.target.value)}
                  placeholder="Не сушите на батарее..."
                  rows={2}
                  className={inputClass + " w-full resize-none"}
                />
              </div>

              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">Пункты инструкции</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    + Добавить пункт
                  </button>
                </div>

                {formItems.length === 0 && (
                  <div className="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200 rounded-lg">
                    Нет пунктов. Нажмите &laquo;Добавить пункт&raquo;
                  </div>
                )}

                <div className="space-y-3">
                  {formItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-start border border-gray-200 rounded-lg p-3 bg-gray-50/50">
                      <div className="flex flex-col gap-0.5 shrink-0 pt-1">
                        <button type="button" onClick={() => moveItem(idx, -1)} disabled={idx === 0}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs" title="Вверх">&#9650;</button>
                        <button type="button" onClick={() => moveItem(idx, 1)} disabled={idx === formItems.length - 1}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs" title="Вниз">&#9660;</button>
                      </div>
                      <div className="shrink-0">
                        <div className="grid grid-cols-6 gap-1 p-1.5 border border-gray-300 rounded-md bg-white">
                          {ICON_OPTIONS.map((opt) => {
                            const Ic = ICON_COMPONENTS[opt.value];
                            const isSelected = item.icon === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateItem(idx, "icon", opt.value)}
                                title={opt.label}
                                className={`w-8 h-8 rounded flex items-center justify-center transition-colors cursor-pointer ${
                                  isSelected
                                    ? "bg-blue-100 text-blue-600 ring-1 ring-blue-400"
                                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                }`}
                              >
                                {Ic && <Ic className="w-4 h-4" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <textarea value={item.text} onChange={(e) => updateItem(idx, "text", e.target.value)}
                        placeholder="Текст пункта..." rows={2} className={inputClass + " flex-1 resize-none"} />
                      <button type="button" onClick={() => removeItem(idx)}
                        className="shrink-0 p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Удалить">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                <button onClick={handleSave} disabled={saving}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {saving ? "Сохранение..." : "Сохранить"}
                </button>
                {!isNew && (
                  <button onClick={handleDelete}
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors">
                    Удалить инструкцию
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
