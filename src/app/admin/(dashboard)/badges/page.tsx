"use client";

import { useEffect, useState, useCallback } from "react";
import type { Badge } from "@/types/catalog";

/* ── Component ────────────────────────────────────────── */

export default function AdminBadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form state
  const [formLabel, setFormLabel] = useState("");
  const [formTextColor, setFormTextColor] = useState("#ffffff");
  const [formBgColor, setFormBgColor] = useState("#000000");

  /* ── Fetch ── */

  const fetchBadges = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/badges");
      if (!res.ok) throw new Error();
      setBadges(await res.json());
    } catch {
      setError("Не удалось загрузить бейджи");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  /* ── Helpers ── */

  const resetForm = () => {
    setFormLabel("");
    setFormTextColor("#ffffff");
    setFormBgColor("#000000");
    setEditingId(null);
    setIsCreating(false);
  };

  const startEdit = (badge: Badge) => {
    setEditingId(badge.id);
    setFormLabel(badge.label);
    setFormTextColor(badge.textColor);
    setFormBgColor(badge.bgColor);
    setIsCreating(false);
  };

  /* ── CRUD ── */

  const handleSave = async () => {
    if (!formLabel.trim()) {
      setError("Название бейджа обязательно");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (isCreating) {
        const res = await fetch("/api/admin/badges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: formLabel.trim(),
            textColor: formTextColor,
            bgColor: formBgColor,
            order: badges.length,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Ошибка создания");
        }
      } else if (editingId !== null) {
        const res = await fetch(`/api/admin/badges/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: formLabel.trim(),
            textColor: formTextColor,
            bgColor: formBgColor,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Ошибка сохранения");
        }
      }

      await fetchBadges();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, label: string) => {
    if (!confirm(`Удалить бейдж «${label}»?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/badges/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      await fetchBadges();
    } catch {
      alert("Не удалось удалить бейдж");
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Render ── */

  if (loading) {
    return (
      <div>
        <div className="h-8 bg-gray-200 rounded animate-pulse w-1/4 mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
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
          <h2 className="text-2xl font-bold text-gray-900">Бейджи</h2>
          <span className="text-sm text-gray-500">{badges.length}</span>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsCreating(true);
          }}
          disabled={isCreating}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          + Новый бейдж
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
          {error}
          <button onClick={() => setError("")} className="ml-2 underline">
            Закрыть
          </button>
        </div>
      )}

      {/* Create / Edit form */}
      {(isCreating || editingId !== null) && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {isCreating ? "Новый бейдж" : `Редактирование: ${formLabel}`}
          </h3>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название
              </label>
              <input
                type="text"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="NEW"
                className={inputClass + " w-32"}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Цвет текста
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formTextColor}
                  onChange={(e) => setFormTextColor(e.target.value)}
                  className="w-8 h-9 border border-gray-300 rounded cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={formTextColor}
                  onChange={(e) => setFormTextColor(e.target.value)}
                  className={inputClass + " w-24"}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Цвет фона
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formBgColor}
                  onChange={(e) => setFormBgColor(e.target.value)}
                  className="w-8 h-9 border border-gray-300 rounded cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={formBgColor}
                  onChange={(e) => setFormBgColor(e.target.value)}
                  className={inputClass + " w-24"}
                />
              </div>
            </div>
            {/* Preview */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Превью
              </label>
              <span
                className="inline-block px-3 py-1.5 rounded-full text-sm font-medium"
                style={{
                  color: formTextColor,
                  backgroundColor: formBgColor,
                }}
              >
                {formLabel || "PREVIEW"}
              </span>
            </div>
            <div className="flex items-center gap-2">
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
        </div>
      )}

      {/* Grid */}
      {badges.length === 0 && !isCreating ? (
        <div className="text-gray-500 py-8 text-center">
          Нет бейджей. Создайте первый.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow"
            >
              {/* Badge preview */}
              <div className="flex items-center justify-center mb-3">
                <span
                  className="inline-block px-4 py-2 rounded-full text-sm font-bold tracking-wide"
                  style={{
                    color: badge.textColor,
                    backgroundColor: badge.bgColor,
                  }}
                >
                  {badge.label}
                </span>
              </div>

              {/* Info */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-full border border-gray-300 shrink-0"
                    style={{ backgroundColor: badge.bgColor }}
                  />
                  <span className="text-xs text-gray-500 font-mono">
                    {badge.bgColor}
                  </span>
                </div>
                <span className="text-xs text-gray-400">#{badge.id}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startEdit(badge)}
                  className="flex-1 px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors text-center"
                >
                  Изменить
                </button>
                <button
                  onClick={() => handleDelete(badge.id, badge.label)}
                  disabled={deletingId === badge.id}
                  className="flex-1 px-2 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors disabled:opacity-50 text-center"
                >
                  {deletingId === badge.id ? "..." : "Удалить"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
