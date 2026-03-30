"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import TemplateCard from "./TemplateCard";

interface Template {
  id: string;
  name: string;
  designCode: string;
  beadCount: number;
  isApproved: boolean;
  isUserSubmitted: boolean;
  createdAt: string;
}

/**
 * Horizontal-scrolling template gallery.
 *
 * Fetches approved templates from the API on mount and renders them as
 * horizontally scrollable cards. Includes a "Начать с нуля" card that
 * links to the blank editor, plus loading and error states.
 */
export default function TemplateBrowser() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/templates");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: Template[] = await res.json();
      setTemplates(data);
    } catch (err) {
      console.error("Failed to fetch templates:", err);
      setError("Не удалось загрузить шаблоны");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return (
    <section>
      <h2 className="text-lg font-bold text-gray-800 px-4 mb-3">Шаблоны</h2>

      {/* Loading state — skeleton cards */}
      {loading && (
        <div className="flex gap-4 overflow-x-auto px-4 pb-4" aria-label="Загрузка шаблонов">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-40 animate-pulse"
            >
              <div className="bg-gray-100 rounded-xl h-[120px] flex flex-col gap-3 p-4">
                <div className="flex gap-1.5 flex-wrap">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <span
                      key={j}
                      className="block w-2 h-2 rounded-full bg-gray-200"
                    />
                  ))}
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="h-4 bg-gray-200 rounded w-24" />
                  <div className="h-3 bg-gray-200 rounded w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-red-500 mb-3">{error}</p>
          <button
            type="button"
            onClick={fetchTemplates}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      )}

      {/* Template cards + "Начать с нуля" */}
      {!loading && !error && (
        <div className="flex gap-4 overflow-x-auto px-4 pb-4 snap-x scrollbar-hide">
          {/* "Начать с нуля" card */}
          <Link
            href="/editor"
            className="flex-shrink-0 w-40 snap-start"
          >
            <div className="bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-300 hover:border-gray-400 transition-all p-4 active:scale-95 min-h-[120px] flex flex-col items-center justify-center gap-2">
              <span className="text-2xl text-gray-400 leading-none select-none">+</span>
              <span className="text-xs font-medium text-gray-500 text-center leading-tight">
                Начать<br />с нуля
              </span>
            </div>
          </Link>

          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              name={t.name}
              designCode={t.designCode}
              beadCount={t.beadCount}
            />
          ))}
        </div>
      )}
    </section>
  );
}
