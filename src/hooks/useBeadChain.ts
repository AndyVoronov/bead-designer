"use client";

import { useState, useCallback } from "react";
import type { BeadId, BeadType, BeadState } from "@/types/bead";

// ── Bead type defaults ───────────────────────────────────────────────────────

export interface BeadTypeConfig {
  radius: number;
  color: string;
}

export const BEAD_TYPE_DEFAULTS: Record<BeadType, BeadTypeConfig> = {
  wood: { radius: 0.2, color: "#D4A574" },
  silicone: { radius: 0.18, color: "#FF6B9D" },
  knit: { radius: 0.22, color: "#E8D5B7" },
  plastic: { radius: 0.19, color: "#6EC1E4" },
};

// ── Default chain ────────────────────────────────────────────────────────────

const DEFAULT_BEADS: BeadState[] = [
  { id: "bead-1", type: "wood", radius: 0.2, color: "#D4A574" },
  { id: "bead-2", type: "silicone", radius: 0.18, color: "#FF6B9D" },
  { id: "bead-3", type: "wood", radius: 0.22, color: "#C4956A" },
  { id: "bead-4", type: "plastic", radius: 0.19, color: "#6EC1E4" },
  { id: "bead-5", type: "wood", radius: 0.21, color: "#B8860B" },
  { id: "bead-6", type: "silicone", radius: 0.17, color: "#E8A0BF" },
  { id: "bead-7", type: "wood", radius: 0.2, color: "#DEB887" },
];

/** Cycle through bead types for variety when adding. */
const ADD_CYCLE: BeadType[] = ["wood", "silicone", "plastic", "knit"];
let addCounter = 0;

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UseBeadChainReturn {
  beads: BeadState[];
  addBead: (type?: BeadType) => void;
  removeBead: (id: BeadId) => void;
  removeLast: () => void;
  reset: () => void;
}

/**
 * Manages the bead chain state: array of BeadState with add/remove/reset.
 *
 * This is the primary state interface for the chain — downstream slices (S03)
 * will extend this with selection, reordering, and property editing.
 */
export function useBeadChain(): UseBeadChainReturn {
  const [beads, setBeads] = useState<BeadState[]>(DEFAULT_BEADS);

  const addBead = useCallback((type?: BeadType) => {
    const beadType = type ?? ADD_CYCLE[addCounter++ % ADD_CYCLE.length];
    const config = BEAD_TYPE_DEFAULTS[beadType];
    const newBead: BeadState = {
      id: `bead-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: beadType,
      radius: config.radius,
      color: config.color,
    };
    setBeads((prev) => [...prev, newBead]);
  }, []);

  const removeBead = useCallback((id: BeadId) => {
    setBeads((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const removeLast = useCallback(() => {
    setBeads((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
  }, []);

  const reset = useCallback(() => {
    setBeads(DEFAULT_BEADS);
  }, []);

  return { beads, addBead, removeBead, removeLast, reset };
}
