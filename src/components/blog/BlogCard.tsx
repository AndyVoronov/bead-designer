import Image from "next/image";
import Link from "next/link";
import { Eye, Clock, Pin } from "lucide-react";

export interface BlogPostListItem {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  heroImage: string | null;
  publishedAt: string | null;
  readTime: number;
  views: number;
  isPinned: boolean;
  category: { id: number; name: string; slug: string } | null;
  tags: string[];
}

interface BlogCardProps {
  post: BlogPostListItem;
}

const MONTHS_RU = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()]} ${d.getFullYear()}`;
}

export function BlogCard({ post }: BlogCardProps) {
  const imageUrl = post.heroImage ? `/api${post.heroImage}` : null;

  return (
    <article className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:border-rose-100 transition-all duration-300">
      {/* Hero image */}
      <Link
        href={`/blog/${post.slug}`}
        className="relative aspect-video w-full overflow-hidden bg-gray-100"
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={post.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50">
            <span className="text-4xl">📝</span>
          </div>
        )}

        {/* Pinned badge */}
        {post.isPinned && (
          <span className="absolute top-3 right-3 flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
            <Pin size={10} />
            Закреплено
          </span>
        )}

        {/* Category pill overlay */}
        {post.category && (
          <span className="absolute bottom-3 left-3 bg-rose-500 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-sm">
            {post.category.name}
          </span>
        )}
      </Link>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4">
        <Link href={`/blog/${post.slug}`} className="group-hover:text-rose-600 transition-colors">
          <h2 className="font-semibold text-gray-900 line-clamp-2 leading-snug">
            {post.title}
          </h2>
        </Link>

        {post.excerpt && (
          <p className="mt-2 text-sm text-gray-500 line-clamp-3 leading-relaxed">
            {post.excerpt}
          </p>
        )}

        {/* Meta footer */}
        <div className="mt-auto pt-3 flex items-center gap-3 text-xs text-gray-400">
          <span>{formatDate(post.publishedAt)}</span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {post.readTime} мин
          </span>
          <span className="flex items-center gap-1">
            <Eye size={12} />
            {post.views}
          </span>
        </div>
      </div>
    </article>
  );
}
