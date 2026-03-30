"use client";

import { useState, useMemo, useCallback } from "react";
import type { BeadType } from "@/types/bead";
import { CATALOG_BEADS } from "@/data/catalogBeads";
import { CatalogBeadItem } from "./CatalogBeadItem";

// ── Filter configuration ─────────────────────────────────────────────────

interface FilterOption {
  value: BeadType | "all";
  label: string;
}

const FILTERS: FilterOption[] = [
  { value: "all", label: "Все" },
  { value: "wood", label: "Дерево" },
  { value: "silicone", label: "Силикон" },
  { value: "knit", label: "Вязаное" },
  { value: "plastic", label: "Пластик" },
];

// ── Component ────────────────────────────────────────────────────────────

interface BeadCatalogPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Mobile catalog bottom-sheet UI.
 * Slides up from bottom with smooth CSS transition.
 * Contains horizontal filter chips by material type and a
 * vertically scrollable 4-column grid of bead cards.
 *
 * Critical: touch events are stopped at the panel boundary
 * to prevent them from reaching the 3D canvas underneath.
 * The bead grid has touch-action: pan-y for vertical scrolling.
 */
export function BeadCatalogPanel({ isOpen, onClose }: BeadCatalogPanelProps) {
  const [activeFilter, setActiveFilter] = useState<BeadType | "all">("all");

  const filteredBeads = useMemo(() => {
    if (activeFilter === "all") return CATALOG_BEADS;
    return CATALOG_BEADS.filter((b) => b.material === activeFilter);
  }, [activeFilter]);

  const handleFilterChange = useCallback((value: BeadType | "all") => {
    setActiveFilter(value);
  }, []);

  // Prevent touch events from reaching the 3D canvas underneath
  const stopTouchPropagation = useCallback(
    (e: React.TouchEvent) => e.stopPropagation(),
    []
  );

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-20 max-h-[60vh] bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-y-0" : "translate-y-full"
      }`}
      onTouchStart={stopTouchPropagation}
      onTouchMove={stopTouchPropagation}
      style={{ touchAction: "pan-y" }}
    >
      {/* ── Header row ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        {/* Drag handle pill */}
        <div className="flex-1 flex justify-center absolute left-4 right-4 top-2 pointer-events-none">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pb-2">
        <h2 className="text-base font-semibold text-gray-900">Каталог бусин</h2>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors cursor-pointer"
          aria-label="Закрыть каталог"
        >
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
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── Filter chips row ──────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-none">
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => handleFilterChange(filter.value)}
              className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer select-none border-none ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              aria-pressed={isActive}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* ── Bead grid (vertically scrollable) ─────────────────────── */}
      <div
        className="catalog-scroll overflow-y-auto px-4 pb-24 grid grid-cols-4 gap-2 max-h-[calc(60vh-120px)]"
        style={{ touchAction: "pan-y" }}
      >
        {filteredBeads.map((bead) => (
          <CatalogBeadItem key={bead.id} bead={bead} />
        ))}
      </div>
    </div>
  );
}
