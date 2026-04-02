"use client";

import { useAuth } from "@/lib/auth-provider";
import { useState, useEffect, useCallback } from "react";
import { decodeDesign } from "@/lib/serialization";
import { getCatalogBead } from "@/data/catalogBeads";
import { SignOut } from "@/components/auth/SignOut";

type Tab = "designs" | "favorites" | "reviews" | "orders" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "designs", label: "Мои дизайны" },
  { id: "favorites", label: "Избранное" },
  { id: "reviews", label: "Отзывы" },
  { id: "orders", label: "Заказы" },
  { id: "settings", label: "Профиль" },
];

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("designs");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <div className="text-gray-500">Войдите, чтобы открыть личный кабинет</div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("auth-required"))}
          className="px-6 py-2.5 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition-colors cursor-pointer"
        >
          Войти
        </button>
        <a href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ← На главную
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-xl font-semibold overflow-hidden">
                {user.image ? (
                  <img src={user.image} alt={user.name ?? ""} className="w-full h-full object-cover" />
                ) : (
                  (user.name ?? "U").charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {user.name || "Пользователь"}
                </h1>
                {user.email && (
                  <p className="text-sm text-gray-500">{user.email}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← На сайт
              </a>
              <SignOut />
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? "text-rose-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-rose-500 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Tab Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {activeTab === "designs" && <TabDesigns />}
        {activeTab === "favorites" && <TabFavorites />}
        {activeTab === "reviews" && <TabReviews />}
        {activeTab === "orders" && <TabOrders />}
        {activeTab === "settings" && <TabSettings />}
      </main>
    </div>
  );
}

// ── Tab placeholders ─────────────────────────────────────────────────────────

function TabDesigns() {
  const [designs, setDesigns] = useState<Array<{ id: number; name: string; designCode: string; beadCount: number; updatedAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    fetch("/api/designs/saved")
      .then((r) => r.json())
      .then(setDesigns)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRename = useCallback(async () => {
    if (renamingId === null || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      const res = await fetch(`/api/designs/saved/${renamingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDesigns((prev) =>
          prev.map((d) => (d.id === renamingId ? { ...d, name: updated.name } : d))
        );
      }
    } catch (err) {
      console.error("Failed to rename:", err);
    } finally {
      setRenamingId(null);
    }
  }, [renamingId, renameValue]);

  if (loading) return <LoadingSkeleton />;

  if (designs.length === 0) {
    return <EmptyState text="У вас пока нет сохранённых дизайнов" />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {designs.map((d) => (
        <div
          key={d.id}
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
        >
          {renamingId === d.id ? (
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") setRenamingId(null);
                }}
                className="flex-1 px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                autoFocus
              />
              <button
                onClick={handleRename}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors cursor-pointer"
                aria-label="Сохранить"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
              <button
                onClick={() => setRenamingId(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-200 text-gray-500 hover:bg-gray-300 transition-colors cursor-pointer"
                aria-label="Отмена"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18" /><path d="M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <h3 className="font-medium text-gray-900">{d.name}</h3>
          )}
          <div className="flex items-center gap-1 mt-1.5 min-h-[16px]">
            {(() => {
              try {
                const design = decodeDesign(d.designCode);
                return (design?.b ?? []).slice(0, 10).map((id, i) => {
                  const bead = getCatalogBead(id);
                  return <span key={i} className="block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: bead?.color ?? "#D1D5DB" }} />;
                });
              } catch { return null; }
            })()}
          </div>
          <p className="text-sm text-gray-500 mt-1">{d.beadCount} бусин</p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(d.updatedAt).toLocaleDateString("ru-RU")}
          </p>
          <div className="flex gap-2 mt-3">
            <a
              href={`/editor?design=${d.id}`}
              className="text-sm text-rose-600 hover:text-rose-700 font-medium"
            >
              Открыть
            </a>
            <button
              onClick={() => { setRenamingId(d.id); setRenameValue(d.name); }}
              className="text-sm text-gray-400 hover:text-blue-500"
            >
              Переименовать
            </button>
            <button
              onClick={() => {
                fetch(`/api/designs/saved/${d.id}`, { method: "DELETE" }).then(() =>
                  setDesigns((prev) => prev.filter((x) => x.id !== d.id))
                );
              }}
              className="text-sm text-gray-400 hover:text-red-500"
            >
              Удалить
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function TabFavorites() {
  const [favorites, setFavorites] = useState<Array<{ id: number; templateId: number; template: { id: number; name: string; designCode: string; beadCount: number } }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/favorites")
      .then((r) => r.json())
      .then(setFavorites)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUnfavorite = useCallback(async (templateId: number) => {
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId }),
    });
    setFavorites((prev) => prev.filter((f) => f.templateId !== templateId));
  }, []);

  if (loading) return <LoadingSkeleton />;

  if (favorites.length === 0) {
    return <EmptyState text="У вас пока нет избранных шаблонов" />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {favorites.map((f) => (
        <div
          key={f.id}
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow relative"
        >
          <div className="flex items-center gap-1 mb-2 min-h-[16px]">
            {(() => {
              try {
                const design = decodeDesign(f.template.designCode);
                return (design?.b ?? []).slice(0, 10).map((id, i) => {
                  const bead = getCatalogBead(id);
                  return <span key={i} className="block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: bead?.color ?? "#D1D5DB" }} />;
                });
              } catch { return null; }
            })()}
          </div>
          <h3 className="font-medium text-gray-900">{f.template.name}</h3>
          <p className="text-sm text-gray-500 mt-1">{f.template.beadCount} бусин</p>
          <div className="flex gap-3 mt-2">
            <a
              href={`/design/${f.template.designCode}`}
              className="text-sm text-rose-600 hover:text-rose-700 font-medium"
            >
              Посмотреть
            </a>
            <button
              onClick={() => handleUnfavorite(f.templateId)}
              className="text-sm text-gray-400 hover:text-red-500"
            >
              Убрать
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function TabReviews() {
  const [reviews, setReviews] = useState<Array<{ id: number; authorName: string; rating: number; text: string; isApproved: boolean; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reviews/mine")
      .then((r) => r.json())
      .then(setReviews)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;

  if (reviews.length === 0) {
    return <EmptyState text="Вы пока не оставили ни одного отзыва" />;
  }

  return (
    <div className="flex flex-col gap-3">
      {reviews.map((r) => (
        <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg
                  key={i}
                  width="16"
                  height="16"
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
                  : "bg-amber-50 text-amber-600"
              }`}
            >
              {r.isApproved ? "Опубликовано" : "На модерации"}
            </span>
          </div>
          <p className="text-gray-700">{r.text}</p>
          <p className="text-xs text-gray-400 mt-2">
            {new Date(r.createdAt).toLocaleDateString("ru-RU")}
          </p>
        </div>
      ))}
    </div>
  );
}

function TabOrders() {
  const [orders, setOrders] = useState<Array<{ id: number; designCode: string; beadCount: number; status: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders/mine")
      .then((r) => r.json())
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;

  if (orders.length === 0) {
    return <EmptyState text="У вас пока нет заказов" />;
  }

  const statusLabels: Record<string, { text: string; color: string }> = {
    new: { text: "Новый", color: "bg-blue-50 text-blue-600" },
    processing: { text: "В работе", color: "bg-amber-50 text-amber-600" },
    completed: { text: "Выполнен", color: "bg-emerald-50 text-emerald-600" },
  };

  return (
    <div className="flex flex-col gap-3">
      {orders.map((o) => {
        const status = statusLabels[o.status] || statusLabels.new;
        return (
          <div key={o.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-1 mb-2 min-h-[16px]">
              {(() => {
                try {
                  const design = decodeDesign(o.designCode);
                  return (design?.b ?? []).slice(0, 10).map((id, i) => {
                    const bead = getCatalogBead(id);
                    return <span key={i} className="block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: bead?.color ?? "#D1D5DB" }} />;
                  });
                } catch { return null; }
              })()}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Заказ #{o.id} · {o.beadCount} бусин
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(o.createdAt).toLocaleDateString("ru-RU")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/design/${o.designCode}`}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium"
                >
                  Открыть
                </a>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
                  {status.text}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TabSettings() {
  const { user } = useAuth();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Настройки профиля</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
          <input
            type="text"
            defaultValue={user?.name ?? ""}
            placeholder="Ваше имя"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
          <input
            type="tel"
            placeholder="+7 (___) ___-__-__"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          />
        </div>
        <button className="px-4 py-2 bg-rose-500 text-white text-sm font-medium rounded-lg hover:bg-rose-600 transition-colors cursor-pointer">
          Сохранить
        </button>
      </div>
    </div>
  );
}

// ── Shared components ────────────────────────────────────────────────────────

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-12 text-gray-400">
      <p>{text}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 h-24" />
      ))}
    </div>
  );
}
