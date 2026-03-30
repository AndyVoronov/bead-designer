"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { OrbitControls, Environment, ContactShadows, Stats } from "@react-three/drei";
import { BeadChain } from "./BeadChain";
import type { BeadState } from "@/types/bead";

/** 7 demo beads with alternating wood / silicone colours. */
const defaultBeads: BeadState[] = [
  { id: "bead-1", type: "wood", radius: 0.2, color: "#D4A574" },
  { id: "bead-2", type: "silicone", radius: 0.18, color: "#FF6B9D" },
  { id: "bead-3", type: "wood", radius: 0.22, color: "#C4956A" },
  { id: "bead-4", type: "plastic", radius: 0.19, color: "#6EC1E4" },
  { id: "bead-5", type: "wood", radius: 0.21, color: "#B8860B" },
  { id: "bead-6", type: "silicone", radius: 0.17, color: "#E8A0BF" },
  { id: "bead-7", type: "wood", radius: 0.2, color: "#DEB887" },
];

/**
 * Root 3D scene: Canvas → Physics → BeadChain → ThreadLine.
 * SSR-safe (loaded via SceneLoader with dynamic ssr:false).
 */
export default function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 1, 7], fov: 50 }}
      shadows
      style={{ background: "#87ceeb" }}
    >
      <color attach="background" args={["#87ceeb"]} />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <Suspense fallback={null}>
        <Environment preset="city" />

        {/* Physics world: gravity tuned for snappy feel (Vercel pattern) */}
        <Physics gravity={[0, -40, 0]}>
          <BeadChain
            beads={defaultBeads}
            anchorPosition={[0, 3, 0]}
          />
        </Physics>

        {/* Soft ground shadow */}
        <ContactShadows
          position={[0, -3, 0]}
          opacity={0.4}
          scale={10}
          blur={2}
          far={4}
        />
      </Suspense>

      <OrbitControls
        makeDefault
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
        minDistance={2}
        maxDistance={20}
      />

      {/* FPS overlay — visible in dev only */}
      <Stats />
    </Canvas>
  );
}
