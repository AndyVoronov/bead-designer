import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ScheduledClient from "./ScheduledClient";

export const dynamic = "force-dynamic";

async function getScheduledPosts() {
  return prisma.scheduledPost.findMany({
    orderBy: { scheduledAt: "desc" },
    include: {
      article: {
        select: { id: true, title: true, slug: true, status: true },
      },
    },
  });
}

export default async function ScheduledPostsPage() {
  const posts = await getScheduledPosts();

  const counts = {
    all: posts.length,
    pending: posts.filter(p => p.status === "pending").length,
    processing: posts.filter(p => p.status === "processing").length,
    completed: posts.filter(p => p.status === "completed").length,
    failed: posts.filter(p => p.status === "failed").length,
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Расписание публикаций</h1>
              <p className="text-sm text-gray-400">Управление генерацией статей</p>
            </div>
          </div>
          <Link
            href="/admin/blog/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Новая статья
          </Link>
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
          <p className="text-gray-400 text-sm mb-6">Запланируйте генерацию статей</p>
          <Link href="/admin/blog/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 transition-colors">
            Запланировать
          </Link>
        </div>
      ) : (
        <ScheduledClient posts={JSON.parse(JSON.stringify(posts))} counts={counts} />
      )}
    </div>
  );
}
