"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useDesignStore } from "@/stores/useDesignStore";
import { EditorToolbar } from "./EditorToolbar";
import { BeadCatalogPanel } from "./BeadCatalogPanel";

// Dynamically import Scene to avoid SSR issues with Three.js / WebGL
const Scene = dynamic(() => import("@/components/scene/Scene"), {
  ssr: false,
});

/**
 * Main editor layout: full-viewport 3D canvas with bottom toolbar and
 * slide-up catalog bottom sheet.
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

      {/* ── Catalog Bottom Sheet ─────────────────────────────────── */}
      <BeadCatalogPanel
        isOpen={catalogOpen}
        onClose={() => setCatalogOpen(false)}
      />

      {/* ── Bottom Toolbar ───────────────────────────────────────── */}
      <EditorToolbar
        catalogOpen={catalogOpen}
        onToggleCatalog={() => setCatalogOpen((prev) => !prev)}
      />
    </div>
  );
}
