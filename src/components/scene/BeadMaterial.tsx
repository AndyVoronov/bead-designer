"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { BeadType } from "@/types/bead";
import { getBeadMaterialConfig } from "@/lib/beadMaterialConfig";

// ── Props ────────────────────────────────────────────────────────────────────

export interface BeadMaterialProps {
  type: BeadType;
  color: string;
}

// ── Procedural bump texture ──────────────────────────────────────────────────

/**
 * Generates a small 16×16 grayscale noise canvas for bump mapping.
 * Produces a subtle, tileable grain pattern suitable for wood and knit.
 */
function createProceduralBumpTexture(): THREE.CanvasTexture {
  const size = 16;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const imageData = ctx.createImageData(size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const value = Math.random() * 128 + 64; // range 64–192
    imageData.data[i] = value;     // R
    imageData.data[i + 1] = value; // G
    imageData.data[i + 2] = value; // B
    imageData.data[i + 3] = 255;   // A
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Type-specific PBR material for a single bead.
 *
 * Applies roughness, metalness, envMapIntensity from `beadMaterialConfig`.
 * For types with `bumpScale > 0` (wood, knit), attaches a procedural
 * bump texture generated from a 16×16 noise canvas.
 *
 * When PNG textures become available (S03/S06 admin uploads), `useTexture`
 * from drei can replace the procedural bump — just pass a `textureUrl` prop
 * and load it with `<Suspense>` boundary in the parent.
 */
export function BeadMaterial({ type, color }: BeadMaterialProps) {
  const config = useMemo(() => getBeadMaterialConfig(type), [type]);

  // Create a reusable procedural bump texture for types that need it.
  // useMemo ensures a single texture instance is shared across renders.
  const bumpMap = useMemo(() => {
    if (config.bumpScale > 0) {
      return createProceduralBumpTexture();
    }
    return undefined;
  }, [config.bumpScale]);

  return (
    <meshStandardMaterial
      color={color}
      roughness={config.roughness}
      metalness={config.metalness}
      envMapIntensity={config.envMapIntensity}
      bumpMap={bumpMap}
      bumpScale={config.bumpScale}
    />
  );
}
