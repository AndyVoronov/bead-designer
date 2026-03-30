import { create } from "zustand";

interface DragState {
  isDragging: boolean;
  setDragging: (v: boolean) => void;
}

/**
 * Shared drag flag that bridges R3F pointer events (on meshes) and
 * OrbitControls (DOM-level). Set `true` while a bead is being dragged so
 * OrbitControls can disable itself via `enabled={!isDragging}`.
 */
export const useDragStore = create<DragState>((set) => ({
  isDragging: false,
  setDragging: (v) => set({ isDragging: v }),
}));
