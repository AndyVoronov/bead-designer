/**
 * 3D scene for the bead designer.
 *
 * Physics: Verlet rope simulation (no Rapier/RigidBody).
 * The BeadChain component owns the simulation and runs it in useFrame.
 */
"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  ContactShadows,
} from "@react-three/drei";
import { BeadChain } from "./BeadChain";
import AdaptiveRenderer from "./AdaptiveRenderer";
import { useDragStore } from "@/lib/dragStore";
import { useDesignStore } from "@/stores/useDesignStore";
import type { BeadState } from "@/types/bead";

export interface SceneProps {
  /** Array of bead descriptors — drives chain composition. */
  beads: BeadState[];
  /** Currently selected bead ID for highlight rendering (T05). */
  selectedBeadId?: string | null;
}

/**
 * OrbitControls wrapper that reads the shared drag flag and disables
 * orbit rotation while a bead is being dragged.
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
 * Root 3D scene: Canvas → BeadChain → ThreadLine.
 * SSR-safe (loaded via SceneLoader with dynamic ssr:false).
 */
export default function Scene({ beads, selectedBeadId }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 1, 7], fov: 50 }}
      shadows
      onPointerMissed={() => useDesignStore.getState().selectBead(null)}
      style={{ background: "linear-gradient(180deg, #f0f4f8 0%, #d9e2ec 100%" }}
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

        {/* Bead chain with Verlet rope physics */}
        <BeadChain
          beads={beads}
          anchorPosition={[0, 3, 0]}
          selectedBeadId={selectedBeadId}
        />

        {/* Soft ground shadow */}
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
    </Canvas>
  );
}
