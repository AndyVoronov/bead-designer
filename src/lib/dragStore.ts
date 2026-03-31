import { create } from "zustand";

interface DragState {
  /** True while any bead is being dragged. */
  isDragging: boolean;
  setDragging: (v: boolean) => void;

  /** ID of the bead currently being dragged (null when not dragging). */
  draggedBeadId: string | null;
  setDraggedBeadId: (id: string | null) => void;

  /** Index where the dragged bead would be inserted on drop (-1 = no target). */
  dropTargetIndex: number;
  setDropTargetIndex: (index: number) => void;
}

export const useDragStore = create<DragState>((set) => ({
  isDragging: false,
  setDragging: (v) => set({ isDragging: v, draggedBeadId: v ? undefined : null, dropTargetIndex: -1 }),
  draggedBeadId: null,
  setDraggedBeadId: (id) => set({ draggedBeadId: id }),
  dropTargetIndex: -1,
  setDropTargetIndex: (index) => set({ dropTargetIndex: index }),
}));
