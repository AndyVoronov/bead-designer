"use client";

import { useRef, useMemo } from "react";
import { useFrame, useThree, extend } from "@react-three/fiber";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import * as THREE from "three";
import type { VerletRope } from "@/lib/verlet/VerletRope";

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
  /** The Verlet rope instance — positions come from its particles. */
  rope: VerletRope;
  /** Thread colour. */
  color: string;
  /** Number of beads — used to skip rendering if rope isn't ready yet. */
  beadCount: number;
  /** MeshLine width in world units (default 0.015). */
  lineWidth?: number;
}

// Reusable curve and points array to avoid allocation every frame
const _curvePoints: THREE.Vector3[] = [];
for (let i = 0; i < 50; i++) {
  _curvePoints.push(new THREE.Vector3());
}
let _curve: THREE.CatmullRomCurve3 | null = null;
let _curvePointCount = 0;

function getCurve(count: number): THREE.CatmullRomCurve3 {
  if (!_curve || _curvePointCount !== count) {
    _curve = new THREE.CatmullRomCurve3(
      _curvePoints.slice(0, count),
      false,
      "catmullrom",
      0.5,
    );
    _curvePointCount = count;
  }
  return _curve;
}

/**
 * Renders a smooth MeshLine curve that passes through all rope particles
 * (anchor → bead0 → bead1 → …).
 *
 * Updated every frame from VerletRope particle positions.
 */
export function ThreadLine({
  rope,
  color,
  beadCount,
  lineWidth = 0.015,
}: ThreadLineProps) {
  const geoRef = useRef<MeshLineGeometry>(null);
  const { size } = useThree();

  const resolution = useMemo(
    () => new THREE.Vector2(size.width, size.height),
    [size.width, size.height],
  );

  useFrame(() => {
    if (!geoRef.current) return;
    if (rope.particles.length < 2) return;

    const count = Math.min(rope.particles.length, 50);

    // Copy particle positions into reusable array
    for (let i = 0; i < count; i++) {
      _curvePoints[i].copy(rope.particles[i].position);
    }

    // Get curve (reuses or creates)
    const curve = getCurve(count);

    // Sample the curve
    const sampleCount = Math.min(count * 3, 48);
    const pts = curve.getPoints(sampleCount);
    geoRef.current.setPoints(pts);
  });

  return (
    <mesh>
      <meshLineGeometry ref={geoRef} />
      <meshLineMaterial
        color={color}
        lineWidth={lineWidth}
        resolution={resolution}
        sizeAttenuation
      />
    </mesh>
  );
}
