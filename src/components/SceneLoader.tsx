"use client";

import dynamic from "next/dynamic";
import { useBeadChain } from "@/hooks/useBeadChain";

// Dynamically import the Scene to avoid SSR issues with Three.js / WebGL
const Scene = dynamic(() => import("@/components/scene/Scene"), {
  ssr: false,
});

/**
 * Client-side wrapper that owns bead chain state and passes it to the Scene.
 * Also renders minimal overlay UI for demo purposes.
 */
export default function SceneLoader() {
  const { beads, addBead, removeLast, reset } = useBeadChain();

  return (
    <div className="relative w-screen h-screen">
      {/* 3D Canvas fills the viewport — touch-action: none prevents
          browser scroll/zoom gestures on touch devices */}
      <div className="canvas-container w-full h-full">
        <Scene beads={beads} />
      </div>

      {/* ── Overlay UI ──────────────────────────────────────────────── */}

      {/* Title */}
      <div className="absolute top-4 left-4 select-none pointer-events-none">
        <h1 className="text-lg font-semibold text-gray-700 tracking-tight">
          Bead Chain
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Drag beads to interact
        </p>
      </div>

      {/* Controls panel */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-white/70 backdrop-blur-md shadow-lg px-4 py-2 border border-gray-200/50">
        <span className="text-sm text-gray-500 mr-2">{beads.length} beads</span>

        <button
          onClick={() => addBead()}
          className="px-3 py-1.5 text-sm font-medium rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
        >
          + Add
        </button>

        <button
          onClick={removeLast}
          disabled={beads.length === 0}
          className="px-3 py-1.5 text-sm font-medium rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          − Remove
        </button>

        <button
          onClick={reset}
          className="px-3 py-1.5 text-sm font-medium rounded-full bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          ↺ Reset
        </button>
      </div>
    </div>
  );
}
