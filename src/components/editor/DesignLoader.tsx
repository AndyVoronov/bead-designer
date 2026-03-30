"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { decodeDesign } from "@/lib/serialization";
import { useDesignStore } from "@/stores/useDesignStore";
import EditorCanvas from "./EditorCanvas";

interface DesignLoaderProps {
  code: string;
}

/**
 * Client boundary for the /design/[code] share page.
 *
 * Decodes a URL-safe design code on mount, loads beads into the store,
 * then renders the EditorCanvas. Shows a spinner while decoding and an
 * error state with a link home if the code is invalid.
 */
export default function DesignLoader({ code }: DesignLoaderProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading"
  );

  useEffect(() => {
    const design = decodeDesign(code);
    if (design) {
      useDesignStore.getState().loadFromCatalogIds(design.b);
      setStatus("loaded");
    } else {
      setStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 select-none">
            Загрузка дизайна…
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#e11d48"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-700">
            Неверная ссылка
          </p>
          <p className="text-sm text-gray-400 max-w-xs">
            Этот дизайн не найдён или ссылка повреждена.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Вернуться на главную
          </Link>
        </div>
      </div>
    );
  }

  return <EditorCanvas />;
}
