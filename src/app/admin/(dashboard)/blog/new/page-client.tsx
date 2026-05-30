"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Sparkles, ArrowLeft } from "lucide-react";
import BlogEditor from "@/components/blog/BlogEditor";
import ArticleGenerator from "@/components/blog/ArticleGenerator";

type Mode = "choose" | "manual" | "generate";

export default function NewBlogPost() {
  const [mode, setMode] = useState<Mode>("choose");
  const router = useRouter();

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
      // Redirect to the public blog page (not admin)
      router.push(`/blog/${data.slug}`);
    }
  };

  if (mode === "choose") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Новая статья
        </h1>
        <p className="text-gray-500 mb-10">
          Как вы хотите создать статью?
        </p>

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
                AI создаст красивую статью с анимациями, таймлайном, статистикой и советами. Автоматически опубликует.
              </p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-purple-500 transition-colors group-hover:text-purple-600">
              Сгенерировать →
            </span>
          </button>
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
      <ArticleGenerator onGenerated={handleGenerated} />
    </>
  );
}
