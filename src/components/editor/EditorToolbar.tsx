"use client";

import { useDesignStore } from "@/stores/useDesignStore";

interface EditorToolbarProps {
  catalogOpen: boolean;
  onToggleCatalog: () => void;
}

/**
 * Fixed bottom toolbar with glass-morphism styling.
 * Reads bead count and selection state from the design store.
 * Provides three action buttons: catalog toggle, remove selected, reset.
 */
export function EditorToolbar({ catalogOpen, onToggleCatalog }: EditorToolbarProps) {
  const beadCount = useDesignStore((s) => s.beads.length);
  const selectedId = useDesignStore((s) => s.selectedBeadId);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-white/70 backdrop-blur-md border-t border-gray-200/50 z-10"
      style={{ touchAction: "manipulation" }}
    >
      {/* ── Left: bead count badge ──────────────────────────────── */}
      <span className="text-sm font-medium text-gray-600 tabular-nums select-none">
        {beadCount}{" "}
        {beadCount === 1 ? "бусина" : beadCount < 5 ? "бусины" : "бусин"}
      </span>

      {/* ── Right: action buttons ───────────────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Catalog toggle */}
        <button
          onClick={onToggleCatalog}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl transition-all duration-150 cursor-pointer select-none active:scale-95"
          style={{
            backgroundColor: catalogOpen ? "#dbeafe" : "#f0fdf4",
            color: catalogOpen ? "#1d4ed8" : "#15803d",
          }}
          aria-label={catalogOpen ? "Закрыть каталог" : "Открыть каталог"}
          aria-expanded={catalogOpen}
        >
          <CatalogIcon open={catalogOpen} />
          <span>{catalogOpen ? "Закрыть" : "Каталог"}</span>
        </button>

        {/* Remove selected bead */}
        <button
          onClick={() => useDesignStore.getState().removeSelected()}
          disabled={!selectedId}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer select-none active:scale-95"
          aria-label="Удалить выбранную бусину"
        >
          <TrashIcon />
          <span>Удалить</span>
        </button>

        {/* Reset design */}
        <button
          onClick={() => useDesignStore.getState().resetDesign()}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-150 cursor-pointer select-none active:scale-95"
          aria-label="Сбросить цепочку"
        >
          <ResetIcon />
          <span>Сброс</span>
        </button>
      </div>
    </div>
  );
}

// ── Inline SVG Icons ─────────────────────────────────────────────────────────

function CatalogIcon({ open }: { open: boolean }) {
  return open ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 15l5 5 5-5" />
      <path d="M7 9l5-5 5 5" />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function TrashIcon() {
  return (
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
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function ResetIcon() {
  return (
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
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
