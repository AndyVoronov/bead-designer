"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import {
  Plus,
  Search,
  Pencil,
  Eye,
  Trash2,
  Pin,
  PinOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  excerpt: string | null;
  heroImage: string | null;
  isPinned: boolean;
  viewCount: number;
  createdAt: string;
  publishedAt: string | null;
  category?: { id: number; name: string; slug: string } | null;
}

type StatusFilter = "all" | "draft" | "published" | "archived";

const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  published: "Опубликовано",
  archived: "Архив",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  published: "bg-emerald-50 text-emerald-700",
  archived: "bg-amber-50 text-amber-700",
};

const LIMIT = 20;

export default function AdminBlogPage() {
  const router = useRouter();
  const toast = useToast();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingPin, setTogglingPin] = useState<number | null>(null);

  /* ── Debounce search ── */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  /* ── Fetch ── */
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      if (status !== "all") params.set("status", status);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/admin/blog?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPosts(data.posts ?? data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Не удалось загрузить статьи");
    } finally {
      setLoading(false);
    }
  }, [page, status, debouncedSearch, toast]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  /* ── Reset page on filter change ── */
  useEffect(() => {
    setPage(1);
  }, [status, debouncedSearch]);

  /* ── Delete ── */
  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Удалить статью «${title}»? Это действие нельзя отменить.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Статья удалена");
      fetchPosts();
    } catch {
      toast.error("Не удалось удалить статью");
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Toggle pin ── */
  const handleTogglePin = async (id: number) => {
    setTogglingPin(id);
    try {
      const post = posts.find((p) => p.id === id);
      if (!post) return;
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !post.isPinned }),
      });
      if (!res.ok) throw new Error();
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isPinned: !p.isPinned } : p))
      );
      toast.success(post.isPinned ? "Закреп снят" : "Статья закреплена");
    } catch {
      toast.error("Не удалось изменить закреп");
    } finally {
      setTogglingPin(null);
    }
  };

  /* ── Pagination ── */
  const totalPages = Math.ceil(total / LIMIT);
  const startIdx = (page - 1) * LIMIT + 1;
  const endIdx = Math.min(page * LIMIT, total);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Блог</h1>
        <Link
          href="/admin/blog/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500 text-white text-sm font-medium rounded-lg hover:bg-rose-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Новая статья
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        {/* Status tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {([
            { key: "all", label: "Все" },
            { key: "draft", label: "Черновики" },
            { key: "published", label: "Опубликовано" },
            { key: "archived", label: "Архив" },
          ] as { key: StatusFilter; label: string }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatus(tab.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer border-none ${
                status === tab.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 bg-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по заголовку..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Заголовок</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Рубрика</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Статус</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Дата</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Просмотры</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Закреп</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    {search || status !== "all"
                      ? "Ничего не найдено"
                      : "Нет статей. Создайте первую."}
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr
                    key={post.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 line-clamp-1 max-w-xs block">
                        {post.title || "Без заголовка"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {post.category?.name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[post.status] ?? ""}`}
                      >
                        {STATUS_LABELS[post.status] ?? post.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(
                        post.publishedAt ?? post.createdAt ?? Date.now()
                      ).toLocaleDateString("ru-RU")}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {(post.viewCount ?? 0).toLocaleString("ru-RU")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleTogglePin(post.id)}
                        disabled={togglingPin === post.id}
                        className={`inline-flex p-1.5 rounded-lg transition-colors cursor-pointer border-none bg-transparent ${
                          post.isPinned
                            ? "text-rose-500 hover:bg-rose-50"
                            : "text-gray-300 hover:text-gray-500 hover:bg-gray-100"
                        } disabled:opacity-50`}
                        title={post.isPinned ? "Открепить" : "Закрепить"}
                      >
                        {post.isPinned ? (
                          <Pin className="w-4 h-4" />
                        ) : (
                          <PinOff className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => router.push(`/admin/blog/${post.id}/edit`)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer border-none bg-transparent"
                          title="Редактировать"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <a
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Предпросмотр"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDelete(post.id, post.title)}
                          disabled={deletingId === post.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer border-none bg-transparent disabled:opacity-50"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && total > LIMIT && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-sm text-gray-500">
              Показано {startIdx}–{endIdx} из {total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-30 cursor-pointer border-none bg-transparent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  if (totalPages <= 7) return true;
                  if (p === 1 || p === totalPages) return true;
                  return Math.abs(p - page) <= 1;
                })
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                    acc.push("...");
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "..." ? (
                    <span key={`dots-${idx}`} className="px-2 text-gray-400">
                      ...
                    </span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setPage(item as number)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors cursor-pointer border-none ${
                        page === item
                          ? "bg-rose-500 text-white"
                          : "text-gray-600 hover:bg-gray-200 bg-transparent"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-30 cursor-pointer border-none bg-transparent"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
