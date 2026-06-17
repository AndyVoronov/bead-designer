"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function formatDateRu(date: string): string {
  const d = new Date(date);
  const parts = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(d);
  const day = parts.find(p => p.type === "day")?.value ?? "";
  const month = parts.find(p => p.type === "month")?.value ?? "";
  const year = parts.find(p => p.type === "year")?.value ?? "";
  const hour = parts.find(p => p.type === "hour")?.value ?? "";
  const minute = parts.find(p => p.type === "minute")?.value ?? "";
  return `${day} ${month} ${year}, ${hour}:${minute}`;
}

function relativeTime(date: string): string {
  const now = Date.now();
  const target = new Date(date).getTime();
  const diff = target - now;
  const abs = Math.abs(diff);
  const isFuture = diff > 0;
  const prefix = isFuture ? "через" : "";

  if (abs < 60_000) return isFuture ? "сейчас" : "только что";
  if (abs < 3_600_000) return `${prefix} ${Math.round(abs / 60_000)} мин`;
  if (abs < 86_400_000) {
    const h = Math.floor(abs / 3_600_000);
    const m = Math.round((abs % 3_600_000) / 60_000);
    if (m < 5) return `${prefix} ${h} ч`;
    return `${prefix} ${h} ч ${m} мин`;
  }
  const days = Math.floor(abs / 86_400_000);
  return `${prefix} ${days} дн`;
}

