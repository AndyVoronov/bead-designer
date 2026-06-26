"use client";

import { useEffect, useState, useCallback } from "react";

/* ── Types ── */
interface DemoPair { id: number; photoUrl: string; characterUrl: string; order: number; isActive: boolean; }
interface LivePhoto { id: number; url: string; order: number; isActive: boolean; }

const inputClass = "px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

// Field groups for the SiteSettings text section
const TEXT_GROUPS: { title: string; fields: { key: string; label: string }[] }[] = [
  {
    title: "Hero (верхняя секция)",
    fields: [
      { key: "books_hero_badge", label: "Бейдж" },
      { key: "books_hero_eyebrow", label: "Надпись (рукописный)" },
      { key: "books_hero_title_1", label: "Заголовок 1" },
      { key: "books_hero_title_2", label: "Заголовок 2 (подчёркнутый)" },
      { key: "books_hero_title_3", label: "Заголовок 3" },
      { key: "books_hero_subtext", label: "Подзаголовок" },
      { key: "books_hero_video_url", label: "URL видео (hero)" },
      { key: "books_marquee_text", label: "Текст бегущей строки" },
    ],
  },
  {
    title: "Состав заказа / Живая книга",
    fields: [
      { key: "books_whatyouget_badge", label: "Бейдж" },
      { key: "books_whatyouget_title", label: "Заголовок" },
      { key: "books_livebook_title", label: "Название книги" },
      { key: "books_livebook_spec", label: "Характеристики" },
      { key: "books_livebook_price", label: "Цена" },
      { key: "books_livebook_oldprice", label: "Старая цена" },
    ],
  },
  {
    title: "Демо (Загляните в сказку)",
    fields: [
      { key: "books_try_badge", label: "Бейдж" },
      { key: "books_try_title", label: "Заголовок" },
      { key: "books_try_subtext", label: "Подзаголовок" },
      { key: "books_try_cta", label: "Кнопка CTA" },
      { key: "books_try_helper", label: "Подсказка" },
    ],
  },
  {
    title: "Отзывы",
    fields: [
      { key: "books_reviews_badge", label: "Бейдж" },
      { key: "books_reviews_eyebrow", label: "Надпись (рукописный)" },
      { key: "books_reviews_title", label: "Заголовок" },
      { key: "books_social_proof", label: "Социальное доказательство" },
    ],
  },
  {
    title: "Футер",
    fields: [
      { key: "books_footer_tagline", label: "Слоган" },
      { key: "books_footer_tagline_hand", label: "Подпись (рукописный)" },
      { key: "books_footer_year", label: "Год" },
    ],
  },
];

