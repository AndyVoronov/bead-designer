"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Heart,
  ArrowLeft,
  Droplets,
  Sun,
  Wind,
  ShieldCheck,
  RefreshCw,
  Eye,
  Package,
  Gem,
  AlertTriangle,
  Sparkles,
  Star,
} from "lucide-react";

/* ── Icon map ──────────────────────────────────────────── */

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Droplets,
  Sun,
  Wind,
  Eye,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Package,
  Heart,
  Sparkles,
  Gem,
  Star,
};

/* ── Types ─────────────────────────────────────────────── */

interface CareGuideItem {
  icon: string;
  text: string;
}

interface CareGuide {
  id: number;
  categoryId: number;
  title: string;
  subtitle: string | null;
  warning: string | null;
  items: CareGuideItem[];
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

const COLOR_MAP: Record<string, { bg: string; activeBg: string; text: string; activeText: string; border: string }> = {
  rose: { bg: "bg-rose-50", activeBg: "bg-rose-500", text: "text-rose-600", activeText: "text-white", border: "border-rose-500" },
  amber: { bg: "bg-amber-50", activeBg: "bg-amber-500", text: "text-amber-600", activeText: "text-white", border: "border-amber-500" },
  pink: { bg: "bg-pink-50", activeBg: "bg-pink-500", text: "text-pink-600", activeText: "text-white", border: "border-pink-500" },
  purple: { bg: "bg-purple-50", activeBg: "bg-purple-500", text: "text-purple-600", activeText: "text-white", border: "border-purple-500" },
  sky: { bg: "bg-sky-50", activeBg: "bg-sky-500", text: "text-sky-600", activeText: "text-white", border: "border-sky-500" },
  emerald: { bg: "bg-emerald-50", activeBg: "bg-emerald-500", text: "text-emerald-600", activeText: "text-white", border: "border-emerald-500" },
  violet: { bg: "bg-violet-50", activeBg: "bg-violet-500", text: "text-violet-600", activeText: "text-white", border: "border-violet-500" },
};

const CATEGORY_COLORS: Record<string, string> = {
  derzhateli: "rose",
  braslety: "amber",
  "vyazanye-igrushki": "pink",
  "vyazannaya-pogremushka": "purple",
  podveski: "sky",
  nabory: "emerald",
  aksessuary: "violet",
};

/* ── Component ─────────────────────────────────────────── */

function CarePageContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "";

  const [categories, setCategories] = useState<Category[]>([]);
  const [guides, setGuides] = useState<CareGuide[]>([]);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/care-guides")
      .then((r) => r.json())
      .then((data) => {
        setCategories(data.categories);
        setGuides(data.guides);
        // Set initial tab to first category with a guide, or first category
        if (!activeTab) {
          const firstWithGuide = data.guides[0];
          if (firstWithGuide) {
            const cat = data.categories.find((c: Category) => c.id === firstWithGuide.categoryId);
            if (cat) setActiveTab(cat.slug);
          } else if (data.categories[0]) {
            setActiveTab(data.categories[0].slug);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Only show tabs for categories that have guides
  const tabsWithGuides = guides
    .map((g) => {
      const cat = categories.find((c) => c.id === g.categoryId);
      return cat ? { ...cat, guide: g } : null;
    })
    .filter(Boolean) as (Category & { guide: CareGuide })[];

  const activeGuide = guides.find((g) => {
    const cat = categories.find((c) => c.id === g.categoryId);
    return cat?.slug === activeTab;
  });
  const activeCat = tabsWithGuides.find((t) => t.slug === activeTab);
  const colorName = activeCat?.slug ? (CATEGORY_COLORS[activeCat.slug] || "rose") : "rose";
  const colors = COLOR_MAP[colorName];

  if (loading) {
    return (
      <div className="home-page-root min-h-screen bg-[#FFF8F5] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="home-page-root min-h-screen bg-[#FFF8F5]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold text-gray-800">Уход за изделиями</h1>
          </div>
        </div>
      </header>

      {/* Tab navigation - only categories with guides */}
      {tabsWithGuides.length > 1 && (
        <div className="sticky top-14 z-20 bg-[#FFF8F5]/90 backdrop-blur-lg border-b border-gray-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {tabsWithGuides.map((tab) => {
                const isActive = activeTab === tab.slug;
                const tabColorName = CATEGORY_COLORS[tab.slug] || "rose";
                const tabColors = COLOR_MAP[tabColorName];
                return (
                  <button
                    key={tab.slug}
                    onClick={() => setActiveTab(tab.slug)}
                    className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                      isActive
                        ? `${tabColors.activeBg} ${tabColors.activeText} shadow-sm`
                        : `${tabColors.bg} ${tabColors.text} hover:opacity-80`
                    }`}
                  >
                    {tab.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-16">
        {activeGuide && activeCat ? (
          <>
            {/* Category header */}
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-14 h-14 rounded-2xl ${colors.bg} flex items-center justify-center shrink-0`}>
                <ShieldCheck className={`w-7 h-7 ${colors.text}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">{activeGuide.title}</h2>
                {activeGuide.subtitle && (
                  <p className="text-sm text-gray-500">{activeGuide.subtitle}</p>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-3 mb-6">
              {activeGuide.items.map((item, idx) => {
                const IconComp = ICON_MAP[item.icon];
                return (
                  <div
                    key={idx}
                    className="flex gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:shadow-sm transition-shadow"
                  >
                    <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      {IconComp ? (
                        <IconComp className={`w-4 h-4 ${colors.text}`} />
                      ) : (
                        <Package className={`w-4 h-4 ${colors.text}`} />
                      )}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{item.text}</p>
                  </div>
                );
              })}
            </div>

            {/* Warning */}
            {activeGuide.warning && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 leading-relaxed">{activeGuide.warning}</p>
              </div>
            )}

            {/* Back */}
            <div className="mt-8 text-center">
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center gap-2 text-sm font-medium text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
              >
                <ArrowLeft size={16} />
                Вернуться назад
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">Инструкция для этой категории пока не добавлена</p>
            <p className="text-gray-400 text-sm mt-2">Выберите другую категорию или зайдите позже</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CarePage() {
  return (
    <Suspense
      fallback={
        <div className="home-page-root min-h-screen bg-[#FFF8F5] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
        </div>
      }
    >
      <CarePageContent />
    </Suspense>
  );
}
