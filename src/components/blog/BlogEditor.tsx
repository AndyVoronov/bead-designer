"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import YouTube from "@tiptap/extension-youtube";
import CharacterCount from "@tiptap/extension-character-count";
import { Node, mergeAttributes } from "@tiptap/core";
import { useToast } from "@/components/ui/ToastProvider";
import {
  Save,
  Send,
  Eye,
  Upload,
  X,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Link as LinkIcon,
  Video,
  Package,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  GripVertical,
  Clock,
} from "lucide-react";

/* ── Types ── */

interface BlogPostData {
  id?: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  heroImage: string | null;
  status: "draft" | "published" | "archived";
  publishedAt: string | null;
  isPinned: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  useHeroAsOg: boolean;
  readTime: number | null;
  categoryId: number | null;
  tags: string[];
  relatedProductIds: number[];
}

interface BlogCategory {
  id: number;
  name: string;
  slug: string;
}

/* ── Custom Product Embed Node ── */

const ProductEmbed = Node.create({
  name: "productEmbed",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      productId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-product-id"),
        renderHTML: (attrs) => ({ "data-product-id": attrs.productId }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-product-id]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-product-id": HTMLAttributes.productId,
        class: "product-embed",
      }),
    ];
  },
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("div");
      dom.className = "product-embed";
      dom.innerHTML = `
        <div style="display:flex;align-items:center;gap:0.5rem;justify-content:center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
          <span style="font-weight:500;">Товар #${node.attrs.productId}</span>
        </div>
      `;
      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.attrs.productId !== node.attrs.productId) {
            dom.querySelector("span")!.textContent = `Товар #${updatedNode.attrs.productId}`;
            dom.setAttribute("data-product-id", String(updatedNode.attrs.productId));
          }
          return true;
        },
      };
    };
  },
});

/* ── Slug helper ── */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/* ── Default form state ── */

function getDefaultState(): BlogPostData {
  return {
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    heroImage: null,
    status: "draft",
    publishedAt: null,
    isPinned: false,
    metaTitle: null,
    metaDescription: null,
    ogImage: null,
    useHeroAsOg: true,
    readTime: null,
    categoryId: null,
    tags: [],
    relatedProductIds: [],
  };
}

function initialDataToState(data: any): BlogPostData {
  return {
    id: data.id,
    title: data.title ?? "",
    slug: data.slug ?? "",
    content: data.content ?? "",
    excerpt: data.excerpt ?? "",
    heroImage: data.heroImage ?? null,
    status: data.status ?? "draft",
    publishedAt: data.publishedAt ?? null,
    isPinned: data.isPinned ?? false,
    metaTitle: data.metaTitle ?? null,
    metaDescription: data.metaDescription ?? null,
    ogImage: data.ogImage ?? null,
    useHeroAsOg: !data.ogImage,
    readTime: data.readTime ?? null,
    categoryId: data.categoryId ?? null,
    tags: data.tags ?? [],
    relatedProductIds: data.relatedProductIds ?? [],
  };
}

/* ── Editor Component ── */

