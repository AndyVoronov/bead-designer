import { prisma } from "@/lib/prisma";
import Link from "next/link";

async function getScheduledPosts() {
  return prisma.scheduledPost.findMany({
    orderBy: { scheduledAt: "asc" },
    include: {
      article: {
        select: { id: true, title: true, slug: true, status: true },
      },
    },
  });
}

const MONTHS_RU = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function formatDateRu(date: Date): string {
  return `${date.getDate()} ${MONTHS_RU[date.getMonth()]} ${date.getFullYear()}, ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает",
  processing: "В работе",
  completed: "Готово",
  failed: "Ошибка",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-blue-50 text-blue-700",
  processing: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
};

export default async function ScheduledPostsPage() {
  const posts = await getScheduledPosts();

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500">
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Расписание публикаций</h1>
            <p className="text-sm text-gray-400">
              Запланированные генерации статей ({posts.length})
            </p>
          </div>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-50 mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300">
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium mb-1">Нет запланированных публикаций</p>
          <p className="text-gray-400 text-sm mb-6">
            Запланируйте генерацию статей через API расписания
          </p>
          <Link
            href="/admin/blog"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 transition-colors"
          >
            К списку статей
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{post.topic}</h3>
                  {post.additionalRequirements && (
                    <p className="mt-1 text-sm text-gray-400 line-clamp-1">
                      {post.additionalRequirements}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                      ⏰ {formatDateRu(post.scheduledAt)}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[post.status] || "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[post.status] || post.status}
                    </span>
                    {post.article && (
                      <Link
                        href={`/blog/${post.article.slug}`}
                        className="text-rose-500 hover:text-rose-600 font-medium"
                      >
                        → Статья «{post.article.title}»
                      </Link>
                    )}
                  </div>
                  {post.error && (
                    <p className="mt-2 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
                      {post.error.slice(0, 200)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {post.article && (
                    <Link
                      href={`/admin/blog/${post.article.id}/edit`}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                      title="Редактировать статью"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
