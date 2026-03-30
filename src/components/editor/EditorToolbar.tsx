"use client";

import { useState, useEffect, useCallback } from "react";
import { useDesignStore } from "@/stores/useDesignStore";
import { encodeDesign } from "@/lib/serialization";
import { generateTelegramLink } from "@/lib/telegram";

interface EditorToolbarProps {
  catalogOpen: boolean;
  onToggleCatalog: () => void;
}

/**
 * Fixed bottom toolbar with glass-morphism styling.
 * Reads bead count and selection state from the design store.
 * Provides four action buttons: catalog toggle, remove selected, share, reset.
 */
export function EditorToolbar({ catalogOpen, onToggleCatalog }: EditorToolbarProps) {
  const beadCount = useDesignStore((s) => s.beads.length);
  const selectedId = useDesignStore((s) => s.selectedBeadId);
  const beads = useDesignStore((s) => s.beads);

  // ── Share state ────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!orderError) return;
    const timer = setTimeout(() => setOrderError(null), 3000);
    return () => clearTimeout(timer);
  }, [orderError]);

  const canShare = beads.some((b) => !!b.catalogBeadId);

  const handleShare = useCallback(async () => {
    if (!canShare) return;
    try {
      const code = encodeDesign(beads);
      if (!code) return;
      const url = `${window.location.origin}/design/${code}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch (err) {
      console.error("Failed to copy share URL:", err);
    }
  }, [beads, canShare]);

  const canOrder = beads.length > 0;

  const handleOrder = useCallback(async () => {
    if (!canOrder || isOrdering) return;
    setIsOrdering(true);
    setOrderError(null);
    try {
      const code = encodeDesign(beads);
      if (!code) return;
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designCode: code, beadCount: beads.length }),
      });
      if (!res.ok) throw new Error("Order failed");
      const order = await res.json();
      const link = generateTelegramLink(order.designCode, order.beadCount);
      window.open(link, "_blank", "noopener");
    } catch (err) {
      console.error("Failed to create order:", err);
      setOrderError("Не удалось создать заказ");
    } finally {
      setIsOrdering(false);
    }
  }, [beads, canOrder, isOrdering]);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex flex-col gap-2 px-4 py-3 bg-white/70 backdrop-blur-md border-t border-gray-200/50 z-10"
      style={{ touchAction: "manipulation" }}
    >
      {/* ── Order CTA (full-width above actions) ──────────────── */}
      <button
        onClick={handleOrder}
        disabled={!canOrder || isOrdering}
        className="w-full py-2.5 text-sm font-semibold rounded-xl text-white transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer select-none active:scale-[0.98]"
        style={{ backgroundColor: isOrdering ? "#9ca3af" : "#10b981" }}
      >
        {isOrdering ? "Отправка..." : orderError ? orderError : "🛒 Заказать"}
      </button>

      {/* ── Bottom row: bead count + action buttons ──────────── */}
      <div className="flex items-center justify-between">
        {/* ── Left: bead count badge ────────────────────────────── */}
        <span className="text-sm font-medium text-gray-600 tabular-nums select-none">
          {beadCount}{" "}
          {beadCount === 1 ? "бусина" : beadCount < 5 ? "бусины" : "бусин"}
        </span>

        {/* ── Right: action buttons ─────────────────────────────── */}
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

          {/* Share / Поделиться */}
          <button
            onClick={handleShare}
            disabled={!canShare}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer select-none active:scale-95"
            aria-label="Поделиться ссылкой на дизайн"
          >
            {copied ? <CheckIcon /> : <ShareIcon />}
            <span>{copied ? "Скопировано!" : "Поделиться"}</span>
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

function ShareIcon() {
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
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function CheckIcon() {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
