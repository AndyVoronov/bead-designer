"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-provider";
import { decodeDesign } from "@/lib/serialization";
import { useDesignStore } from "@/stores/useDesignStore";
import { getCatalogBead } from "@/data/catalogBeads";

// ── Types ────────────────────────────────────────────────────────────────────

type SavedDesign = {
  id: number;
  name: string;
  designCode: string;
  beadCount: number;
  updatedAt: string;
};

type Template = {
  id: string;
  name: string;
  designCode: string;
  beadCount: number;
  favoriteCount?: number;
};

type Tab = "saved" | "templates";

interface SavedDesignsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onBeforeLoadDesign: () => Promise<boolean>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const FALLBACK_COLOR = "#D1D5DB";

function beadWord(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return "бусина";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) return "бусины";
  return "бусин";
}

function getPreviewColors(designCode: string, max = 8): string[] {
  try {
    const design = decodeDesign(designCode);
    return (design?.b ?? []).slice(0, max).map((id) => {
      const bead = getCatalogBead(id);
      return bead?.color ?? FALLBACK_COLOR;
    });
  } catch {
    return [];
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function SavedDesignsPanel({ isOpen, onClose, onBeforeLoadDesign }: SavedDesignsPanelProps) {
  const { user, requireAuth } = useAuth();
  const [tab, setTab] = useState<Tab>("saved");

  // Saved designs state
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [designsLoading, setDesignsLoading] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Load / delete / rename state
  const [loadingId, setLoadingId] = useState<number | string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Rename state
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Fetch data when panel opens or tab changes
  useEffect(() => {
    if (!isOpen) return;

    if (tab === "saved" && user) {
      setDesignsLoading(true);
      fetch("/api/designs/saved")
        .then((r) => r.json())
        .then(setDesigns)
        .catch(() => setDesigns([]))
        .finally(() => setDesignsLoading(false));
    } else if (tab === "templates") {
      setTemplatesLoading(true);
      fetch("/api/templates")
        .then((r) => r.json())
        .then(setTemplates)
        .catch(() => setTemplates([]))
        .finally(() => setTemplatesLoading(false));
    }
  }, [isOpen, tab, user]);

  // Reset tab to "saved" when panel closes
  useEffect(() => {
    if (!isOpen) setTab("saved");
  }, [isOpen]);

  // ── Handlers ──────────────────────────────────────────

  const handleOpenDesign = useCallback(async (design: SavedDesign) => {
    const proceed = await onBeforeLoadDesign();
    if (!proceed) return;

    setLoadingId(design.id);
    try {
      const res = await fetch(`/api/designs/saved/${design.id}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      const parsed = decodeDesign(data.designCode);
      if (parsed?.b && Array.isArray(parsed.b)) {
        useDesignStore.getState().loadFromCatalogIds(parsed.b);
      }
      onClose();
    } catch (err) {
      console.error("Failed to load saved design:", err);
    } finally {
      setLoadingId(null);
    }
  }, [onBeforeLoadDesign, onClose]);

  const handleOpenTemplate = useCallback(async (template: Template) => {
    const proceed = await onBeforeLoadDesign();
    if (!proceed) return;

    setLoadingId(template.id);
    try {
      const parsed = decodeDesign(template.designCode);
      if (parsed?.b && Array.isArray(parsed.b)) {
        useDesignStore.getState().loadFromCatalogIds(parsed.b);
      }
      onClose();
    } catch (err) {
      console.error("Failed to load template:", err);
    } finally {
      setLoadingId(null);
    }
  }, [onBeforeLoadDesign, onClose]);

  const handleDelete = useCallback(async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await fetch(`/api/designs/saved/${id}`, { method: "DELETE" });
      setDesigns((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error("Failed to delete design:", err);
    } finally {
      setDeletingId(null);
    }
  }, []);

  const startRename = useCallback((e: React.MouseEvent, design: SavedDesign) => {
    e.stopPropagation();
    setRenamingId(design.id);
    setRenameValue(design.name);
  }, []);

  const confirmRename = useCallback(async () => {
    if (renamingId === null || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }

    try {
      const res = await fetch(`/api/designs/saved/${renamingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDesigns((prev) =>
          prev.map((d) => (d.id === renamingId ? { ...d, name: updated.name } : d))
        );
      }
    } catch (err) {
      console.error("Failed to rename design:", err);
    } finally {
      setRenamingId(null);
    }
  }, [renamingId, renameValue]);

  const handleTabChange = useCallback((t: Tab) => {
    setRenamingId(null);
    setTab(t);
  }, []);

  const stopTouch = useCallback((e: React.TouchEvent) => e.stopPropagation(), []);

  // ── Not logged in ─────────────────────────────────────

  if (isOpen && !user) {
    return (
      <div
        className={`fixed inset-x-0 bottom-0 z-20 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        onTouchStart={stopTouch}
        onTouchMove={stopTouch}
        style={{ touchAction: "pan-y" }}
      >
        <div className="flex-1 flex justify-center absolute left-4 right-4 top-2 pointer-events-none">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="px-4 pt-8 pb-8 text-center">
          <p className="text-gray-500 mb-4">Войдите, чтобы видеть свои дизайны</p>
          <button
            onClick={() => { onClose(); requireAuth(() => {}); }}
            className="px-5 py-2 bg-rose-500 text-white rounded-xl text-sm font-medium hover:bg-rose-600 transition-colors cursor-pointer"
          >
            Войти
          </button>
        </div>
      </div>
    );
  }

  // ── Main panel ────────────────────────────────────────

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-20 max-h-[60vh] bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-y-0" : "translate-y-full"
      }`}
      onTouchStart={stopTouch}
      onTouchMove={stopTouch}
      style={{ touchAction: "pan-y" }}
    >
      {/* Drag handle */}
      <div className="flex-1 flex justify-center absolute left-4 right-4 top-2 pointer-events-none">
        <div className="w-10 h-1 rounded-full bg-gray-300" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-8 pb-1">
        <div className="flex gap-1">
          <TabButton active={tab === "saved"} onClick={() => handleTabChange("saved")}>
            Мои дизайны
          </TabButton>
          <TabButton active={tab === "templates"} onClick={() => handleTabChange("templates")}>
            Шаблоны
          </TabButton>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors cursor-pointer"
          aria-label="Закрыть"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18" /><path d="M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div
        className="overflow-y-auto px-4 pb-24 max-h-[calc(60vh-100px)]"
        style={{ touchAction: "pan-y" }}
      >
        {tab === "saved" && (
          <DesignList
            designs={designs}
            loading={designsLoading}
            loadingId={loadingId}
            deletingId={deletingId}
            renamingId={renamingId}
            renameValue={renameValue}
            onOpen={handleOpenDesign}
            onDelete={(e, d) => handleDelete(e, d.id)}
            onStartRename={startRename}
            onRenameValueChange={setRenameValue}
            onConfirmRename={confirmRename}
            onCancelRename={() => setRenamingId(null)}
          />
        )}
        {tab === "templates" && (
          <TemplateList
            templates={templates}
            loading={templatesLoading}
            loadingId={loadingId}
            onOpen={handleOpenTemplate}
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer select-none border-none ${
        active
          ? "bg-rose-500 text-white"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

function DesignList({
  designs,
  loading,
  loadingId,
  deletingId,
  renamingId,
  renameValue,
  onOpen,
  onDelete,
  onStartRename,
  onRenameValueChange,
  onConfirmRename,
  onCancelRename,
}: {
  designs: SavedDesign[];
  loading: boolean;
  loadingId: number | string | null;
  deletingId: number | null;
  renamingId: number | null;
  renameValue: string;
  onOpen: (d: SavedDesign) => void;
  onDelete: (e: React.MouseEvent, d: SavedDesign) => void;
  onStartRename: (e: React.MouseEvent, d: SavedDesign) => void;
  onRenameValueChange: (v: string) => void;
  onConfirmRename: () => void;
  onCancelRename: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2 animate-pulse pt-2">
        {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
      </div>
    );
  }

  if (designs.length === 0) {
    return <div className="text-center py-8 text-gray-400 text-sm">У вас пока нет сохранённых дизайнов</div>;
  }

  return (
    <div className="space-y-2 pt-2">
      {designs.map((d) => (
        <div
          key={d.id}
          className="bg-gray-50 rounded-xl p-3 border border-gray-100"
        >
          {renamingId === d.id ? (
            /* ── Inline rename mode ─────────────────────── */
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => onRenameValueChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onConfirmRename();
                  if (e.key === "Escape") onCancelRename();
                }}
                className="flex-1 px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => { e.stopPropagation(); onConfirmRename(); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors cursor-pointer shrink-0"
                aria-label="Сохранить"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onCancelRename(); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-200 text-gray-500 hover:bg-gray-300 transition-colors cursor-pointer shrink-0"
                aria-label="Отмена"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18" /><path d="M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            /* ── Normal mode ────────────────────────────── */
            <button
              onClick={() => onOpen(d)}
              disabled={loadingId === d.id}
              className="w-full text-left flex items-center justify-between cursor-pointer disabled:opacity-60 border-none bg-transparent p-0"
            >
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-gray-900 truncate">{d.name}</h3>
                <div className="flex items-center gap-1 mt-1 min-h-[14px]">
                  {getPreviewColors(d.designCode, 10).map((color, i) => (
                    <span
                      key={i}
                      className="block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {d.beadCount} {beadWord(d.beadCount)} · {new Date(d.updatedAt).toLocaleDateString("ru-RU")}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-3">
                {loadingId === d.id ? (
                  <span className="text-xs text-rose-500 font-medium">Загрузка...</span>
                ) : (
                  <>
                    <span className="text-xs text-rose-500 font-medium">Открыть</span>
                    <ActionIcon
                      onClick={onStartRename}
                      design={d}
                      ariaLabel="Переименовать"
                      icon="rename"
                    />
                    <ActionIcon
                      onClick={onDelete}
                      design={d}
                      ariaLabel="Удалить"
                      icon="delete"
                      disabled={deletingId === d.id}
                    />
                  </>
                )}
              </div>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function TemplateList({
  templates,
  loading,
  loadingId,
  onOpen,
}: {
  templates: Template[];
  loading: boolean;
  loadingId: number | string | null;
  onOpen: (t: Template) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2 animate-pulse pt-2">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
      </div>
    );
  }

  if (templates.length === 0) {
    return <div className="text-center py-8 text-gray-400 text-sm">Шаблоны пока не добавлены</div>;
  }

  return (
    <div className="grid grid-cols-2 gap-2 pt-2">
      {templates.map((t) => (
        <TemplateItem key={t.id} template={t} loading={loadingId === t.id} onOpen={onOpen} />
      ))}
    </div>
  );
}

function TemplateItem({
  template: t,
  loading,
  onOpen,
}: {
  template: Template;
  loading: boolean;
  onOpen: (t: Template) => void;
}) {
  const colors = getPreviewColors(t.designCode);
  const [favorited, setFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  // Check initial favorite state
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((session) => {
        if (!session?.user?.id) return;
        fetch("/api/favorites")
          .then((r) => r.json())
          .then((favs: Array<{ templateId: string }>) => {
            if (favs.some((f) => String(f.templateId) === String(t.id))) {
              setFavorited(true);
            }
          })
          .catch(() => {});
      })
      .catch(() => {});
  }, [t.id]);

  const toggleFavorite = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setFavLoading(true);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: Number(t.id) }),
      });
      if (res.ok) {
        const data = await res.json();
        setFavorited(data.favorited);
      } else if (res.status === 401) {
        window.dispatchEvent(new CustomEvent("auth-required"));
      }
    } catch {
      // silent
    } finally {
      setFavLoading(false);
    }
  }, [t.id]);

  return (
    <button
      onClick={() => onOpen(t)}
      disabled={loading}
      className="text-left bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-xl p-3 transition-colors cursor-pointer border border-gray-100 disabled:opacity-60 relative"
    >
      {/* Favorite button */}
      <button
        onClick={toggleFavorite}
        disabled={favLoading}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full transition-colors cursor-pointer z-10 border-none bg-transparent hover:bg-white/80 disabled:cursor-default"
        aria-label={favorited ? "Убрать из избранного" : "Добавить в избранное"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill={favorited ? "#ef4444" : "none"} stroke={favorited ? "#ef4444" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>

      {/* Color dots preview */}
      <div className="flex gap-1 mb-2 min-h-[16px]">
        {colors.slice(0, 8).map((color, i) => (
          <span key={i} className="block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        ))}
      </div>
      <h3 className="text-sm font-medium text-gray-900 truncate">{t.name}</h3>
      <p className="text-xs text-gray-400 mt-0.5">
        {t.beadCount} {beadWord(t.beadCount)}
        {(t.favoriteCount ?? 0) > 0 && (
          <span className="ml-1 text-rose-400">♡ {t.favoriteCount}</span>
        )}
      </p>
      {loading && (
        <span className="text-xs text-rose-500 font-medium mt-1 block">Загрузка...</span>
      )}
    </button>
  );
}

function ActionIcon({
  onClick,
  design,
  ariaLabel,
  icon,
  disabled,
}: {
  onClick: (e: React.MouseEvent, d: SavedDesign) => void;
  design: SavedDesign;
  ariaLabel: string;
  icon: "rename" | "delete";
  disabled?: boolean;
}) {
  return (
    <button
      onClick={(e) => onClick(e, design)}
      disabled={disabled}
      className={`w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors cursor-pointer shrink-0 ${
        icon === "delete" ? "text-gray-400 hover:text-red-500" : "text-gray-400 hover:text-blue-500"
      } disabled:opacity-40`}
      aria-label={ariaLabel}
    >
      {icon === "rename" ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      )}
    </button>
  );
}
