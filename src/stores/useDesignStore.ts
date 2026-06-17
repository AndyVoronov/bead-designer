import { create } from "zustand";
import type { BeadState } from "@/types/bead";
import { CATALOG_BEADS, getCatalogBead } from "@/data/catalogBeads";
import { catalogBeadToBeadState } from "@/lib/bead-utils";

// ── Default chain ────────────────────────────────────────────────────────────
// Same 7 default beads as useBeadChain's DEFAULT_BEADS.

const DEFAULT_BEADS: BeadState[] = [
  { id: "bead-1", type: "wood", radius: 0.2, color: "#D4A574" },
  { id: "bead-2", type: "silicone", radius: 0.18, color: "#FF6B9D" },
  { id: "bead-3", type: "wood", radius: 0.22, color: "#C4956A" },
  { id: "bead-4", type: "plastic", radius: 0.19, color: "#6EC1E4" },
  { id: "bead-5", type: "wood", radius: 0.21, color: "#B8860B" },
  { id: "bead-6", type: "silicone", radius: 0.17, color: "#E8A0BF" },
  { id: "bead-7", type: "wood", radius: 0.2, color: "#DEB887" },
];

const MAX_CHAIN_LENGTH = 40;

// ── Store interface ──────────────────────────────────────────────────────────

export interface DesignState {
  beads: BeadState[];
  selectedBeadId: string | null;
  productType: "pacifier-holder";

  addBead: (catalogBeadId: string) => void;
  removeBead: (id: string) => void;
  removeSelected: () => void;
  selectBead: (id: string | null) => void;
  resetDesign: () => void;
  loadFromCatalogIds: (ids: string[]) => void;
  clearDesign: () => void;
  reorderBead: (idA: string, idB: string) => void;
  /** Move a bead from its current position to targetIndex. */
  moveBead: (beadId: string, targetIndex: number) => void;
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useDesignStore = create<DesignState>((set, get) => ({
  beads: DEFAULT_BEADS,
  selectedBeadId: null,
  productType: "pacifier-holder",

  addBead: (catalogBeadId: string) => {
    if (get().beads.length >= MAX_CHAIN_LENGTH) return;

    const catalogBead = CATALOG_BEADS.find((b) => b.id === catalogBeadId);
    if (!catalogBead) return;

    const beadState = catalogBeadToBeadState(catalogBead);
    set((state) => ({ beads: [...state.beads, beadState] }));
  },

  removeBead: (id: string) => {
    set((state) => {
      const removed = state.beads.find((b) => b.id === id);
      return {
        beads: state.beads.filter((b) => b.id !== id),
        selectedBeadId: removed?.id === state.selectedBeadId ? null : state.selectedBeadId,
      };
    });
  },

  removeSelected: () => {
    const { selectedBeadId } = get();
    if (!selectedBeadId) return;

    set((state) => ({
      beads: state.beads.filter((b) => b.id !== selectedBeadId),
      selectedBeadId: null,
    }));
  },

  selectBead: (id: string | null) => {
    set({ selectedBeadId: id });
  },

  resetDesign: () => {
    set({ beads: DEFAULT_BEADS, selectedBeadId: null });
  },

  loadFromCatalogIds: (ids: string[]) => {
    const beads: BeadState[] = [];
    for (const id of ids) {
      const catalogBead = getCatalogBead(id);
      if (catalogBead) {
        beads.push(catalogBeadToBeadState(catalogBead));
      }
    }
    set({ beads, selectedBeadId: null });
  },

  clearDesign: () => {
    set({ beads: [], selectedBeadId: null });
  },

  reorderBead: (idA: string, idB: string) => {
    set((state) => {
      const idxA = state.beads.findIndex((b) => b.id === idA);
      const idxB = state.beads.findIndex((b) => b.id === idB);
      if (idxA < 0 || idxB < 0) return state;

      const newBeads = [...state.beads];
      [newBeads[idxA], newBeads[idxB]] = [newBeads[idxB], newBeads[idxA]];
      return { beads: newBeads };
    });
  },

  moveBead: (beadId: string, targetIndex: number) => {
    set((state) => {
      const fromIdx = state.beads.findIndex((b) => b.id === beadId);
      if (fromIdx < 0) return state;
      if (targetIndex < 0 || targetIndex >= state.beads.length) return state;
      if (fromIdx === targetIndex) return state;

      const newBeads = [...state.beads];
      const [removed] = newBeads.splice(fromIdx, 1);
      // Adjust target index after removal
      const insertAt = fromIdx < targetIndex ? targetIndex - 1 : targetIndex;
      newBeads.splice(insertAt, 0, removed);
      return { beads: newBeads };
    });
  },
}));
