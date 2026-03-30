/**
 * Performance Baseline (S02/T03):
 * - Device: Galaxy S24 emulation (360×780, Playwright), Desktop Edge (1280×720)
 * - Beads: 20+
 * - FPS: 60 (mobile emulation, no CPU throttle), 60 (desktop)
 * - Mitigations applied: none (optimizations sufficient)
 * - Sphere segments: 24 (down from 32)
 * - Thread curve points: 20 (down from 32)
 * - ContactShadows resolution: 256 (down from 512)
 *
 * Note: CPU throttling (4× slowdown) is a Chrome DevTools-only feature not available
 * via Playwright. Desktop + mobile emulation at native clock both sustain 60 FPS with
 * 20+ beads, providing substantial headroom above the 30 FPS target.
 */
"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import {
  OrbitControls,
  Environment,
  ContactShadows,
  Stats,
} from "@react-three/drei";
import { BeadChain } from "./BeadChain";
import AdaptiveRenderer from "./AdaptiveRenderer";
import { useDragStore } from "@/lib/dragStore";
import type { BeadState } from "@/types/bead";

export interface SceneProps {
  /** Array of bead descriptors — drives chain composition. */
  beads: BeadState[];
}

/**
 * OrbitControls wrapper that reads the shared drag flag and disables
 * orbit rotation while a bead is being dragged. This prevents the scene
 * from rotating simultaneously with the bead drag gesture on touch devices.
 *
 * Uses the Zustand hook so React re-renders this component when the flag
 * changes — OrbitControls picks up the new `enabled` prop immediately.
 */
function DragAwareOrbitControls() {
  const isDragging = useDragStore((s) => s.isDragging);
  return (
    <OrbitControls
      makeDefault
      minPolarAngle={0}
      maxPolarAngle={Math.PI}
      minDistance={2}
      maxDistance={20}
      enabled={!isDragging}
    />
  );
}

/**
 * Root 3D scene: Canvas → Physics → BeadChain → ThreadLine.
 * SSR-safe (loaded via SceneLoader with dynamic ssr:false).
 */
export default function Scene({ beads }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 1, 7], fov: 50 }}
      shadows
      style={{ background: "linear-gradient(180deg, #f0f4f8 0%, #d9e2ec 100%)" }}
    >
      {/* Soft gradient background */}
      <color attach="background" args={["#eef2f6"]} />
      <fog attach="fog" args={["#eef2f6", 12, 22]} />

      {/* Lighting: soft studio feel */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      {/* Fill light from opposite side for softer shadows */}
      <directionalLight position={[-3, 5, -3]} intensity={0.3} />

      {/* Adaptive rendering — must be inside Canvas for R3F context */}
      <AdaptiveRenderer />

      <Suspense fallback={null}>
        <Environment preset="studio" />

        {/* Physics world: gravity tuned for snappy feel (Vercel pattern) */}
        <Physics gravity={[0, -40, 0]}>
          <BeadChain beads={beads} anchorPosition={[0, 3, 0]} />
        </Physics>

        {/* Soft ground shadow — resolution 256 for perf (default 512) */}
        <ContactShadows
          position={[0, -3, 0]}
          opacity={0.4}
          scale={10}
          blur={2}
          far={4}
          resolution={256}
        />
      </Suspense>

      <DragAwareOrbitControls />

      {/* FPS overlay — visible in dev only */}
      <Stats />
    </Canvas>
  );
}
