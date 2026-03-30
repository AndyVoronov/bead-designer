---
estimated_steps: 6
estimated_files: 6
---

# T01: Add mobile viewport, adaptive rendering, and OrbitControls-drag conflict fix

**Slice:** S02 — Мобильный рендеринг + PBR-материалы
**Milestone:** M001

## Description

Establishes the mobile rendering foundation: proper viewport meta, touch-action CSS, adaptive quality (AdaptiveDpr + AdaptiveEvents + PerformanceMonitor), and fixes the OrbitControls-during-drag conflict that prevents touch drag from working. Without these, no mobile testing or interaction is possible.

**Key problem:** R3F pointer events (onPointerDown on a mesh) fire on touch devices via the Pointer Events API — this part already works. However, Three.js OrbitControls attaches its own DOM-level event listeners to the canvas, so when the user touches a bead, BOTH the bead drag handler AND OrbitControls handle the same touch gesture. `e.stopPropagation()` in R3F events does NOT stop OrbitControls because it listens at the DOM level, not the R3F event level. The fix is programmatic: a shared Zustand `dragStore` where `useDrag` sets `isDragging = true` and OrbitControls reads `enabled={!isDragging}`.

**Skills:** Load `react-best-practices` for rerender-optimization patterns on the drag state.

## Steps

1. **Add viewport meta to `src/app/layout.tsx`** — Use Next.js Metadata API to set viewport: `viewport: { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false }`. Export `metadata` and `viewport` as separate named exports (Next.js 16 convention). This prevents pinch-zoom from interfering with 3D gestures.

2. **Add touch-action CSS to `src/app/globals.css`** — Add `html, body { touch-action: none; }` and `.canvas-container { touch-action: none; }`. Also add `overflow: hidden` on `html` (body already has it). This tells the browser not to intercept touch events for scrolling/zooming on the canvas. Wrap the Scene in a `<div className="canvas-container">` in `src/components/SceneLoader.tsx` to target this class.

3. **Create `src/lib/dragStore.ts`** — Tiny Zustand store:
   ```ts
   import { create } from 'zustand';
   interface DragState { isDragging: boolean; setDragging: (v: boolean) => void; }
   export const useDragStore = create<DragState>((set) => ({
     isDragging: false,
     setDragging: (v) => set({ isDragging: v }),
   }));
   ```
   No need for Zustand middleware — this is a 1-field store used only for cross-component communication.

4. **Modify `src/components/scene/DragControls.tsx`** — Import `useDragStore`. In `onPointerDown`, after `e.stopPropagation()`, call `useDragStore.getState().setDragging(true)`. In `onPointerUp`, before restoring cursor, call `useDragStore.getState().setDragging(false)`. Use `getState()` (not the hook) to avoid subscribing to state changes in this non-React callback context — DragControls doesn't re-render when drag state changes, and it shouldn't.

5. **Create `src/components/scene/AdaptiveRenderer.tsx`** — Component that goes inside `<Canvas>`:
   ```tsx
   <AdaptiveDpr pixelated />
   <AdaptiveEvents />
   <PerformanceMonitor
     flipflops={5}
     bounds={(refreshRate) => [refreshRate * 0.67, refreshRate * 0.92]}
     onIncline={() => console.log('[perf] FPS improving — increasing quality')}
     onDecline={() => console.log('[perf] FPS dropping — reducing quality')}
     onFallback={() => console.warn('[perf] FPS critically low — fallback applied')}
   />
   ```
   Import `AdaptiveDpr`, `AdaptiveEvents`, `PerformanceMonitor` from `@react-three/drei`. Wrap in a fragment or group. The `bounds` function returns `[lower, upper]` FPS thresholds — at 60Hz, this gives [40, 55], leaving margin for the 30 FPS minimum target.

6. **Modify `src/components/scene/Scene.tsx`** — Three changes:
   - Add `<AdaptiveRenderer />` as a child of `<Canvas>` (must be inside Canvas for context access)
   - Import `useDragStore` and create a `DragAwareOrbitControls` wrapper (or inline component) that reads `isDragging` via the hook and passes `enabled={!isDragging}` to `<OrbitControls>`
   - Keep existing lighting, Physics, ContactShadows, Environment, Stats unchanged

## Must-Haves

- [ ] `src/app/layout.tsx` exports viewport metadata with `user-scalable=false, maximum-scale=1`
- [ ] `src/app/globals.css` has `touch-action: none` on `html` and `body`
- [ ] `src/lib/dragStore.ts` exists with `isDragging` state and `setDragging` action
- [ ] `src/components/scene/DragControls.tsx` calls `dragStore.setDragging(true/false)` on pointer down/up
- [ ] `src/components/scene/AdaptiveRenderer.tsx` contains AdaptiveDpr + AdaptiveEvents + PerformanceMonitor
- [ ] `src/components/scene/Scene.tsx` renders AdaptiveRenderer inside Canvas, OrbitControls reads dragStore
- [ ] `src/components/SceneLoader.tsx` wraps Scene in `<div className="canvas-container">`

## Verification

- `npm run build` — zero errors
- `npx vitest run` — existing 10 tests pass (no regressions)
- Browser: Stats FPS counter shows stable FPS (desktop: 60)
- Browser: drag a bead → OrbitControls do NOT rotate the scene simultaneously
- Browser: release bead → orbit rotation works again
- Browser: Chrome DevTools mobile emulation (Galaxy S20) — viewport fills screen, no pinch-zoom, no scroll
- Browser: `console.log` shows PerformanceMonitor factor changes when FPS varies (throttle CPU in DevTools to trigger)

## Inputs

- `src/app/layout.tsx` — root layout, needs viewport metadata export
- `src/app/globals.css` — global styles, needs touch-action rule
- `src/components/scene/DragControls.tsx` — useDrag hook, needs dragStore integration
- `src/components/scene/Scene.tsx` — 3D scene root, needs AdaptiveRenderer + reactive OrbitControls
- `src/components/SceneLoader.tsx` — client wrapper, needs canvas container div wrapper

## Expected Output

- `src/app/layout.tsx` — viewport metadata added
- `src/app/globals.css` — touch-action: none rules added
- `src/lib/dragStore.ts` — new Zustand store for drag state
- `src/components/scene/DragControls.tsx` — dragStore integration (setDragging on pointer down/up)
- `src/components/scene/AdaptiveRenderer.tsx` — new component with AdaptiveDpr + AdaptiveEvents + PerformanceMonitor
- `src/components/scene/Scene.tsx` — AdaptiveRenderer inside Canvas, OrbitControls drag-aware
- `src/components/SceneLoader.tsx` — canvas container div wrapper added
