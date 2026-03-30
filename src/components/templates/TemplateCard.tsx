"use client";

import Link from "next/link";
import { decodeDesign } from "@/lib/serialization";
import { getCatalogBead } from "@/data/catalogBeads";

interface TemplateCardProps {
  name: string;
  designCode: string;
  beadCount: number;
}

const MAX_PREVIEW_DOTS = 8;
const FALLBACK_COLOR = "#D1D5DB"; // gray-300

/**
 * Individual template card with bead-color preview dots.
 *
 * Decodes the design code to extract catalog bead IDs, then renders
 * small colored circles for the first N beads. Falls back to gray
 * for any bead whose catalog ID can't be resolved.
 */
export default function TemplateCard({
  name,
  designCode,
  beadCount,
}: TemplateCardProps) {
  const design = decodeDesign(designCode);
  const beadIds = design?.b ?? [];

  const previewColors = beadIds.slice(0, MAX_PREVIEW_DOTS).map((id) => {
    const bead = getCatalogBead(id);
    return bead?.color ?? FALLBACK_COLOR;
  });

  const beadWord =
    beadCount % 10 === 1 && beadCount % 100 !== 11
      ? "бусина"
      : beadCount % 10 >= 2 && beadCount % 10 <= 4 && (beadCount % 100 < 12 || beadCount % 100 > 14)
        ? "бусины"
        : "бусин";

  return (
    <Link
      href={`/design/${designCode}`}
      className="group flex-shrink-0 w-40 snap-start"
    >
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 p-4 active:scale-95 min-h-[120px] flex flex-col gap-3">
        {/* Bead color preview dots */}
        <div className="flex items-center gap-1.5 flex-wrap min-h-[24px]">
          {previewColors.map((color, i) => (
            <span
              key={i}
              className="block w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
          ))}
        </div>

        {/* Template info */}
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-sm text-gray-800 leading-tight line-clamp-2 group-hover:text-gray-600 transition-colors">
            {name}
          </span>
          <span className="text-xs text-gray-400">
            {beadCount} {beadWord}
          </span>
        </div>
      </div>
    </Link>
  );
}
