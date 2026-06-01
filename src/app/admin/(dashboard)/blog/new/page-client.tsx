"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Sparkles,
  ArrowLeft,
  Clock,
  CalendarPlus,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from "lucide-react";
import BlogEditor from "@/components/blog/BlogEditor";
import ArticleGenerator from "@/components/blog/ArticleGenerator";

type Mode = "choose" | "manual" | "generate";

interface ScheduledPostItem {
  id: number;
  topic: string;
  additionalRequirements: string | null;
  productIds: string | null;
  scheduledAt: string;
  status: "pending" | "processing" | "completed" | "failed";
  articleId: number | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  article: { id: number; title: string; slug: string } | null;
}

// ── Helper: format date in Moscow timezone ──
const MOSCOW_TZ = "Europe/Moscow";

function formatMoscowDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("ru-RU", {
    timeZone: MOSCOW_TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoscowNow(): string {
  const now = new Date();
  const day = now.toLocaleDateString("ru-RU", {
    timeZone: MOSCOW_TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = now.toLocaleTimeString("ru-RU", {
    timeZone: MOSCOW_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Москва, ${day}, ${time}`;
}

function getMoscowNowISO(): string {
  const now = new Date();
  // Get Moscow time as local components
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: MOSCOW_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return formatter.format(now);
}

export default function NewBlogPost() {
  const [mode, setMode] = useState<Mode>("choose");
  const router = useRouter();

  // ── Schedule mode state ──
  const [publishMode, setPublishMode] = useState<"now" | "scheduled">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPostItem[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // ── Current time ──
  const [currentTime, setCurrentTime] = useState(formatMoscowNow());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(formatMoscowNow());
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  // ── Load scheduled posts on mount ──
  const loadScheduledPosts = useCallback(async () => {
    setScheduleLoading(true);
    try {
      const res = await fetch("/api/admin/blog/schedule");
      if (res.ok) {
        const data: ScheduledPostItem[] = await res.json();
        setScheduledPosts(data);
      }
    } catch {
      // silently ignore
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScheduledPosts();
  }, [loadScheduledPosts]);

  // ── Auto-refresh processing posts every 10s ──
  useEffect(() => {
    if (scheduledPosts.some((p) => p.status === "processing")) {
      const timer = setTimeout(loadScheduledPosts, 10_000);
      return () => clearTimeout(timer);
    }
  }, [scheduledPosts, loadScheduledPosts]);

  // Generate mode: on success, redirect to published article
  const handleGenerated = (data: {
    slug?: string;
    saved?: boolean;
    title?: string;
    content?: string;
    excerpt?: string;
    tags?: string[];
    readTime?: number;
    id?: number;
  }) => {
    if (data.saved && data.slug) {
      router.push(`/blog/${data.slug}`);
    }
  };

  // ── Handle schedule submit ──
  const handleSchedule = async () => {
    // topic, requirements, productIds come from ArticleGenerator props — but we're in page-client
    // So we use the same form fields directly here
  };

  // ── Cancel scheduled post ──
  const handleCancel = async (id: number) => {
    try {
      const res = await fetch("/api/admin/blog/schedule", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setScheduledPosts((prev) => prev.filter((p) => p.id !== id));
      }
    } catch {
      // silently ignore
    }
  };

  // ── Status badge ──
  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      processing: "bg-blue-100 text-blue-800 border-blue-200 animate-pulse",
      completed: "bg-green-100 text-green-800 border-green-200",
      failed: "bg-red-100 text-red-800 border-red-200",
    };
    const labels: Record<string, string> = {
      pending: "Ожидает",
      processing: "Генерация...",
      completed: "Готово",
      failed: "Ошибка",
    };
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${styles[status] || styles.pending}`}
      >
        {status === "processing" && (
          <Loader2 className="w-3 h-3 animate-spin" />
        )}
        {labels[status] || status}
      </span>
    );
  };

  // Current time display
  const currentTimeBlock = (
    <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
      <Clock className="w-4 h-4" />
      <span>{currentTime}</span>
    </div>
  );

  if (mode === "choose") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Новая статья
        </h1>
        <p className="text-gray-500 mb-2">
          Как вы хотите создать статью?
        </p>

        {currentTimeBlock}

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Manual */}
          <button
            onClick={() => setMode("manual")}
            className="group relative flex flex-col items-start gap-4 rounded-2xl border-2 border-gray-200 bg-white p-6 text-left transition-all hover:border-rose-300 hover:shadow-lg hover:shadow-rose-100/50 cursor-pointer"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-500 transition-colors group-hover:bg-rose-500 group-hover:text-white">
              <Pencil className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Создать вручную
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Откроется редактор с Tiptap — заголовок, контент, теги, SEO, изображения. Полный контроль над статьёй.
              </p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-rose-500 transition-colors group-hover:text-rose-600">
              Открыть редактор →
            </span>
          </button>

          {/* Auto-generate */}
          <button
            onClick={() => setMode("generate")}
            className="group relative flex flex-col items-start gap-4 rounded-2xl border-2 border-gray-200 bg-white p-6 text-left transition-all hover:border-purple-300 hover:shadow-lg hover:shadow-purple-100/50 cursor-pointer"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-500 transition-colors group-hover:bg-purple-500 group-hover:text-white">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Сгенерировать автоматически
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                AI создаст красивую статью с анимациями, таймлайном, статистикой и советами. Можно опубликовать сейчас или запланировать.
              </p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-purple-500 transition-colors group-hover:text-purple-600">
              Сгенерировать →
            </span>
          </button>
        </div>

        {/* ── Schedule block ── */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-purple-500" />
              Расписание публикаций
            </h2>
            <button
              onClick={loadScheduledPosts}
              disabled={scheduleLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer border-none disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scheduleLoading ? "animate-spin" : ""}`} />
              Обновить
            </button>
          </div>

          {scheduledPosts.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
              <CalendarPlus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Нет запланированных публикаций</p>
            </div>
          ) : (
            <div className="space-y-2">
              {scheduledPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-xl"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {post.topic}
                      </span>
                      <StatusBadge status={post.status} />
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatMoscowDate(post.scheduledAt)}
                    </div>

                    {/* Error message */}
                    {post.status === "failed" && post.error && (
                      <div className="mt-1.5 flex items-start gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg p-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{post.error}</span>
                      </div>
                    )}

                    {/* Article link for completed */}
                    {post.status === "completed" && post.article && (
                      <a
                        href={`/blog/${post.article.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700"
                      >
                        {post.article.title}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {/* Actions */}
                  {post.status === "pending" && (
                    <button
                      onClick={() => handleCancel(post.id)}
                      className="shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border-none"
                      title="Отменить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Back button for both modes
  const backButton = (
    <button
      onClick={() => setMode("choose")}
      className="mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer border-none"
    >
      <ArrowLeft className="w-4 h-4" />
      Назад к выбору
    </button>
  );

  if (mode === "manual") {
    return (
      <>
        {backButton}
        <BlogEditor />
      </>
    );
  }

  // mode === "generate"
  return (
    <>
      {backButton}
      {currentTimeBlock}

      {/* Publish mode toggle */}
      <div className="max-w-lg mx-auto mb-6">
        <div className="flex rounded-xl border border-gray-200 bg-gray-100 p-1">
          <button
            onClick={() => setPublishMode("now")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer border-none ${
              publishMode === "now"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Опубликовать сейчас
          </button>
          <button
            onClick={() => setPublishMode("scheduled")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer border-none ${
              publishMode === "scheduled"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Запланировать
            </span>
          </button>
        </div>

        {publishMode === "scheduled" && (
          <div className="mt-3">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Дата и время публикации (Москва, UTC+3)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={getMoscowNowISO()}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        )}
      </div>

      <ArticleGenerator
        onGenerated={handleGenerated}
        publishMode={publishMode}
        scheduledAt={scheduledAt}
        onScheduled={async (topic, scheduledDate) => {
          // Placeholder — actual scheduling is handled inside ArticleGenerator
        }}
        onScheduleCreated={() => {
          loadScheduledPosts();
        }}
      />
    </>
  );
}
