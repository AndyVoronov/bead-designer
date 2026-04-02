"use client";

import type { CatalogBead } from "@/types/bead";
import { useDesignStore } from "@/stores/useDesignStore";

const MATERIAL_LABELS: Record<string, string> = {
  wood: "Дерево",
  silicone: "Силикон",
  knit: "Вязаное",
  plastic: "Пластик",
};

const SHAPE_ICONS: Record<string, string> = {
  sphere: "",
  oblate: "⬭",
  buckyball: "⬡",
  disc: "●",
  star: "★",
  heart: "♥",
  cylinder: "▮",
};

interface CatalogBeadItemProps {
  bead: CatalogBead;
}

/**
 * Single bead card in the catalog grid.
 * Renders a colored circle, Russian name (truncated), and material label.
 * Tapping calls useDesignStore.addBead with the catalog bead id.
 */
export function CatalogBeadItem({ bead }: CatalogBeadItemProps) {
  const handleAdd = () => {
    useDesignStore.getState().addBead(bead.id);
  };

  return (
    <button
      type="button"
      onClick={handleAdd}
      className="w-[72px] flex flex-col items-center gap-1 p-1.5 rounded-xl hover:bg-gray-100 active:scale-95 transition-transform cursor-pointer border-none bg-transparent"
      aria-label={`Добавить ${bead.nameRu}`}
    >
      {/* Color circle — shape indicated by border-radius or icon overlay */}
      <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
        <div
          className={`shadow-sm border border-black/5 ${
            bead.shape === "oblate" ? "w-8 h-5 rounded-full" : "w-8 h-8 rounded-full"
          }`}
          style={{ backgroundColor: bead.color }}
        />
        {/* Shape indicator for non-sphere shapes */}
        {bead.shape && bead.shape !== "sphere" && bead.shape !== "oblate" && (
          <span className="absolute text-[8px] text-white drop-shadow-sm pointer-events-none">
            {SHAPE_ICONS[bead.shape] ?? ""}
          </span>
        )}
      </div>

      {/* Name — truncated if too long */}
      <span className="text-[11px] leading-tight text-gray-800 text-center truncate w-full px-0.5">
        {bead.nameRu}
      </span>

      {/* Material label */}
      <span className="text-[9px] text-gray-400 leading-tight">
        {MATERIAL_LABELS[bead.material] ?? bead.material}
      </span>
    </button>
  );
}
