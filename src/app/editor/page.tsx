"use client";

import { useEffect } from "react";
import { useDesignStore } from "@/stores/useDesignStore";
import EditorCanvas from "@/components/editor/EditorCanvas";

/**
 * Blank editor page for "Начать с нуля" (start from scratch).
 *
 * Clears the store on mount to ensure no leftover beads from a previous
 * session leak through, then renders the EditorCanvas.
 */
export default function EditorPage() {
  useEffect(() => {
    useDesignStore.getState().clearDesign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <EditorCanvas />;
}
