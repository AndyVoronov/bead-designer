"use client";

import { useEffect, useState, useCallback } from "react";

/* ── Types ── */
interface BookStory {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  basePrice: number;
  discountPercent: number;
  recommendedAge: string | null;
  audience: string | null;
  homepageTag: string | null;
  priceDigital: number | null;
  discountDigital: number | null;
  status: string;
  images: { id: number; url: string; isMain: boolean }[];
}

const inputClass = "px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";
const TAG_OPTIONS = ["", "Новинка", "Популярная", "Семейная"];
const AGE_OPTIONS = ["0-3", "3-5", "6-8", "9-12"];

export default function AdminBooksStoriesPage() {
  const [stories, setStories] = useState<BookStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [fName, setFName] = useState("");
  const [fSlug, setFSlug] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fPricePrint, setFPricePrint] = useState("");
  const [fDiscountPrint, setFDiscountPrint] = useState("");
  const [fPriceDigital, setFPriceDigital] = useState("");
  const [fDiscountDigital, setFDiscountDigital] = useState("");
  const [fAge, setFAge] = useState("0-3");
  const [fAudience, setFAudience] = useState("Мальчик, Девочка");
  const [fTag, setFTag] = useState("");
  const [fCover, setFCover] = useState("");
  const [fStatus, setFStatus] = useState("active");
  const [uploading, setUploading] = useState(false);

  const fetchStories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/books-stories");
      if (!res.ok) throw new Error();
      setStories(await res.json());
    } catch {
      setError("Не удалось загрузить истории");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  const resetForm = () => {
    setFName(""); setFSlug(""); setFDesc(""); setFPricePrint(""); setFDiscountPrint("");
    setFPriceDigital(""); setFDiscountDigital(""); setFAge("0-3");
    setFAudience("Мальчик, Девочка"); setFTag(""); setFCover(""); setFStatus("active");
  };

  const startEdit = (s: BookStory) => {
    const effPrice = Math.round(s.basePrice * (1 - s.discountPercent / 100));
    setEditingId(s.id); setIsCreating(false);
    setFName(s.name); setFSlug(s.slug);
    setFDesc(s.shortDescription || s.description || "");
    setFPricePrint(String(s.basePrice)); setFDiscountPrint(String(effPrice));
    setFPriceDigital(s.priceDigital ? String(s.priceDigital) : "");
    setFDiscountDigital(s.discountDigital ? String(s.discountDigital) : "");
    setFAge(s.recommendedAge || "0-3");
    setFAudience(s.audience || "Мальчик, Девочка");
    setFTag(s.homepageTag || "");
    setFCover(s.images.find((i) => i.isMain)?.url || "");
    setFStatus(s.status);
  };

  const uploadCover = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/books/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      setFCover(url);
    } catch {
      alert("Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      name: fName, slug: fSlug, shortDescription: fDesc,
      pricePrint: Number(fPricePrint) || 0,
      discountPrint: Number(fDiscountPrint) || 0,
      priceDigital: fPriceDigital ? Number(fPriceDigital) : null,
      discountDigital: fDiscountDigital ? Number(fDiscountDigital) : null,
      ageGroup: fAge, audience: fAudience, homepageTag: fTag,
      cover: fCover || undefined, status: fStatus,
    };
    try {
      const url = isCreating
        ? "/api/admin/books-stories"
        : `/api/admin/books-stories/${editingId}`;
      const res = await fetch(url, {
        method: isCreating ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Ошибка");
      }
      await fetchStories();
      setIsCreating(false); setEditingId(null); resetForm();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить историю безвозвратно?")) return;
    await fetch(`/api/admin/books-stories/${id}`, { method: "DELETE" });
    await fetchStories();
  };

  const showForm = isCreating || editingId !== null;

  if (loading) {
    return <div className="p-8"><div className="animate-pulse h-8 bg-gray-200 rounded w-64 mb-6" /><div className="animate-pulse h-32 bg-gray-200 rounded mb-4" /></div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Истории книг</h1>
          <p className="text-sm text-gray-500 mt-1">Управление сюжетами на странице /books</p>
        </div>
        {!showForm && (
          <button onClick={() => { resetForm(); setIsCreating(true); setEditingId(null); }} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
            + Добавить историю
          </button>
        )}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}

      {showForm && (
        <div className="mb-6 border border-blue-200 rounded-lg p-4 bg-blue-50/50">
          <h2 className="text-lg font-semibold mb-4">{isCreating ? "Новая история" : "Редактировать"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
              <input value={fName} onChange={(e) => setFName(e.target.value)} className={inputClass + " w-full"} placeholder="«Имя спасает королевство»" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
              <input value={fSlug} onChange={(e) => setFSlug(e.target.value)} className={inputClass + " w-full"} placeholder="imya-spasaet-korolevstvo" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
              <textarea value={fDesc} onChange={(e) => setFDesc(e.target.value)} className={inputClass + " w-full"} rows={3} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Цена печать (₽)</label>
              <input type="number" value={fPricePrint} onChange={(e) => setFPricePrint(e.target.value)} className={inputClass + " w-full"} placeholder="4590" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Цена со скидкой (₽)</label>
              <input type="number" value={fDiscountPrint} onChange={(e) => setFDiscountPrint(e.target.value)} className={inputClass + " w-full"} placeholder="3890" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Цена цифровая (₽)</label>
              <input type="number" value={fPriceDigital} onChange={(e) => setFPriceDigital(e.target.value)} className={inputClass + " w-full"} placeholder="1890" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Цифровая со скидкой (₽)</label>
              <input type="number" value={fDiscountDigital} onChange={(e) => setFDiscountDigital(e.target.value)} className={inputClass + " w-full"} placeholder="1490" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Возраст</label>
              <select value={fAge} onChange={(e) => setFAge(e.target.value)} className={inputClass + " w-full"}>
                {AGE_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Аудитория</label>
              <input value={fAudience} onChange={(e) => setFAudience(e.target.value)} className={inputClass + " w-full"} placeholder="Мальчик, Девочка" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Тег каталога</label>
              <select value={fTag} onChange={(e) => setFTag(e.target.value)} className={inputClass + " w-full"}>
                {TAG_OPTIONS.map((t) => <option key={t} value={t}>{t || "— нет —"}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
              <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={inputClass + " w-full"}>
                <option value="active">Активна</option>
                <option value="draft">Черновик</option>
                <option value="archived">Архив</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Обложка</label>
              <div className="flex items-center gap-3">
                {fCover && <img src={fCover} alt="cover" className="w-16 h-20 object-cover rounded border" />}
                <label className="px-3 py-2 border border-gray-300 rounded-md text-sm cursor-pointer hover:bg-gray-50">
                  {uploading ? "Загрузка..." : "Загрузить обложку"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); }} />
                </label>
                <input value={fCover} onChange={(e) => setFCover(e.target.value)} className={inputClass + " flex-1"} placeholder="/books/covers/... или /uploads/books/..." />
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
            <button onClick={() => { setIsCreating(false); setEditingId(null); resetForm(); }} className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50">
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Stories list */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Обложка</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Цена</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Тег</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stories.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">Историй пока нет</td></tr>
            )}
            {stories.map((s) => {
              const eff = Math.round(s.basePrice * (1 - s.discountPercent / 100));
              const cover = s.images.find((i) => i.isMain)?.url || s.images[0]?.url;
              return (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{cover ? <img src={cover} alt="" className="w-10 h-14 object-cover rounded" /> : <div className="w-10 h-14 bg-gray-100 rounded" />}</td>
                  <td className="px-4 py-3"><div className="font-medium text-gray-900 text-sm">{s.name}</div><div className="text-xs text-gray-400">{s.slug}</div></td>
                  <td className="px-4 py-3 text-sm">{eff} ₽{s.discountPercent > 0 && <span className="text-gray-400 line-through ml-1 text-xs">{s.basePrice}</span>}</td>
                  <td className="px-4 py-3 text-sm">{s.homepageTag && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">{s.homepageTag}</span>}</td>
                  <td className="px-4 py-3 text-sm">{s.status === "active" ? <span className="text-green-600">● активна</span> : <span className="text-gray-400">○ {s.status}</span>}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(s)} className="text-blue-600 hover:text-blue-800 text-sm mr-3">Изменить</button>
                    <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700 text-sm">Удалить</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