export default function AdminBooksContentPage() {
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [pairs, setPairs] = useState<DemoPair[]>([]);
  const [photos, setPhotos] = useState<LivePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingTexts, setSavingTexts] = useState(false);
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [sRes, pRes, phRes] = await Promise.all([
        fetch("/api/admin/site-settings"),
        fetch("/api/admin/demo-pairs"),
        fetch("/api/admin/live-photos"),
      ]);
      const sData = await sRes.json();
      setTexts(sData.settings || {});
      setPairs(await pRes.json());
      setPhotos(await phRes.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const saveTexts = async () => {
    setSavingTexts(true);
    try {
      await fetch("/api/admin/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(texts),
      });
      alert("Тексты сохранены");
    } catch {
      alert("Ошибка сохранения");
    } finally {
      setSavingTexts(false);
    }
  };

  const uploadMedia = async (file: File, purpose: "hero" | "demo-photo" | "demo-char" | "live", pairId?: number) => {
    const key = `${purpose}${pairId ? "-" + pairId : ""}`;
    setUploadingType(key);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/books/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      const { url } = await res.json();

      if (purpose === "hero") {
        setTexts((t) => ({ ...t, books_hero_video_url: url }));
      } else if (purpose === "demo-photo" && pairId) {
        await fetch(`/api/admin/demo-pairs/${pairId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ photoUrl: url }) });
        await loadAll();
      } else if (purpose === "demo-char" && pairId) {
        await fetch(`/api/admin/demo-pairs/${pairId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterUrl: url }) });
        await loadAll();
      } else if (purpose === "live") {
        await fetch("/api/admin/live-photos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, order: photos.length }) });
        await loadAll();
      }
    } catch {
      alert("Ошибка загрузки");
    } finally {
      setUploadingType(null);
    }
  };

  const deletePair = async (id: number) => {
    if (!confirm("Удалить пару?")) return;
    await fetch(`/api/admin/demo-pairs/${id}`, { method: "DELETE" });
    await loadAll();
  };

  const deletePhoto = async (id: number) => {
    if (!confirm("Удалить фото?")) return;
    await fetch(`/api/admin/live-photos/${id}`, { method: "DELETE" });
    await loadAll();
  };

  const addPair = async () => {
    await fetch("/api/admin/demo-pairs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoUrl: "/books/transform/girl.webp", characterUrl: "/books/transform/girl-character.webp", order: pairs.length }),
    });
    await loadAll();
  };

  if (loading) {
    return <div className="p-8"><div className="animate-pulse h-8 bg-gray-200 rounded w-64 mb-6" /></div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Страница книг</h1>
      <p className="text-sm text-gray-500 mb-6">Тексты, видео и медиа для страницы /books</p>

      {/* Text settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Тексты секций</h2>
          <button onClick={saveTexts} disabled={savingTexts} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
            {savingTexts ? "Сохранение..." : "Сохранить тексты"}
          </button>
        </div>
        <div className="space-y-6">
          {TEXT_GROUPS.map((g) => (
            <div key={g.title}>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 pb-1 border-b border-gray-100">{g.title}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {g.fields.map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                    {f.key === "books_hero_subtext" || f.key === "books_try_subtext" ? (
                      <textarea value={texts[f.key] || ""} onChange={(e) => setTexts((t) => ({ ...t, [f.key]: e.target.value }))} className={inputClass + " w-full"} rows={2} />
                    ) : (
                      <input value={texts[f.key] || ""} onChange={(e) => setTexts((t) => ({ ...t, [f.key]: e.target.value }))} className={inputClass + " w-full"} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hero video */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-lg font-semibold mb-3">Hero видео</h2>
        <div className="flex items-center gap-3">
          {texts.books_hero_video_url && (
            texts.books_hero_video_url.match(/\.(mp4|mov|webm)$/i)
              ? <video src={texts.books_hero_video_url} className="w-24 h-32 object-cover rounded border" muted />
              : <img src={texts.books_hero_video_url} alt="hero" className="w-24 h-32 object-cover rounded border" />
          )}
          <label className="px-3 py-2 border border-gray-300 rounded-md text-sm cursor-pointer hover:bg-gray-50">
            {uploadingType === "hero" ? "Загрузка..." : "Загрузить видео"}
            <input type="file" accept="video/*,image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMedia(f, "hero"); }} />
          </label>
          <input value={texts.books_hero_video_url || ""} onChange={(e) => setTexts((t) => ({ ...t, books_hero_video_url: e.target.value }))} className={inputClass + " flex-1"} placeholder="/books/hero.mov или /uploads/books/..." />
        </div>
      </div>

      {/* Demo pairs */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Демо-пары (до → после)</h2>
          <button onClick={addPair} className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">+ Добавить пару</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pairs.map((p) => (
            <div key={p.id} className="border border-gray-200 rounded-lg p-3 flex gap-3">
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <img src={p.photoUrl} alt="до" className="w-20 h-24 object-cover rounded border" />
                  <label className="block text-[10px] text-center text-gray-500 mt-1 cursor-pointer hover:text-blue-600">
                    {uploadingType === `demo-photo-${p.id}` ? "..." : "сменить"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMedia(f, "demo-photo", p.id); }} />
                  </label>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <img src={p.characterUrl} alt="после" className="w-20 h-24 object-cover rounded border" />
                  <label className="block text-[10px] text-center text-gray-500 mt-1 cursor-pointer hover:text-blue-600">
                    {uploadingType === `demo-char-${p.id}` ? "..." : "сменить"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMedia(f, "demo-char", p.id); }} />
                  </label>
                </div>
              </div>
              <button onClick={() => deletePair(p.id)} className="ml-auto self-start text-red-500 hover:text-red-700 text-xs">✕</button>
            </div>
          ))}
          {pairs.length === 0 && <p className="text-sm text-gray-400">Пар пока нет</p>}
        </div>
      </div>

      {/* Live photos */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Фото «Живые эмоции» ({photos.length})</h2>
          <label className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 cursor-pointer">
            {uploadingType === "live" ? "Загрузка..." : "+ Добавить фото"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMedia(f, "live"); }} />
          </label>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="relative group">
              <img src={p.url} alt="" className="w-full aspect-[3/4] object-cover rounded border" />
              <button onClick={() => deletePhoto(p.id)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
            </div>
          ))}
          {photos.length === 0 && <p className="col-span-full text-sm text-gray-400">Фото пока нет</p>}
        </div>
      </div>
    </div>
  );
}