export default function BlogEditor({ initialData }: { initialData?: any }) {
  const router = useRouter();
  const toast = useToast();
  const isNew = !initialData?.id;

  // Form state
  const [form, setForm] = useState<BlogPostData>(() =>
    initialData ? initialDataToState(initialData) : getDefaultState()
  );
  const [autoSlug, setAutoSlug] = useState(isNew);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [productsInput, setProductsInput] = useState(
    (initialData?.relatedProductIds ?? []).join(", ")
  );
  const [uploadingImage, setUploadingImage] = useState(false);

  // Store original generated HTML (TipTap strips blog-* classes, so we keep the original for saving)
  const rawContentRef = useRef<string | null>(null);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const ogFileInputRef = useRef<HTMLInputElement>(null);

  // Determine if editing
  const isEditing = !!form.id;

  /* ── Tiptap Editor ── */

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: { class: "rounded-lg" },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      Placeholder.configure({
        placeholder: "Начните писать статью...",
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      YouTube.configure({
        HTMLAttributes: { class: "rounded-lg overflow-hidden" },
      }),
      CharacterCount,
      ProductEmbed,
    ],
    content: form.content || "",
    onUpdate: ({ editor }) => {
      setForm((prev) => ({ ...prev, content: editor.getHTML() }));
    },
    editorProps: {
      attributes: {
        class: "tiptap",
      },
    },
  });

  /* ── Fetch categories ── */
  useEffect(() => {
    fetch("/api/blog/categories")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCategories)
      .catch(() => {});
  }, []);

  /* ── Auto-save (debounced) ── */
  useEffect(() => {
    if (!isEditing || saving) return;
    if (!form.title.trim()) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      setAutoSaving(true);
      try {
        const res = await fetch(`/api/admin/blog/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            status: "draft",
            relatedProductIds: productsInput
              .split(",")
              .map((s: string) => parseInt(s.trim(), 10))
              .filter((n: number) => !isNaN(n)),
          }),
        });
        if (res.ok) setAutoSaving(false);
      } catch {
        // Silent fail for auto-save
      }
      setAutoSaving(false);
    }, 5000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [form, isEditing, saving, productsInput]);

  /* ── Read time auto-calculation ── */
  const autoReadTime = editor ? Math.max(1, Math.ceil(editor.storage.characterCount.characters() / 1800)) : 1;
  const displayReadTime = form.readTime ?? autoReadTime;

  /* ── Form helpers ── */

  const update = useCallback(
    (partial: Partial<BlogPostData>) => setForm((prev) => ({ ...prev, ...partial })),
    []
  );

  const handleTitleChange = (title: string) => {
    update({ title });
    if (autoSlug) {
      update({ slug: slugify(title) });
    }
  };

  /* ── Tags ── */
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase();
      if (tag && !form.tags.includes(tag) && form.tags.length < 10) {
        update({ tags: [...form.tags, tag] });
        setTagInput("");
      }
    }
  };

  const removeTag = (tag: string) => {
    update({ tags: form.tags.filter((t) => t !== tag) });
  };

  /* ── Image upload ── */
  const uploadImage = async (file: File): Promise<string | null> => {
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/blog/upload", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      return data.url ?? data.path ?? null;
    } catch {
      toast.error("Не удалось загрузить изображение");
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleEditorImage = async () => {
    const url = prompt("Введите URL изображения:");
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  };

  const handleEditorImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleEditorFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
    e.target.value = "";
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (url) update({ heroImage: url });
    e.target.value = "";
  };

  const handleOgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (url) {
      update({ ogImage: url, useHeroAsOg: false });
    }
    e.target.value = "";
  };

  /* ── Product embed ── */
  const handleInsertProduct = () => {
    const input = prompt("Введите ID товара или артикул:");
    if (!input) return;
    const id = parseInt(input.trim(), 10);
    if (isNaN(id)) {
      toast.error("Некорректный ID товара");
      return;
    }
    editor
      ?.chain()
      .focus()
      .insertContentAt(editor.state.selection.from, {
        type: "productEmbed",
        attrs: { productId: id },
      })
      .run();
  };

  /* ── Save ── */
  const handleSave = async (status: "draft" | "published") => {
    setSaving(true);
    try {
      const body = {
        ...form,
        status,
        // Use raw content (with blog-* classes) if available, otherwise TipTap output
        content: rawContentRef.current ?? editor?.getHTML() ?? form.content,
        relatedProductIds: productsInput
          .split(",")
          .map((s: string) => parseInt(s.trim(), 10))
          .filter((n: number) => !isNaN(n)),
      };

      let res: Response;
      if (isEditing) {
        res = await fetch(`/api/admin/blog/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/admin/blog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Ошибка сохранения");
      }

      const saved = await res.json();
      toast.success(status === "draft" ? "Черновик сохранён" : "Статья опубликована");

      if (isNew && saved.id) {
        router.replace(`/admin/blog/${saved.id}/edit`);
      } else if (status === "published") {
        router.push("/admin/blog");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  /* ── PublishedAt for datetime-local ── */
  const publishedAtValue = form.publishedAt
    ? new Date(form.publishedAt).toISOString().slice(0, 16)
    : new Date().toISOString().slice(0, 16);

  /* ── Render ── */

  return (
    <div>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleEditorFileChange}
      />
      <input
        ref={heroFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleHeroUpload}
      />
      <input
        ref={ogFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleOgUpload}
      />

      {/* Auto-save indicator */}
      <div className="fixed top-4 right-4 z-50">
        {autoSaving && (
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-lg">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            Автосохранение...
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? "Редактирование статьи" : "Новая статья"}
        </h1>
        <div className="flex items-center gap-2">
          {form.status === "published" && form.slug && (
            <a
              href={`/blog/${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Предпросмотр
            </a>
          )}
          <button
            onClick={() => handleSave("draft")}
            disabled={saving || !form.title.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? "..." : "Сохранить черновик"}
          </button>
          <button
            onClick={() => handleSave("published")}
            disabled={saving || !form.title.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-rose-500 rounded-lg hover:bg-rose-600 transition-colors disabled:opacity-50 cursor-pointer border-none"
          >
            <Send className="w-4 h-4" />
            {saving ? "..." : "Опубликовать"}
          </button>
        </div>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — Content (2/3) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Title */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Заголовок статьи"
              className="w-full text-xl font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none border-none p-0"
            />
          </div>

          {/* Slug */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 shrink-0">/blog/</span>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => {
                  update({ slug: e.target.value });
                  setAutoSlug(false);
                }}
                placeholder="slug-stati"
                className="flex-1 text-sm text-gray-600 font-mono placeholder:text-gray-400 focus:outline-none border-none p-0"
              />
            </div>
          </div>

          {/* Category + Tags row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Рубрика
              </label>
              <select
                value={form.categoryId ?? ""}
                onChange={(e) =>
                  update({ categoryId: e.target.value ? Number(e.target.value) : null })
                }
                className="w-full text-sm text-gray-700 focus:outline-none border-none p-0 bg-transparent cursor-pointer"
              >
                <option value="">Без рубрики</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Read time */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Время чтения
              </label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={form.readTime ?? autoReadTime}
                  onChange={(e) =>
                    update({
                      readTime: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  min={1}
                  max={120}
                  className="w-16 text-sm text-gray-700 focus:outline-none border-none p-0 bg-transparent"
                />
                <span className="text-sm text-gray-400">мин чтения</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Теги
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagInputKeyDown}
              placeholder="Введите тег и нажмите Enter..."
              className="w-full text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none border-none p-0 mb-2"
            />
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 text-xs font-medium rounded-full"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-rose-900 transition-colors cursor-pointer border-none bg-transparent p-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Excerpt */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Анонс
              <span className="ml-2 font-normal text-gray-400 normal-case">
                {(form.excerpt ?? "").length}/200
              </span>
            </label>
            <textarea
              value={form.excerpt ?? ""}
              onChange={(e) => {
                if (e.target.value.length <= 200) {
                  update({ excerpt: e.target.value });
                }
              }}
              placeholder="Краткое описание статьи для превью..."
              rows={3}
              className="w-full text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none border-none p-0 resize-none"
            />
          </div>

          {/* Tiptap Editor */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-gray-200 bg-gray-50">
              {/* Text formatting */}
              <ToolbarButton
                onClick={() => editor?.chain().focus().toggleBold().run()}
                active={editor?.isActive("bold") ?? false}
                title="Жирный"
              >
                <Bold className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                active={editor?.isActive("italic") ?? false}
                title="Курсив"
              >
                <Italic className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                active={editor?.isActive("underline") ?? false}
                title="Подчёркнутый"
              >
                <UnderlineIcon className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor?.chain().focus().toggleStrike().run()}
                active={editor?.isActive("strike") ?? false}
                title="Зачёркнутый"
              >
                <Strikethrough className="w-4 h-4" />
              </ToolbarButton>

              <Separator />

              {/* Headings */}
              <ToolbarButton
                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                active={editor?.isActive("heading", { level: 2 }) ?? false}
                title="Заголовок 2"
              >
                <Heading2 className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                active={editor?.isActive("heading", { level: 3 }) ?? false}
                title="Заголовок 3"
              >
                <Heading3 className="w-4 h-4" />
              </ToolbarButton>

              <Separator />

              {/* Lists */}
              <ToolbarButton
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                active={editor?.isActive("bulletList") ?? false}
                title="Маркированный список"
              >
                <List className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                active={editor?.isActive("orderedList") ?? false}
                title="Нумерованный список"
              >
                <ListOrdered className="w-4 h-4" />
              </ToolbarButton>

              <Separator />

              {/* Blockquote + Code */}
              <ToolbarButton
                onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                active={editor?.isActive("blockquote") ?? false}
                title="Цитата"
              >
                <Quote className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                active={editor?.isActive("codeBlock") ?? false}
                title="Блок кода"
              >
                <Code className="w-4 h-4" />
              </ToolbarButton>

              <Separator />

              {/* Alignment */}
              <ToolbarButton
                onClick={() => editor?.chain().focus().setTextAlign("left").run()}
                active={editor?.isActive({ textAlign: "left" }) ?? false}
                title="По левому краю"
              >
                <AlignLeft className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor?.chain().focus().setTextAlign("center").run()}
                active={editor?.isActive({ textAlign: "center" }) ?? false}
                title="По центру"
              >
                <AlignCenter className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor?.chain().focus().setTextAlign("right").run()}
                active={editor?.isActive({ textAlign: "right" }) ?? false}
                title="По правому краю"
              >
                <AlignRight className="w-4 h-4" />
              </ToolbarButton>

              <Separator />

              {/* Link */}
              <ToolbarButton
                onClick={() => {
                  const url = prompt("Введите URL ссылки:", "https://");
                  if (url) {
                    editor
                      ?.chain()
                      .focus()
                      .extendMarkRange("link")
                      .setLink({ href: url })
                      .run();
                  }
                }}
                active={editor?.isActive("link") ?? false}
                title="Ссылка"
              >
                <LinkIcon className="w-4 h-4" />
              </ToolbarButton>

              {/* Image */}
              <ToolbarButton onClick={handleEditorImage} title="Изображение (URL)">
                <ImageIcon className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={handleEditorImageUpload} title="Загрузить изображение" disabled={uploadingImage}>
                <Upload className="w-4 h-4" />
              </ToolbarButton>

              {/* YouTube */}
              <ToolbarButton
                onClick={() => {
                  const url = prompt("Введите URL YouTube видео:");
                  if (url) {
                    editor?.chain().focus().setYoutubeVideo({ src: url }).run();
                  }
                }}
                title="YouTube видео"
              >
                <Video className="w-4 h-4" />
              </ToolbarButton>

              {/* Product embed */}
              <ToolbarButton onClick={handleInsertProduct} title="Вставить товар">
                <Package className="w-4 h-4" />
              </ToolbarButton>

              <Separator />

              {/* Horizontal rule */}
              <ToolbarButton
                onClick={() => editor?.chain().focus().setHorizontalRule().run()}
                title="Разделитель"
              >
                <Minus className="w-4 h-4" />
              </ToolbarButton>

              {/* Undo/Redo */}
              <div className="ml-auto flex items-center gap-0.5">
                <ToolbarButton
                  onClick={() => editor?.chain().focus().undo().run()}
                  disabled={!editor?.can().undo()}
                  title="Отменить"
                >
                  <Undo2 className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().redo().run()}
                  disabled={!editor?.can().redo()}
                  title="Повторить"
                >
                  <Redo2 className="w-4 h-4" />
                </ToolbarButton>
              </div>
            </div>

            {/* Editor content */}
            <EditorContent editor={editor} />

            {/* Character count */}
            {editor && (
              <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
                {editor.storage.characterCount.characters()} символов ·{" "}
                {editor.storage.characterCount.words()} слов
              </div>
            )}
          </div>
        </div>

        {/* Right column — Sidebar (1/3) */}
        <div className="space-y-5">
          {/* Hero Image */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Изображение статьи
            </label>
            {form.heroImage ? (
              <div className="relative rounded-lg overflow-hidden mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.heroImage.startsWith("/") ? `/api${form.heroImage}` : form.heroImage}
                  alt="Hero"
                  className="w-full h-40 object-cover"
                />
                <button
                  onClick={() => update({ heroImage: null })}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors cursor-pointer border-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => heroFileInputRef.current?.click()}
                disabled={uploadingImage}
                className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors cursor-pointer bg-transparent"
              >
                {uploadingImage ? (
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span className="text-xs">Нажмите или перетащите</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={() => heroFileInputRef.current?.click()}
              disabled={uploadingImage}
              className="w-full mt-2 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border-none"
            >
              {form.heroImage ? "Заменить" : "Выбрать файл"}
            </button>
          </div>

          {/* Publication settings */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Публикация
            </label>

            {/* Status */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Статус</label>
              <select
                value={form.status}
                onChange={(e) =>
                  update({ status: e.target.value as BlogPostData["status"] })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white"
              >
                <option value="draft">Черновик</option>
                <option value="published">Опубликовано</option>
                <option value="archived">Архив</option>
              </select>
            </div>

            {/* Published at */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Дата публикации</label>
              <input
                type="datetime-local"
                value={publishedAtValue}
                onChange={(e) => update({ publishedAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              />
            </div>

            {/* Pin */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                className={`relative w-10 h-5.5 rounded-full transition-colors ${
                  form.isPinned ? "bg-rose-500" : "bg-gray-300"
                }`}
                onClick={() => update({ isPinned: !form.isPinned })}
                role="switch"
                aria-checked={form.isPinned}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    update({ isPinned: !form.isPinned });
                  }
                }}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${
                    form.isPinned ? "translate-x-4.5" : "translate-x-0"
                  }`}
                />
              </div>
              <span className="text-sm text-gray-700">Закрепить статью</span>
            </label>
          </div>

          {/* SEO */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setSeoOpen(!seoOpen)}
              className="w-full flex items-center justify-between p-4 text-left cursor-pointer border-none bg-transparent"
            >
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide m-0">
                SEO
              </label>
              {seoOpen ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {seoOpen && (
              <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
                {/* Meta title */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Meta title
                  </label>
                  <input
                    type="text"
                    value={form.metaTitle ?? ""}
                    onChange={(e) => update({ metaTitle: e.target.value || null })}
                    placeholder="Оставьте пустым для авто"
                    maxLength={70}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                  <span className="text-xs text-gray-400 mt-1">
                    {(form.metaTitle ?? "").length}/70
                  </span>
                </div>

                {/* Meta description */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Meta description
                  </label>
                  <textarea
                    value={form.metaDescription ?? ""}
                    onChange={(e) =>
                      update({
                        metaDescription:
                          e.target.value.length <= 160
                            ? e.target.value || null
                            : form.metaDescription,
                      })
                    }
                    placeholder="Описание для поисковых систем"
                    rows={3}
                    maxLength={160}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
                  />
                  <span className="text-xs text-gray-400 mt-1">
                    {(form.metaDescription ?? "").length}/160
                  </span>
                </div>

                {/* OG Image */}
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    OG Image
                  </label>
                  <label className="flex items-center gap-2 mb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.useHeroAsOg}
                      onChange={(e) =>
                        update({ useHeroAsOg: e.target.checked, ogImage: e.target.checked ? null : form.ogImage })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-rose-500 focus:ring-rose-500"
                    />
                    <span className="text-xs text-gray-500">
                      Использовать главное изображение
                    </span>
                  </label>
                  {!form.useHeroAsOg && (
                    <>
                      {form.ogImage ? (
                        <div className="relative rounded-lg overflow-hidden mb-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={form.ogImage.startsWith("/") ? `/api${form.ogImage}` : form.ogImage}
                            alt="OG"
                            className="w-full h-24 object-cover"
                          />
                          <button
                            onClick={() => update({ ogImage: null })}
                            className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded cursor-pointer border-none"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => ogFileInputRef.current?.click()}
                          className="w-full h-20 border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-xs text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors cursor-pointer bg-transparent mb-2"
                        >
                          Загрузить OG Image
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Related products */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Связанные товары
            </label>
            <input
              type="text"
              value={productsInput}
              onChange={(e) => setProductsInput(e.target.value)}
              placeholder="ID товаров через запятую (например: 1, 5, 12)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Введите ID товаров, которые будут отображаться вместе со статьёй
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Toolbar sub-components ── */

function ToolbarButton({
  children,
  onClick,
  active = false,
  disabled = false,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-md transition-colors cursor-pointer border-none bg-transparent flex items-center justify-center ${
        active
          ? "bg-rose-100 text-rose-600"
          : "text-gray-500 hover:bg-gray-200 hover:text-gray-700"
      } disabled:opacity-30 disabled:cursor-default`}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="w-px h-5 bg-gray-300 mx-0.5" />;
}
