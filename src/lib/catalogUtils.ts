import type { CatalogBead, BeadState } from "@/types/bead";

/**
 * Convert a catalog bead definition into a runtime BeadState
 * suitable for the 3D physics chain.
 *
 * Mapping rules:
 * - id:          unique instance id (timestamp + random suffix)
 * - catalogBeadId: preserved for round-trip back to catalog
 * - type:        material maps directly to BeadType
 * - radius:      catalog `size` is a diameter-like concept; radius = size × 0.8
 * - color:       carried through as-is
 */
export function catalogBeadToBeadState(catalogBead: CatalogBead): BeadState {
  return {
    id: `bead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    catalogBeadId: catalogBead.id,
    type: catalogBead.material,
    radius: catalogBead.size * 0.8,
    color: catalogBead.color,
    shape: catalogBead.shape,
  };
}
