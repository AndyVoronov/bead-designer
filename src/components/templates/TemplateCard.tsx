"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { decodeDesign } from "@/lib/serialization";
import { getCatalogBead } from "@/data/catalogBeads";

interface TemplateCardProps {
  id: string;
  name: string;
  designCode: string;
  beadCount: number;
  favoriteCount?: number;
}

const MAX_PREVIEW_DOTS = 8;
const FALLBACK_COLOR = "#D1D5DB";

export default function TemplateCard({
  id,
  name,
  designCode,
  beadCount,
  favoriteCount: initialCount = 0,
}: TemplateCardProps) {
  const design = decodeDesign(designCode);
  const beadIds = design?.b ?? [];

  const previewColors = beadIds.slice(0, MAX_PREVIEW_DOTS).map((bid) => {
    const bead = getCatalogBead(bid);
    return bead?.color ?? FALLBACK_COLOR;
  });

  const beadWord =
    beadCount % 10 === 1 && beadCount % 100 !== 11
      ? "бусина"
      : beadCount % 10 >= 2 && beadCount % 10 <= 4 && (beadCount % 100 < 12 || beadCount % 100 > 14)
        ? "бусины"
        : "бусин";

  // ── Favorite state (fetched from session) ──────────
  const [favorited, setFavorited] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  // Check if already favorited on mount
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((session) => {
        if (!session?.user?.id) return;
        fetch("/api/favorites")
          .then((r) => r.json())
          .then((favs: Array<{ templateId: string }>) => {
            if (favs.some((f) => f.templateId === id)) {
              setFavorited(true);
            }
          })
          .catch(() => {});
      })
      .catch(() => {});
  }, [id]);

  const toggleFavorite = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setLoading(true);
      try {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId: Number(id) }),
        });
        if (res.ok) {
          const data = await res.json();
          setFavorited(data.favorited);
          setCount((c) => (data.favorited ? c + 1 : Math.max(0, c - 1)));
        } else if (res.status === 401) {
          window.dispatchEvent(new CustomEvent("auth-required"));
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  return (
    <Link
      href={`/design/${designCode}`}
      className="group flex-shrink-0 w-40 snap-start"
    >
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 p-4 active:scale-95 min-h-[120px] flex flex-col gap-3 relative">
        {/* Favorite button */}
        <button
          onClick={toggleFavorite}
          disabled={loading}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full transition-colors cursor-pointer z-10 border-none bg-transparent hover:bg-gray-100 disabled:cursor-default"
          aria-label={favorited ? "Убрать из избранного" : "Добавить в избранное"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={favorited ? "#ef4444" : "none"}
            stroke={favorited ? "#ef4444" : "#9ca3af"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {/* Bead color preview dots */}
        <div className="flex items-center gap-1.5 flex-wrap min-h-[24px]">
          {previewColors.map((color, i) => (
            <span
              key={i}
              className="block w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
          ))}
        </div>

        {/* Template info */}
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-sm text-gray-800 leading-tight line-clamp-2 group-hover:text-gray-600 transition-colors">
            {name}
          </span>
          <span className="text-xs text-gray-400">
            {beadCount} {beadWord}
            {count > 0 && (
              <span className="ml-1.5 text-rose-400">♡ {count}</span>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
