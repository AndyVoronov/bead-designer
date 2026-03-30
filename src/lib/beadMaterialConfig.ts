import type { BeadType } from "@/types/bead";

// ── Material configuration ──────────────────────────────────────────────────

export interface BeadMaterialConfig {
  /** Surface roughness — 0 = mirror-like, 1 = fully diffuse. */
  roughness: number;
  /** Metalness — 0 = dielectric, 1 = full metal. */
  metalness: number;
  /** Bump map intensity (0 = no bump). Used for wood grain and knit texture. */
  bumpScale: number;
  /** Environment map intensity — controls reflection strength. */
  envMapIntensity: number;
}

/**
 * PBR material presets for each bead type.
 *
 * These constants differentiate bead appearance without PNG textures:
 * - wood:   matte, absorbs light, subtle bump for wood grain
 * - silicone: smooth, glossy, strong reflections
 * - knit:   very rough, absorbs reflections, pronounced bump for knit texture
 * - plastic: mid-range, slight metallic sheen
 */
export const BEAD_MATERIAL_CONFIGS: Record<BeadType, BeadMaterialConfig> = {
  wood: {
    roughness: 0.75,
    metalness: 0.0,
    bumpScale: 0.02,
    envMapIntensity: 0.8,
  },
  silicone: {
    roughness: 0.2,
    metalness: 0.05,
    bumpScale: 0.0,
    envMapIntensity: 1.2,
  },
  knit: {
    roughness: 0.9,
    metalness: 0.0,
    bumpScale: 0.03,
    envMapIntensity: 0.5,
  },
  plastic: {
    roughness: 0.35,
    metalness: 0.15,
    bumpScale: 0.0,
    envMapIntensity: 1.0,
  },
};

/** Look up the material config for a given bead type. */
export function getBeadMaterialConfig(type: BeadType): BeadMaterialConfig {
  return BEAD_MATERIAL_CONFIGS[type];
}
