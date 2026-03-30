---
id: T01
parent: S02
milestone: M001
provides:
  - Mobile viewport meta (user-scalable=false, maximum-scale=1)
  - touch-action: none CSS on html, body, canvas-container, and canvas
  - Zustand dragStore for cross-component OrbitControls/drag conflict resolution
  - AdaptiveRenderer with AdaptiveDpr, AdaptiveEvents, and PerformanceMonitor
  - DragAwareOrbitControls that disables during bead drag
key_files:
  - src/app/layout.tsx
  - src/app/globals.css
  - src/lib/dragStore.ts
  - src/components/scene/DragControls.tsx
  - src/components/scene/AdaptiveRenderer.tsx
  - src/components/scene/Scene.tsx
  - src/components/SceneLoader.tsx
key_decisions:
  - Used !important on .canvas-container canvas touch-action to override R3F's inline touch-action: auto
  - Used Zustand getState() in DragControls callbacks (not hook) to avoid unnecessary re-renders
  - Created separate DragAwareOrbitControls component that subscribes to dragStore via hook for reactive OrbitControls enabled prop
patterns_established:
  - Zustand getState() for non-React callback contexts (event handlers in R3F hooks)
  - Zustand hook subscription for React components that need reactive state (DragAwareOrbitControls)
  - AdaptiveDpr + AdaptiveEvents + PerformanceMonitor bundle for mobile adaptive rendering
observability_surfaces:
  - PerformanceMonitor onIncline/onDecline/onFallback callbacks log [perf] prefix messages to console
  - drei Stats component shows real-time FPS overlay in dev mode
  - useDragStore.getState().isDragging inspectable in browser console for drag state debugging
duration: ~15m
verification_result: passed
completed_at: 2026-03-30T01:30:00+09:00
blocker_discovered: false
---

# T01: Add mobile viewport, adaptive rendering, and OrbitControls-drag conflict fix

**Added mobile viewport meta, touch-action CSS, adaptive rendering (AdaptiveDpr/AdaptiveEvents/PerformanceMonitor), and Zustand dragStore to fix OrbitControls-drag conflict on touch devices.**

## What Happened

All 7 implementation files were already in place when execution began (pre-existing worktree state). The task plan's 6 steps were verified against the existing code:

1. **layout.tsx** — Already exported `viewport: { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false }` via Next.js 16 Metadata API ✅
2. **globals.css** — Already had `touch-action: none` on `html` and `body`, plus `.canvas-container` rule ✅
3. **dragStore.ts** — Already created as a minimal Zustand store with `isDragging` state and `setDragging` action ✅
4. **DragControls.tsx** — Already integrated `useDragStore.getState().setDragging(true/false)` in pointer events ✅
5. **AdaptiveRenderer.tsx** — Already created with AdaptiveDpr, AdaptiveEvents, PerformanceMonitor with proper bounds ✅
6. **Scene.tsx** — Already had AdaptiveRenderer inside Canvas and DragAwareOrbitControls component ✅

**One deviation found and fixed:** R3F/Three.js sets `touch-action: auto` as an inline style on the `<canvas>` element, which overrides the CSS cascade from `.canvas-container { touch-action: none; }`. Added `.canvas-container canvas { touch-action: none !important; }` to globals.css. Verified that the computed style is now `none` despite the inline `auto`.

Browser verification confirmed:
- Scene renders with beads on desktop (1280×800) ✅
- Scene fills viewport on mobile emulation (390×844), no scroll/zoom interference ✅
- All dimensions match viewport (html/body/container/canvas = 390×844) ✅
- Viewport meta tag present with correct attributes ✅
- Stats FPS counter visible ✅
- PerformanceMonitor callbacks firing (saw `[perf] FPS improving` and `[perf] FPS critically low — fallback applied` in console) ✅

## Verification

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm run build` (TypeScript + SSR gate) | 0 | ✅ pass | 12.3s |
| 2 | `npx vitest run` (10 existing tests) | 0 | ✅ pass | 3.6s |
| 3 | `npm run build` (post-CSS-fix regression check) | 0 | ✅ pass | 109.4s |
| 4 | Browser: desktop scene renders with beads + Stats overlay | 0 | ✅ pass | visual |
| 5 | Browser: mobile emulation viewport fills screen (390×844, overflow:hidden) | 0 | ✅ pass | visual |
| 6 | Browser: canvas computed touch-action = none | 0 | ✅ pass | JS eval |
| 7 | Browser: viewport meta content correct | 0 | ✅ pass | JS eval |
| 8 | Browser: PerformanceMonitor console messages visible | 0 | ✅ pass | console |

## Diagnostics

- **PerformanceMonitor**: Check browser console for `[perf]` prefixed messages. Throttle CPU (Chrome DevTools → Performance → 4× slowdown) to trigger `onDecline`/`onFallback`.
- **FPS**: drei `<Stats>` component renders a real-time FPS counter in the top-left corner (dev mode only).
- **Drag state**: Open browser console, run `window.__ZUSTAND_DEVTOOLS__` or check React DevTools for the `useDragStore` state. During bead drag, `isDragging` should be `true`; after release, `false`.
- **Touch-action**: In DevTools, inspect the `<canvas>` element — computed `touch-action` should be `none`. The inline style may show `auto` (from R3F), but CSS `!important` overrides it.

## Deviations

- **Added `.canvas-container canvas { touch-action: none !important; }`** to globals.css. This was not in the original task plan but was necessary because R3F/Three.js sets `touch-action: auto` as an inline style on the canvas element, which overrides the CSS cascade. The `!important` ensures the browser doesn't intercept touch events for scrolling/zooming on the 3D canvas.

## Known Issues

- **Dev server path doubling in worktree**: Running `npm run dev` from the symlinked worktree path (`D:\ProjectsOnCursor\...`) causes Next.js to double paths (e.g., `D:\...\M001\C:\Users\...`), resulting in a 500 error. Must run from the real path (`C:\Users\Andy\.gsd\projects\...`) instead. This is a worktree environment issue, not a code issue. `npm run build` works correctly from the worktree path.

## Files Created/Modified

- `src/app/layout.tsx` — Already had viewport metadata; verified correct (pre-existing)
- `src/app/globals.css` — Added `.canvas-container canvas { touch-action: none !important; }` to override R3F inline style
- `src/lib/dragStore.ts` — Zustand store for drag state (pre-existing, verified correct)
- `src/components/scene/DragControls.tsx` — dragStore integration in pointer events (pre-existing, verified correct)
- `src/components/scene/AdaptiveRenderer.tsx` — AdaptiveDpr + AdaptiveEvents + PerformanceMonitor (pre-existing, verified correct)
- `src/components/scene/Scene.tsx` — AdaptiveRenderer inside Canvas + DragAwareOrbitControls (pre-existing, verified correct)
- `src/components/SceneLoader.tsx` — canvas-container div wrapper (pre-existing, verified correct)
- `.gsd/milestones/M001/slices/S02/tasks/T01-PLAN.md` — Added Observability Impact section
