"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useDesignStore } from "@/stores/useDesignStore";
import { EditorToolbar } from "./EditorToolbar";

// Dynamically import Scene to avoid SSR issues with Three.js / WebGL
const Scene = dynamic(() => import("@/components/scene/Scene"), {
  ssr: false,
});

/**
 * Main editor layout: full-viewport 3D canvas with bottom toolbar and
 * slide-up catalog panel placeholder (T04 fills in the real catalog UI).
 *
 * EditorCanvas is the Zustand subscriber that bridges store ↔ scene.
 * The Scene component stays "dumb" — it receives beads as a prop.
 */
export default function EditorCanvas() {
  const [catalogOpen, setCatalogOpen] = useState(false);

  // Subscribe to design store
  const beads = useDesignStore((s) => s.beads);
  const selectedBeadId = useDesignStore((s) => s.selectedBeadId);

  return (
    <div className="relative w-screen h-screen flex flex-col overflow-hidden">
      {/* ── 3D Canvas Area ────────────────────────────────────────── */}
      {/* touch-action: none on canvas-container prevents browser
          scroll/zoom gestures on touch devices */}
      <div className="canvas-container flex-1 w-full relative">
        <Scene beads={beads} selectedBeadId={selectedBeadId} />
      </div>

      {/* ── Catalog Panel Placeholder ────────────────────────────── */}
      {/* T04 will replace this with the real catalog bottom sheet */}
      {catalogOpen && (
        <div className="flex-shrink-0 bg-white/90 backdrop-blur-md border-t border-gray-200/50 animate-slide-up">
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm select-none">
            Каталог — загрузка…
          </div>
        </div>
      )}

      {/* ── Bottom Toolbar ───────────────────────────────────────── */}
      <EditorToolbar
        catalogOpen={catalogOpen}
        onToggleCatalog={() => setCatalogOpen((prev) => !prev)}
      />
    </div>
  );
}
