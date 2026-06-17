"use client";

import dynamic from "next/dynamic";

const TiptapEditorInner = dynamic(() => import("./TiptapEditorInner"), {
  ssr: false,
  loading: () => (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-2 border-b border-gray-100 bg-gray-50/80">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="w-7 h-7 rounded bg-gray-200 animate-pulse" />
        ))}
      </div>
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
        <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
        <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
      </div>
    </div>
  ),
});

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export default function TiptapEditor(props: TiptapEditorProps) {
  return <TiptapEditorInner {...props} />;
}
