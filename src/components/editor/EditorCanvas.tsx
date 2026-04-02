"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useDesignStore } from "@/stores/useDesignStore";
import { EditorToolbar } from "./EditorToolbar";
import { BeadCatalogPanel } from "./BeadCatalogPanel";
import { SavedDesignsPanel } from "./SavedDesignsPanel";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";

// Dynamically import Scene to avoid SSR issues with Three.js / WebGL
const Scene = dynamic(() => import("@/components/scene/Scene"), {
  ssr: false,
});

/**
 * Main editor layout: full-viewport 3D canvas with bottom toolbar,
 * slide-up catalog bottom sheet, and saved designs panel.
 *
 * EditorCanvas is the Zustand subscriber that bridges store ↔ scene.
 * The Scene component stays "dumb" — it receives beads as a prop.
 */
export default function EditorCanvas() {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [savedDesignsOpen, setSavedDesignsOpen] = useState(false);

  // Unsaved changes dialog state
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const pendingDesignId = useRef<number | null>(null);
  const pendingDesignCode = useRef<string | null>(null);
  const pendingCatalogIds = useRef<string[] | null>(null);

  // Subscribe to design store
  const beads = useDesignStore((s) => s.beads);
  const selectedBeadId = useDesignStore((s) => s.selectedBeadId);

  /**
   * Check if current design has unsaved changes and prompt user.
   * Returns true if safe to proceed (no beads or user chose to discard).
   *
   * Used by SavedDesignsPanel and TemplateBrowser before loading a new design.
   */
  const checkBeforeLoad = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (useDesignStore.getState().beads.length === 0) {
        resolve(true);
        return;
      }

      // There are beads — ask user what to do
      setUnsavedDialogOpen(true);

      // Store the resolve function so the dialog can call it
      // We use a ref pattern — the dialog callbacks will trigger the actual load
      pendingDesignId.current = null; // will be set by the caller
      pendingDesignCode.current = null;
      pendingCatalogIds.current = null;

      // Temporarily store the resolve to call it later
      (window as unknown as Record<string, (v: boolean) => void>).__unsavedResolve = resolve;
    });
  }, []);

  /**
   * Called from SavedDesignsPanel when user clicks a design.
   * Implements the full flow: unsaved check → load.
   */
  const handleBeforeLoadDesign = useCallback(async (): Promise<boolean> => {
    if (useDesignStore.getState().beads.length === 0) {
      return true;
    }

    return new Promise((resolve) => {
      setUnsavedDialogOpen(true);
      (window as unknown as Record<string, (v: boolean) => void>).__unsavedResolve = resolve;
    });
  }, []);

  /**
   * Resolve unsaved dialog — user chose to discard
   */
  const handleDiscard = useCallback(() => {
    setUnsavedDialogOpen(false);
    const resolve = (window as unknown as Record<string, (v: boolean) => void>).__unsavedResolve;
    if (resolve) {
      resolve(true);
      delete (window as unknown as Record<string, (v: boolean) => void>).__unsavedResolve;
    }
  }, []);

  /**
   * Resolve unsaved dialog — user chose to save then load
   */
  const handleSaveAndLoad = useCallback(() => {
    setUnsavedDialogOpen(false);
    const resolve = (window as unknown as Record<string, (v: boolean) => void>).__unsavedResolve;
    if (resolve) {
      // The UnsavedChangesDialog already saved — just confirm
      resolve(true);
      delete (window as unknown as Record<string, (v: boolean) => void>).__unsavedResolve;
    }
  }, []);

  /**
   * Resolve unsaved dialog — user cancelled
   */
  const handleCancel = useCallback(() => {
    setUnsavedDialogOpen(false);
    const resolve = (window as unknown as Record<string, (v: boolean) => void>).__unsavedResolve;
    if (resolve) {
      resolve(false);
      delete (window as unknown as Record<string, (v: boolean) => void>).__unsavedResolve;
    }
  }, []);

  // Close catalog when saved designs opens (and vice versa)
  const handleToggleSavedDesigns = useCallback(() => {
    setSavedDesignsOpen((prev) => {
      if (!prev) setCatalogOpen(false);
      return !prev;
    });
  }, []);

  const handleToggleCatalog = useCallback(() => {
    setCatalogOpen((prev) => {
      if (!prev) setSavedDesignsOpen(false);
      return !prev;
    });
  }, []);

  return (
    <div className="relative w-screen h-screen flex flex-col overflow-hidden">
      {/* ── 3D Canvas Area ────────────────────────────────────────── */}
      <div className="canvas-container flex-1 w-full relative">
        <Scene beads={beads} selectedBeadId={selectedBeadId} />

        {/* ── Back to site button ─────────────────────────────── */}
        <a
          href="/"
          className="absolute top-4 left-4 z-20 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl bg-white/70 backdrop-blur-md text-gray-700 hover:bg-white/90 transition-all duration-150 cursor-pointer select-none active:scale-95 border border-gray-200/50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span>На сайт</span>
        </a>
      </div>

      {/* ── Catalog Bottom Sheet ─────────────────────────────────── */}
      <BeadCatalogPanel
        isOpen={catalogOpen}
        onClose={() => setCatalogOpen(false)}
      />

      {/* ── Saved Designs Bottom Sheet ───────────────────────────── */}
      <SavedDesignsPanel
        isOpen={savedDesignsOpen}
        onClose={() => setSavedDesignsOpen(false)}
        onBeforeLoadDesign={handleBeforeLoadDesign}
      />

      {/* ── Unsaved Changes Dialog ───────────────────────────────── */}
      <UnsavedChangesDialog
        open={unsavedDialogOpen}
        onCancel={handleCancel}
        onDiscard={handleDiscard}
        onSaveAndLoad={handleSaveAndLoad}
      />

      {/* ── Bottom Toolbar ───────────────────────────────────────── */}
      <EditorToolbar
        catalogOpen={catalogOpen}
        onToggleCatalog={handleToggleCatalog}
        savedDesignsOpen={savedDesignsOpen}
        onToggleSavedDesigns={handleToggleSavedDesigns}
      />
    </div>
  );
}
