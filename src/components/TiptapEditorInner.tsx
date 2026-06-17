"use client";

import { useEffect, useImperativeHandle, forwardRef, useRef, useState, useCallback } from "react";
import type { Editor } from "@tiptap/react";

// We use a callback pattern to avoid SSR issues with tiptap
// The editor is created entirely on the client side after mount

interface TiptapEditorInnerProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

interface EditorAPI {
  getEditor: () => Promise<Editor | null>;
  setBold: () => void;
  setItalic: () => void;
  setUnderline: () => void;
  setStrike: () => void;
  setHeading: (level: number) => void;
  setParagraph: () => void;
  toggleBulletList: () => void;
  toggleOrderedList: () => void;
  setTextAlign: (align: string) => void;
  setColor: (color: string) => void;
  toggleHighlight: () => void;
  setLink: () => void;
  addImage: () => void;
  insertTable: () => void;
  toggleBlockquote: () => void;
  setHorizontalRule: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  isActive: (name: string, attrs?: Record<string, unknown>) => boolean;
}

export type { EditorAPI };

export default function TiptapEditorInner({
  content,
  onChange,
  placeholder = "Начните писать...",
  className = "",
}: TiptapEditorInnerProps) {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const onChangeRef = useRef(onChange);
  const [ready, setReady] = useState(false);

  onChangeRef.current = onChange;

  useEffect(() => {
    let destroyed = false;

    async function initEditor() {
      const { useEditor, EditorContent } = await import("@tiptap/react");
      const StarterKit = (await import("@tiptap/starter-kit")).default;
      const Underline = (await import("@tiptap/extension-underline")).default;
      const TextAlign = (await import("@tiptap/extension-text-align")).default;
      const Placeholder = (await import("@tiptap/extension-placeholder")).default;
      const Highlight = (await import("@tiptap/extension-highlight")).default;
      const Link = (await import("@tiptap/extension-link")).default;
      const Table = (await import("@tiptap/extension-table")).Table;
      const TableRow = (await import("@tiptap/extension-table-row")).TableRow;
      const TableCell = (await import("@tiptap/extension-table-cell")).TableCell;
      const TableHeader = (await import("@tiptap/extension-table-header")).TableHeader;
      const ImageExt = (await import("@tiptap/extension-image")).default;
      const Color = (await import("@tiptap/extension-color")).Color;
      const TextStyle = (await import("@tiptap/extension-text-style")).TextStyle;

      // React hooks cannot be called conditionally, so we use a simple
      // standalone editor instance
      const { Editor } = await import("@tiptap/core");

      if (destroyed || !editorContainerRef.current) return;

      const editor = new Editor({
        element: editorContainerRef.current,
        extensions: [
          StarterKit.configure({
            heading: { levels: [2, 3, 4] },
          }),
          Underline,
          TextAlign.configure({
            types: ["heading", "paragraph"],
          }),
          Placeholder.configure({
            placeholder,
          }),
          Highlight.configure({
            multicolor: true,
          }),
          Link.configure({
            openOnClick: false,
            HTMLAttributes: {
              class: "text-rose-500 underline",
            },
          }),
          Table.configure({ resizable: true }),
          TableRow,
          TableCell,
          TableHeader,
          ImageExt.configure({
            HTMLAttributes: {
              class: "max-w-full h-auto rounded-lg",
            },
          }),
          TextStyle,
          Color,
        ],
        content,
        onUpdate: ({ editor }) => {
          onChangeRef.current(editor.getHTML());
        },
        editorProps: {
          attributes: {
            class:
              "prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[200px] px-4 py-3 text-gray-800",
          },
        },
      });

      editorRef.current = editor;
      if (!destroyed) setReady(true);
    }

    initEditor();

    return () => {
      destroyed = true;
      editorRef.current?.destroy();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external content changes
  useEffect(() => {
    if (editorRef.current && content !== editorRef.current.getHTML()) {
      editorRef.current.commands.setContent(content);
    }
  }, [content]);

  // Toolbar actions
  const cmd = useCallback((fn: (e: Editor) => void) => {
    if (editorRef.current) {
      fn(editorRef.current);
    }
  }, []);

  const addImage = () => {
    const url = window.prompt("URL изображения:");
    if (url && editorRef.current) {
      editorRef.current.chain().focus().setImage({ src: url }).run();
    }
  };

  const setLink = () => {
    const e = editorRef.current;
    if (!e) return;
    const prev = e.getAttributes("link").href as string;
    const url = window.prompt("URL ссылки:", prev);
    if (url === null) return;
    if (url === "") {
      e.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      e.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    editorRef.current?.isActive(name, attrs as never) ?? false;

  const btnClass = "p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed";
  const btnActive = "p-1.5 rounded-lg text-rose-600 bg-rose-50 transition-colors";

  return (
    <div className={`border border-gray-200 rounded-xl overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50/80">
        <select
          onChange={(e) => {
            const v = e.target.value;
            cmd(e => { if (v === "p") e.chain().focus().setParagraph().run(); else e.chain().focus().toggleHeading({ level: Number(v) as 2|3|4 }).run(); });
            e.target.value = "";
          }}
          value=""
          className="h-8 px-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-600 cursor-pointer focus:outline-none focus:border-rose-300"
        >
          <option value="" disabled>Абзац</option>
          <option value="2">Заголовок 2</option>
          <option value="3">Заголовок 3</option>
          <option value="4">Заголовок 4</option>
        </select>
        <div className="w-px h-5 bg-gray-200 mx-1" />

        <button onClick={() => cmd(e => e.chain().focus().toggleBold().run())} className={isActive("bold") ? btnActive : btnClass} title="Жирный" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /></svg>
        </button>
        <button onClick={() => cmd(e => e.chain().focus().toggleItalic().run())} className={isActive("italic") ? btnActive : btnClass} title="Курсив" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></svg>
        </button>
        <button onClick={() => cmd(e => e.chain().focus().toggleUnderline().run())} className={isActive("underline") ? btnActive : btnClass} title="Подчёркнутый" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" /><line x1="4" y1="21" x2="20" y2="21" /></svg>
        </button>
        <button onClick={() => cmd(e => e.chain().focus().toggleStrike().run())} className={isActive("strike") ? btnActive : btnClass} title="Зачёркнутый" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="4" x2="20" y2="20" /><line x1="4" y1="20" x2="20" y2="4" /></svg>
        </button>
        <button onClick={() => cmd(e => e.chain().focus().toggleHighlight().run())} className={isActive("highlight") ? btnActive : btnClass} title="Выделить" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
        </button>

        <div className="w-px h-5 bg-gray-200 mx-1" />
        <div className="relative">
          <input type="color" onChange={e => cmd(editor => editor.chain().focus().setColor(e.target.value).run())} className="absolute inset-0 opacity-0 cursor-pointer w-7 h-7" title="Цвет" />
          <button className={btnClass} title="Цвет текста" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><circle cx="12" cy="12" r="5" fill="currentColor" /></svg>
          </button>
        </div>

        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button onClick={() => cmd(e => e.chain().focus().setTextAlign("left").run())} className={isActive("textAlign", { textAlign: "left" }) ? btnActive : btnClass} title="По левому" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" /></svg>
        </button>
        <button onClick={() => cmd(e => e.chain().focus().setTextAlign("center").run())} className={isActive("textAlign", { textAlign: "center" }) ? btnActive : btnClass} title="По центру" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="10" x2="6" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="18" y1="18" x2="6" y2="18" /></svg>
        </button>
        <button onClick={() => cmd(e => e.chain().focus().setTextAlign("right").run())} className={isActive("textAlign", { textAlign: "right" }) ? btnActive : btnClass} title="По правому" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="10" x2="7" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="7" y2="18" /></svg>
        </button>

        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button onClick={() => cmd(e => e.chain().focus().toggleBulletList().run())} className={isActive("bulletList") ? btnActive : btnClass} title="Маркированный" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><circle cx="4" cy="6" r="1" fill="currentColor" /><circle cx="4" cy="12" r="1" fill="currentColor" /><circle cx="4" cy="18" r="1" fill="currentColor" /></svg>
        </button>
        <button onClick={() => cmd(e => e.chain().focus().toggleOrderedList().run())} className={isActive("orderedList") ? btnActive : btnClass} title="Нумерованный" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /></svg>
        </button>

        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button onClick={setLink} className={isActive("link") ? btnActive : btnClass} title="Ссылка" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
        </button>
        <button onClick={addImage} className={btnClass} title="Изображение" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
        </button>
        <button onClick={() => cmd(e => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())} className={btnClass} title="Таблица" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg>
        </button>
        <button onClick={() => cmd(e => e.chain().focus().toggleBlockquote().run())} className={isActive("blockquote") ? btnActive : btnClass} title="Цитата" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" /></svg>
        </button>
        <button onClick={() => cmd(e => e.chain().focus().setHorizontalRule().run())} className={btnClass} title="Разделитель" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12" /></svg>
        </button>

        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button onClick={() => cmd(e => e.chain().focus().undo().run())} className={btnClass} title="Отменить" type="button" disabled={!editorRef.current?.can().undo()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
        </button>
        <button onClick={() => cmd(e => e.chain().focus().redo().run())} className={btnClass} title="Повторить" type="button" disabled={!editorRef.current?.can().redo()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" /></svg>
        </button>
      </div>

      {/* Editor content area */}
      <div ref={editorContainerRef} className="min-h-[200px]" />
      {!ready && (
        <div className="p-4 space-y-2 absolute inset-0 pointer-events-none">
          <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
          <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
        </div>
      )}
    </div>
  );
}
