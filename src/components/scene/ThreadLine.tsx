"use client";

import { useRef, useMemo } from "react";
import { useFrame, useThree, extend } from "@react-three/fiber";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import * as THREE from "three";
import type { RapierRigidBody } from "@react-three/rapier";

// Register meshline classes with R3F's renderer
extend({ MeshLineGeometry, MeshLineMaterial });

// Augment R3F JSX types so TypeScript recognises <meshLineGeometry> / <meshLineMaterial>
declare module "@react-three/fiber" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface ThreeElements {
    meshLineGeometry: ThreeElements["bufferGeometry"] & {
      ref?: React.Ref<MeshLineGeometry>;
      args?: ConstructorParameters<typeof MeshLineGeometry>;
    };
    // MeshLineMaterial extends ShaderMaterial with custom props (color, lineWidth, resolution, etc.)
    meshLineMaterial: {
      ref?: React.Ref<MeshLineMaterial>;
      color?: string | number | THREE.Color;
      lineWidth?: number;
      resolution?: THREE.Vector2;
      sizeAttenuation?: boolean;
      opacity?: number;
      dashArray?: number;
      dashOffset?: number;
      dashRatio?: number;
      useDash?: number;
      useGradient?: number;
      visibility?: number;
      map?: THREE.Texture;
      alphaMap?: THREE.Texture;
      transparent?: boolean;
      attach?: string;
      args?: ConstructorParameters<typeof MeshLineMaterial>;
    };
  }
}

export interface ThreadLineProps {
  /** World-space position of the fixed anchor (first point on the curve). */
  anchorPosition: [number, number, number];
  /** Ref to the anchor's RapierRigidBody (for reading live position). */
  anchorRef: React.RefObject<RapierRigidBody | null>;
  /** Stable ref objects for each bead, indexed by position. */
  beadRefs: React.RefObject<RapierRigidBody | null>[];
  /** Number of beads — geometry update is skipped until all refs are populated. */
  beadCount: number;
  /** Thread colour. */
  color: string;
  /** MeshLine width in world units (default 0.015). */
  lineWidth?: number;
}

// Reusable vectors to avoid GC pressure in useFrame
const _v = new THREE.Vector3();

/**
 * Renders a smooth MeshLine curve that passes through the anchor and every bead.
 * Updated every frame from Rapier body translation positions.
 */
export function ThreadLine({
  anchorPosition,
  anchorRef,
  beadRefs,
  beadCount,
  color,
  lineWidth = 0.015,
}: ThreadLineProps) {
  const geoRef = useRef<MeshLineGeometry>(null);
  const matRef = useRef<MeshLineMaterial>(null);
  const { size } = useThree();

  // Keep resolution in sync with the canvas (needed by MeshLineMaterial shader)
  const resolution = useMemo(
    () => new THREE.Vector2(size.width, size.height),
    [size.width, size.height],
  );

  // Reusable points array to avoid allocation every frame
  const points = useMemo(() => [] as THREE.Vector3[], []);

  useFrame(() => {
    if (!geoRef.current) return;

    // Wait until every bead ref is populated
    if (beadRefs.length < beadCount) return;
    for (let i = 0; i < beadCount; i++) {
      if (!beadRefs[i].current) return;
    }

    // Build point list: anchor position → bead0 → bead1 → …
    points.length = 0;

    // Prefer live anchor position from physics (falls back to static prop)
    const anchorBody = anchorRef.current;
    if (anchorBody) {
      const p = anchorBody.translation();
      _v.set(p.x, p.y, p.z);
    } else {
      _v.set(anchorPosition[0], anchorPosition[1], anchorPosition[2]);
    }
    points.push(_v.clone());

    for (let i = 0; i < beadCount; i++) {
      const body = beadRefs[i].current!;
      const p = body.translation();
      points.push(new THREE.Vector3(p.x, p.y, p.z));
    }

    // CatmullRom spline through all points → smooth thread
    const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
    geoRef.current.setPoints(curve.getPoints(32));
  });

  return (
    <mesh>
      <meshLineGeometry ref={geoRef} />
      <meshLineMaterial
        ref={matRef}
        color={color}
        lineWidth={lineWidth}
        resolution={resolution}
        sizeAttenuation
      />
    </mesh>
  );
}
