"use client";

import { useEffect, useState, useCallback } from "react";
import { TrustIcon } from "@/components/catalog/TrustIcon";

/* ── Types ────────────────────────────────────────────── */

interface TrustBadge {
  id: number;
  label: string;
  icon: string;
  description: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
}

const ICON_OPTIONS = [
  "Shield",
  "HandMetal",
  "Truck",
  "RotateCcw",
  "Heart",
  "Star",
  "Package",
  "Clock",
  "Award",
  "Gem",
];

/* ── Component ────────────────────────────────────────── */

export default function AdminTrustBadgesPage() {
  const [badges, setBadges] = useState<TrustBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form state
  const [formLabel, setFormLabel] = useState("");
  const [formIcon, setFormIcon] = useState("Shield");
  const [formDescription, setFormDescription] = useState("");
  const [formOrder, setFormOrder] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);

  /* ── Fetch ── */

  const fetchBadges = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/trust-badges");
      if (!res.ok) throw new Error();
      setBadges(await res.json());
    } catch {
      setError("Не удалось загрузить сигналы доверия");
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
    setFormIcon("Shield");
    setFormDescription("");
    setFormOrder(0);
    setFormIsActive(true);
    setEditingId(null);
    setIsCreating(false);
  };

  const startEdit = (badge: TrustBadge) => {
    setEditingId(badge.id);
    setFormLabel(badge.label);
    setFormIcon(badge.icon);
    setFormDescription(badge.description ?? "");
    setFormOrder(badge.order);
    setFormIsActive(badge.isActive);
    setIsCreating(false);
  };

  /* ── CRUD ── */

  const handleSave = async () => {
    if (!formLabel.trim()) {
      setError("Название обязательно");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (isCreating) {
        const res = await fetch("/api/admin/trust-badges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: formLabel.trim(),
            icon: formIcon,
            description: formDescription.trim() || null,
            order: formOrder,
            isActive: formIsActive,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Ошибка создания");
        }
      } else if (editingId !== null) {
        const res = await fetch(`/api/admin/trust-badges/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: formLabel.trim(),
            icon: formIcon,
            description: formDescription.trim() || null,
            order: formOrder,
            isActive: formIsActive,
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
    if (!confirm(`Удалить «${label}»?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/trust-badges/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      await fetchBadges();
    } catch {
      alert("Не удалось удалить сигнал доверия");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleActive = async (badge: TrustBadge) => {
    try {
      const res = await fetch(`/api/admin/trust-badges/${badge.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !badge.isActive }),
      });
      if (!res.ok) throw new Error();
      await fetchBadges();
    } catch {
      alert("Не удалось обновить статус");
    }
  };

  /* ── Render ── */

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

  const inputClass =
    "px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Сигналы доверия</h2>
          <span className="text-sm text-gray-500">{badges.length}</span>
        </div>
        <button
          onClick={() => {
            resetForm();
            setFormOrder(badges.length);
            setIsCreating(true);
          }}
          disabled={isCreating}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          + Добавить сигнал
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
            {isCreating ? "Новый сигнал доверия" : `Редактирование: ${formLabel}`}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название *
              </label>
              <input
                type="text"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="Безопасные материалы"
                className={inputClass + " w-full"}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Иконка *
              </label>
              <select
                value={formIcon}
                onChange={(e) => setFormIcon(e.target.value)}
                className={inputClass + " w-full"}
              >
                {ICON_OPTIONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание
              </label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Необязательное описание"
                className={inputClass + " w-full"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Порядок
              </label>
              <input
                type="number"
                min={0}
                value={formOrder}
                onChange={(e) => setFormOrder(Number(e.target.value))}
                className={inputClass + " w-full"}
              />
            </div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="accent-blue-600 w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">Активен</span>
              </label>
            </div>
          </div>

          {/* Icon preview */}
          <div className="flex items-center gap-3 mb-3 p-2 bg-white rounded-md border border-gray-200">
            <span className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center">
              <TrustIcon name={formIcon} className="w-4 h-4 text-rose-500" />
            </span>
            <span className="text-sm font-medium text-gray-700">
              {formLabel || "Название..."}
            </span>
            {formDescription && (
              <span className="text-xs text-gray-500">— {formDescription}</span>
            )}
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
      )}

      {/* Table */}
      {badges.length === 0 && !isCreating ? (
        <div className="text-gray-500 py-12 text-center">
          <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <p className="text-lg font-medium mb-1">Добавьте сигналы доверия</p>
          <p className="text-sm text-gray-400">
            Сигналы доверия отображаются на карточках товаров и повышают доверие покупателей
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Иконка</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Название</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Описание</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Порядок</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Статус</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Действия</th>
              </tr>
            </thead>
            <tbody>
              {badges.map((badge) => (
                <tr
                  key={badge.id}
                  className={`border-b border-gray-100 last:border-0 ${
                    !badge.isActive ? "opacity-60" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center inline-flex">
                      <TrustIcon name={badge.icon} className="w-4 h-4 text-rose-500" />
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium text-gray-900">{badge.label}</span>
                      <span className="text-xs text-gray-400 ml-2">{badge.icon}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                    {badge.description || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{badge.order}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(badge)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        badge.isActive
                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {badge.isActive ? "Активен" : "Выключен"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(badge)}
                        className="px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                      >
                        Изменить
                      </button>
                      <button
                        onClick={() => handleDelete(badge.id, badge.label)}
                        disabled={deletingId === badge.id}
                        className="px-2 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        {deletingId === badge.id ? "..." : "Удалить"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
