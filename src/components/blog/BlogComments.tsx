"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageCircle, Reply, Send, User as UserIcon } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

interface CommentAuthor {
  id: number;
  name: string | null;
  avatar: string | null;
}

interface CommentReply {
  id: number;
  text: string;
  authorName: string;
  authorEmail: string | null;
  createdAt: string;
  user: CommentAuthor | null;
}

interface Comment {
  id: number;
  text: string;
  authorName: string;
  authorEmail: string | null;
  createdAt: string;
  user: CommentAuthor | null;
  replies: CommentReply[];
}

interface BlogCommentsProps {
  postId: number;
}

const MONTHS_RU = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function formatCommentDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "только что";
  if (diffMin < 60) return `${diffMin} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;
  if (diffDays < 7) return `${diffDays} д назад`;

  return `${d.getDate()} ${MONTHS_RU[d.getMonth()]} ${d.getFullYear()}`;
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const initial = (name || "А").charAt(0).toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        referrerPolicy="no-referrer"
        className="w-8 h-8 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
      {initial}
    </div>
  );
}

function CommentItem({
  comment,
  onReply,
}: {
  comment: Comment | CommentReply;
  onReply: (commentId: number) => void;
}) {
  return (
    <div className="flex gap-3">
      <Avatar
        name={comment.user?.name || comment.authorName}
        avatarUrl={comment.user?.avatar}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">
            {comment.user?.name || comment.authorName}
          </span>
          <span className="text-xs text-gray-400">
            {formatCommentDate(comment.createdAt)}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {comment.text}
        </p>
        <button
          onClick={() => onReply(comment.id)}
          className="mt-1.5 flex items-center gap-1 text-xs text-gray-400 hover:text-rose-500 transition-colors cursor-pointer"
        >
          <Reply size={12} />
          Ответить
        </button>
      </div>
    </div>
  );
}

export function BlogComments({ postId }: BlogCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  // Form state
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [commentText, setCommentText] = useState("");

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/blog/comments?postId=${postId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      } else {
        toast.error("Не удалось загрузить комментарии");
      }
    } catch {
      toast.error("Ошибка загрузки комментариев");
    } finally {
      setLoading(false);
    }
  }, [postId, toast]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/auth/session", { signal: abort.signal })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        if (data.user?.name) setUserName(data.user.name);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          // Silently fail
        }
      });
    return () => abort.abort();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || text.length < 1 || text.length > 2000) {
      toast.error("Текст комментария должен быть от 1 до 2000 символов");
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        postId,
        text,
      };
      if (replyTo) body.parentId = replyTo;
      if (!userName) {
        if (!guestName.trim()) {
          toast.error("Укажите ваше имя");
          setSubmitting(false);
          return;
        }
        body.authorName = guestName.trim();
        if (guestEmail.trim()) body.authorEmail = guestEmail.trim();
      }

      const res = await fetch("/api/blog/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        if (!userName) {
          toast.success("Комментарий отправлен и появится после модерации");
        } else {
          toast.success("Комментарий опубликован");
        }
        setCommentText("");
        setReplyTo(null);
        fetchComments();
      } else {
        const data = await res.json().catch(() => ({ error: "Ошибка" }));
        toast.error(data.error || "Не удалось отправить комментарий");
      }
    } catch {
      toast.error("Ошибка при отправке комментария");
    } finally {
      setSubmitting(false);
    }
  }

  const totalComments = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length || 0),
    0
  );

  return (
    <section id="comments" className="mt-12 pt-8 border-t border-gray-100">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <MessageCircle size={22} className="text-rose-500" />
        Комментарии
        {!loading && totalComments > 0 && (
          <span className="text-sm font-normal text-gray-400">
            ({totalComments})
          </span>
        )}
      </h2>

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="mt-6 bg-gray-50 rounded-xl p-4">
        {/* Guest name field */}
        {!userName && (
          <div className="flex flex-col sm:flex-row gap-3 mb-3">
            <input
              type="text"
              placeholder="Ваше имя *"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              maxLength={100}
              required
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 transition-colors"
            />
            <input
              type="email"
              placeholder="Email (необязательно)"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              maxLength={200}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 transition-colors"
            />
          </div>
        )}

        {/* Reply indicator */}
        {replyTo !== null && (
          <div className="mb-3 flex items-center gap-2 text-xs text-rose-500">
            <Reply size={14} />
            <span>Ответ на комментарий</span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="text-gray-400 hover:text-gray-600 underline cursor-pointer"
            >
              Отмена
            </button>
          </div>
        )}

        <div className="flex gap-3">
          {userName ? (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
              {userName.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 shrink-0 mt-0.5">
              <UserIcon size={14} />
            </div>
          )}
          <div className="flex-1">
            <textarea
              placeholder={userName ? "Написать комментарий..." : "Оставить комментарий..."}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={2000}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white resize-none focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 transition-colors"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {commentText.length}/2000
              </span>
              <button
                type="submit"
                disabled={submitting || !commentText.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
              >
                <Send size={14} />
                {submitting ? "Отправка..." : "Отправить"}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Comments list */}
      {loading ? (
        <div className="mt-6 space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32" />
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="mt-6 text-sm text-gray-400 text-center py-8">
          Пока нет комментариев. Будьте первым!
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {comments.map((comment) => (
            <div key={comment.id}>
              <CommentItem comment={comment} onReply={setReplyTo} />

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-4 ml-8 space-y-4 pl-4 border-l-2 border-gray-100">
                  {comment.replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      onReply={setReplyTo}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