function toMSK(date: Date): Date {
  // Convert to MSK string then back to avoid timezone drift
  const str = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
  const [d, m, y] = str.split(".").map(Number);
  return new Date(y, m - 1, d);
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: "Ожидает", color: "bg-blue-50 text-blue-700 ring-blue-600/20", dot: "bg-blue-500" },
  processing: { label: "В работе", color: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500 animate-pulse" },
  completed: { label: "Готово", color: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  failed: { label: "Ошибка", color: "bg-red-50 text-red-700 ring-red-600/20", dot: "bg-red-500" },
};

type Status = "all" | "pending" | "processing" | "completed" | "failed";
type Sort = "date-asc" | "date-desc" | "topic";
type ViewMode = "list" | "calendar";

interface Post {
  id: number;
  topic: string;
  additionalRequirements: string | null;
  productIds: string | null;
  scheduledAt: string;
  status: string;
  articleId: number | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  article: { id: number; title: string; slug: string; status: string } | null;
}

function toDatetimeLocal(date: string): string {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

/* ── Edit Post inline component ── */

function EditPostInline({
  post,
  onSave,
  onCancel,
  saving,
}: {
  post: Post;
  onSave: (id: number, data: { topic: string; additionalRequirements: string | null; scheduledAt: string }) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [topic, setTopic] = useState(post.topic);
  const [req, setReq] = useState(post.additionalRequirements ?? "");
  const [date, setDate] = useState(toDatetimeLocal(post.scheduledAt));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    onSave(post.id, { topic: topic.trim(), additionalRequirements: req.trim() || null, scheduledAt: new Date(date).toISOString() });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-blue-50/50 rounded-xl border border-blue-200 p-4 mt-2.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Тема</label>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:border-rose-300 focus:ring-1 focus:ring-rose-200 outline-none transition-all"
            autoFocus
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Доп. требования</label>
          <input
            type="text"
            value={req}
            onChange={e => setReq(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:border-rose-300 focus:ring-1 focus:ring-rose-200 outline-none transition-all"
            placeholder="Опционально..."
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Дата и время (MSK)</label>
          <input
            type="datetime-local"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:border-rose-300 focus:ring-1 focus:ring-rose-200 outline-none transition-all"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={saving || !topic.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-500 text-white text-xs font-medium hover:bg-rose-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center px-3 py-2 rounded-lg bg-white text-gray-600 text-xs font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </form>
  );
}

/* ── Calendar component ── */

function CalendarView({
  posts,
  onDayClick,
  selectedDate,
}: {
  posts: Post[];
  onDayClick: (dateStr: string | null) => void;
  selectedDate: string | null;
}) {
  const now = new Date();
  const todayMSK = toMSK(now);
  const [calYear, setCalYear] = useState(todayMSK.getFullYear());
  const [calMonth, setCalMonth] = useState(todayMSK.getMonth());

  // Group posts by MSK date string "YYYY-MM-DD"
  const postsByDay = useMemo(() => {
    const map: Record<string, Post[]> = {};
    posts.forEach(p => {
      const d = toMSK(new Date(p.scheduledAt));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [posts]);

  // Build calendar grid (Mon=0, Sun=6)
  const firstDay = new Date(calYear, calMonth, 1);
  let startWeekday = firstDay.getDay(); // 0=Sun
  startWeekday = startWeekday === 0 ? 6 : startWeekday - 1; // Mon=0
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const cells: { day: number; key: string | null }[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ day: 0, key: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, key });
  }

  const todayKey = `${todayMSK.getFullYear()}-${String(todayMSK.getMonth() + 1).padStart(2, "0")}-${String(todayMSK.getDate()).padStart(2, "0")}`;

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const totalInMonth = Object.entries(postsByDay)
    .filter(([key]) => key.startsWith(`${calYear}-${String(calMonth + 1).padStart(2, "0")}-`))
    .reduce((sum, [, arr]) => sum + arr.length, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button onClick={prevMonth} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="text-center">
          <span className="text-sm font-semibold text-gray-900">
            {MONTHS_RU[calMonth]} {calYear}
          </span>
          {totalInMonth > 0 && (
            <span className="ml-2 text-xs text-gray-400">{totalInMonth} стат.</span>
          )}
        </div>
        <button onClick={nextMonth} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEKDAYS_SHORT.map(d => (
          <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-2 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const dayPosts = cell.key ? (postsByDay[cell.key] ?? []) : [];
          const isToday = cell.key === todayKey;
          const isSelected = cell.key === selectedDate;
          const hasPosts = dayPosts.length > 0;
          const pendingCount = dayPosts.filter(p => p.status === "pending").length;
          const completedCount = dayPosts.filter(p => p.status === "completed").length;
          const failedCount = dayPosts.filter(p => p.status === "failed").length;

          return (
            <button
              key={i}
              disabled={!cell.key}
              onClick={() => onDayClick(isSelected ? null : cell.key)}
              className={`relative flex flex-col items-center justify-center py-2 min-h-[60px] transition-all border-b border-r border-gray-50 ${
                cell.key
                  ? `hover:bg-rose-50 cursor-pointer ${isSelected ? "bg-rose-50 ring-2 ring-inset ring-rose-400" : ""}`
                  : ""
              }`}
            >
              <span className={`text-xs font-medium ${isToday ? "bg-rose-500 text-white rounded-full w-6 h-6 flex items-center justify-center" : "text-gray-700"}`}>
                {cell.day > 0 ? cell.day : ""}
              </span>
              {hasPosts && (
                <div className="flex items-center gap-0.5 mt-0.5">
                  {pendingCount > 0 && (
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold">
                      {dayPosts.length}
                    </span>
                  )}
                  {completedCount > 0 && pendingCount === 0 && (
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold">
                      {dayPosts.length}
                    </span>
                  )}
                  {failedCount > 0 && pendingCount === 0 && completedCount === 0 && (
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-100 text-red-700 text-[9px] font-bold">
                      {dayPosts.length}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 px-4 py-2.5 bg-gray-50/50 border-t border-gray-100">
        <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Ожидает
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Готово
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Ошибка
        </span>
      </div>

      {/* Selected day posts */}
      {selectedDate && postsByDay[selectedDate] && (
        <div className="border-t border-gray-200 p-3 max-h-64 overflow-y-auto">
          <div className="text-[11px] font-semibold text-gray-500 mb-2">
            {selectedDate.split("-").reverse().join(".")} — {postsByDay[selectedDate].length} статей
          </div>
          <div className="space-y-1.5">
            {postsByDay[selectedDate].map(p => {
              const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.pending;
              const time = new Intl.DateTimeFormat("ru-RU", {
                timeZone: "Europe/Moscow",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(p.scheduledAt));
              return (
                <div key={p.id} className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-2.5 py-1.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                  <span className="text-gray-500 font-mono shrink-0">{time}</span>
                  <span className="text-gray-700 truncate flex-1">{p.topic}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main component ── */

export default function ScheduledClient({
  posts,
  counts,
}: {
  posts: Post[];
  counts: Record<string, number>;
}) {
  const [status, setStatus] = useState<Status>("all");
  const [sort, setSort] = useState<Sort>("date-desc");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<ViewMode>("list");
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);

  const filtered = posts
    .filter(p => status === "all" || p.status === status)
    .filter(p => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return p.topic.toLowerCase().includes(q) || p.additionalRequirements?.toLowerCase().includes(q);
    })
    .filter(p => {
      if (!selectedCalDate) return true;
      const d = toMSK(new Date(p.scheduledAt));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return key === selectedCalDate;
    })
    .sort((a, b) => {
      if (sort === "date-asc") return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      if (sort === "date-desc") return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
      return a.topic.localeCompare(b.topic, "ru");
    });

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить задачу из расписания?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/blog/schedule/${id}`, { method: "DELETE" });
      if (res.ok) {
        window.location.reload();
      }
    } catch {}
    setDeleting(null);
  };

  const handleEdit = async (
    id: number,
    data: { topic: string; additionalRequirements: string | null; scheduledAt: string }
  ) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/blog/schedule/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setEditingId(null);
        window.location.reload();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Ошибка при сохранении");
      }
    } catch {
      alert("Ошибка при сохранении");
    }
    setSaving(false);
  };

  const handleDayClick = (dateStr: string | null) => {
    setSelectedCalDate(dateStr);
    if (dateStr && view === "calendar") {
      setView("list");
    }
  };

  const filters: { key: Status; label: string; count: number }[] = [
    { key: "all", label: "Все", count: counts.all },
    { key: "pending", label: "Ожидает", count: counts.pending },
    { key: "processing", label: "В работе", count: counts.processing },
    { key: "completed", label: "Готово", count: counts.completed },
    { key: "failed", label: "Ошибка", count: counts.failed },
  ];

  return (
    <div>
      {/* Filters bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Поиск по теме..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-rose-300 focus:ring-1 focus:ring-rose-200 outline-none transition-all"
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setView("list")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              Список
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === "calendar" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Календарь
            </button>
          </div>

          {/* Sort */}
          {view === "list" && (
            <select
              value={sort}
              onChange={e => setSort(e.target.value as Sort)}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-rose-300 outline-none cursor-pointer"
            >
              <option value="date-desc">Сначала новые</option>
              <option value="date-asc">Сначала старые</option>
              <option value="topic">По теме</option>
            </select>
          )}
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                status === f.key
                  ? "bg-rose-500 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                status === f.key ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500"
              }`}>
                {f.count}
              </span>
            </button>
          ))}

          {selectedCalDate && (
            <button
              onClick={() => setSelectedCalDate(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-100 text-rose-700 hover:bg-rose-200 transition-all"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              {selectedCalDate.split("-").reverse().join(".")}
            </button>
          )}
        </div>
      </div>

      {/* Calendar view */}
      {view === "calendar" && (
        <CalendarView
          posts={posts.filter(p => status === "all" || p.status === status)}
          onDayClick={handleDayClick}
          selectedDate={selectedCalDate}
        />
      )}

      {/* List view */}
      {view === "list" && (
        <>
          {filtered.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
              <p className="text-sm text-gray-400">Ничего не найдено</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(post => {
                const cfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.pending;
                return (
                  <div
                    key={post.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                        <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 text-sm truncate">{post.topic}</h3>
                            {post.additionalRequirements && (
                              <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">{post.additionalRequirements}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-2.5">
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                            <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                            </svg>
                            {formatDateRu(post.scheduledAt)}
                          </span>

                          <span className="text-[11px] text-gray-400">{relativeTime(post.scheduledAt)}</span>

                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset ${cfg.color}`}>
                            {cfg.label}
                          </span>

                          {post.article && (
                            <Link href={`/blog/${post.article.slug}`} target="_blank" className="text-[11px] text-rose-500 hover:text-rose-600 font-medium transition-colors">
                              Открыть статью
                            </Link>
                          )}

                          {post.article && (
                            <Link href={`/admin/blog/${post.article.id}/edit`} className="text-[11px] text-gray-400 hover:text-gray-600 font-medium transition-colors">
                              Редактировать
                            </Link>
                          )}
                        </div>

                        {post.error && (
                          <div className="mt-2.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                            {post.error.slice(0, 300)}
                          </div>
                        )}

                        {editingId === post.id && (
                          <EditPostInline
                            post={post}
                            onSave={handleEdit}
                            onCancel={() => setEditingId(null)}
                            saving={saving}
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {post.status === "pending" && (
                          <button
                            onClick={() => setEditingId(editingId === post.id ? null : post.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Редактировать"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        )}
                        {post.status === "failed" && (
                          <button
                            onClick={() => {
                              fetch(`/api/admin/blog/schedule/process?forceId=${post.id}`, { method: "POST" })
                                .then(r => r.ok && window.location.reload());
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Повторить"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(post.id)}
                          disabled={deleting === post.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Удалить"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Footer stats */}
      <div className="mt-4 text-center text-xs text-gray-400">
        {view === "list" ? `Показано ${filtered.length} из ${posts.length}` : ""}
      </div>
    </div>
  );
}
