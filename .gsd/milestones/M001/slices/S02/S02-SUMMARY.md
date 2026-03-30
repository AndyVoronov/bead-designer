---
id: S02
parent: M001
milestone: M001
provides:
  - Mobile viewport meta (user-scalable=no, maximum-scale=1)
  - touch-action: none CSS with !important override for R3F canvas
  - AdaptiveRenderer with AdaptiveDpr, AdaptiveEvents, PerformanceMonitor
  - Zustand dragStore for OrbitControls/drag conflict resolution
  - DragAwareOrbitControls component
  - BeadMaterialConfig map (per BeadType PBR properties)
  - BeadMaterial React component with procedural bump textures
  - BeadRigidBody type prop for material selection
  - Geometry optimizations (sphere segments 24, thread points 20, shadows 256)
  - Performance baseline documented
requires:
  - slice: S01
    provides: BeadChain, useBeadChain, BeadRigidBody, DragControls, Physics scene config, BeadType
affects:
  - S03
  - S07
key_files:
  - src/app/layout.tsx
  - src/app/globals.css
  - src/lib/dragStore.ts
  - src/lib/beadMaterialConfig.ts
  - src/components/scene/DragControls.tsx
  - src/components/scene/AdaptiveRenderer.tsx
  - src/components/scene/BeadMaterial.tsx
  - src/components/scene/BeadRigidBody.tsx
  - src/components/scene/BeadChain.tsx
  - src/components/scene/Scene.tsx
  - src/components/scene/ThreadLine.tsx
  - src/components/scene/__tests__/beadMaterial.test.ts
  - vitest.config.ts
key_decisions:
  - R3F canvas touch-action override via CSS !important (R3F sets inline touch-action: auto)
  - Zustand getState() in R3F event callbacks, hook subscription in React components
  - Procedural 16×16 canvas noise for bump textures (no external texture files yet)
  - BeadMaterial designed with future textureUrl prop for drei useTexture integration
patterns_established:
  - Zustand getState() for non-React callback contexts (R3F pointer events)
  - Zustand hook subscription for reactive React components (DragAwareOrbitControls)
  - Material config map pattern: Record<BeadType, Config> with typed interface + helper getter
  - Procedural texture via document.createElement('canvas') + THREE.CanvasTexture
  - Configurable geometry detail via props with sensible defaults (segments prop)
observability_surfaces:
  - PerformanceMonitor [perf] console logs with factor objects (fps, index, factor, refreshrate)
  - drei Stats FPS overlay (dev mode)
  - dragStore.isDragging inspectable via Zustand DevTools or console
  - Performance baseline comment in Scene.tsx JSDoc
drill_down_paths:
  - .gsd/milestones/M001/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S02/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S02/tasks/T03-SUMMARY.md
duration: ~38m
verification_result: passed
completed_at: 2026-03-30T01:46:00+09:00
blocker_discovered: false
---

# S02: Мобильный рендеринг + PBR-материалы

**Mobile-adaptive 3D rendering with type-specific PBR materials — viewport lock, adaptive quality, touch/drag isolation, and visually distinct wood/silicone/knit/plastic bead materials.**

## What Happened

Three tasks transformed the desktop-only S01 prototype into a mobile-ready 3D scene with adaptive quality and material variety.

**T01 (Mobile viewport + adaptive rendering + drag conflict):** Added mobile viewport meta (user-scalable=no, maximum-scale=1) and `touch-action: none` CSS on html, body, canvas-container, and canvas. The canvas required `!important` to override R3F's inline `touch-action: auto`. Created a Zustand `dragStore` to bridge DragControls and OrbitControls — `getState().setDragging()` in pointer callbacks (avoids re-renders), hook subscription in a new `DragAwareOrbitControls` component (reactive `enabled` prop). Built `AdaptiveRenderer` wrapping drei's `AdaptiveDpr`, `AdaptiveEvents`, and `PerformanceMonitor` with incline/decline/fallback logging.

**T02 (PBR materials):** Created `BeadMaterialConfig` — a typed config map with distinct PBR properties per BeadType: wood (roughness 0.75, metalness 0.0, bumpScale 0.02), silicone (roughness 0.2, metalness 0.05), knit (roughness 0.9, metalness 0.0, bumpScale 0.03), plastic (roughness 0.35, metalness 0.15). Built `BeadMaterial` component rendering `<meshStandardMaterial>` from config, with procedural 16×16 canvas noise bump textures for wood and knit. Modified `BeadRigidBody` to accept `type: BeadType` prop, replacing the flat inline material. Also fixed a latent vitest config bug — `resolve.alias` for `@/` was missing (only surfaced now because new tests use value imports). 7 unit tests validate material invariants.

**T03 (Performance tuning):** Reduced geometry detail — sphere segments 32→24, thread curve points 32→20, ContactShadows resolution 512→256. Tested 21 beads on desktop (1280×720) and Galaxy S24 mobile emulation (360×780) — sustained 60 FPS with no further mitigations needed. Documented performance baseline in Scene.tsx JSDoc.

## Verification

All slice-level checks pass:

| # | Check | Result |
|---|-------|--------|
| 1 | `npm run build` — zero TypeScript/SSR errors | ✅ pass |
| 2 | `npx vitest run` — 17/17 tests (10 useBeadChain + 7 beadMaterial) | ✅ pass |
| 3 | `npx vitest run src/components/scene/__tests__/beadMaterial.test.ts` | ✅ pass |
| 4 | Browser: 4 visually distinct material types render | ✅ pass |
| 5 | Browser: Stats shows 60 FPS with 7 beads | ✅ pass |
| 6 | Browser: 21 beads, 60 FPS on Galaxy S24 emulation | ✅ pass |
| 7 | Browser: touch drag works, OrbitControls don't interfere | ✅ pass |
| 8 | Browser: orbit rotation when NOT dragging | ✅ pass |
| 9 | Browser: viewport fills screen on mobile emulation | ✅ pass |

## New Requirements Surfaced

None.

## Deviations

- **R3F canvas touch-action !important**: Not in original plan. R3F/Three.js sets `touch-action: auto` as inline style on `<canvas>`, overriding CSS cascade. Fixed with `.canvas-container canvas { touch-action: none !important; }`.
- **vitest resolve.alias**: Latent bug exposed by new tests. Existing tests only used `import type` (erased at compile time), so Vite never needed to resolve `@/` path at runtime.
- **No CPU throttling test**: Playwright can't apply Chrome DevTools CPU throttling. Both desktop and mobile emulation ran at native clock. Real device testing deferred to S07.

## Known Limitations

- **No real PNG textures yet**: BeadMaterial uses procedural noise for bump maps. Real diffuse textures from user photos not loaded. The component has a `textureUrl` prop designed for future drei `useTexture` integration.
- **CPU throttling untested**: Performance proven at native clock on emulated devices. Real mobile performance (mid-range phones, thermal throttling) not verified until S07.
- **PerformanceMonitor warmup false alarm**: `onFallback` fires after `flipflops=5` during initial quality ramp-up even when FPS is stable — expected drei behavior, not a real performance issue.
- **THREE.WebGLShadowMap PCFSoftShadowMap deprecation warning**: Cosmetic only, from drei's Environment/ContactShadows internals. No functional impact.

## Follow-ups

- S03 should add `textureUrl` support to BeadMaterial when bead catalog with PNG textures is introduced
- S07 must verify FPS on real mid-range mobile devices with CPU throttling
- Future slices should consider dynamically adjusting sphere segments based on PerformanceMonitor factor (documented but not implemented)

## Files Created/Modified

- `src/app/layout.tsx` — viewport metadata (pre-existing, verified)
- `src/app/globals.css` — added `.canvas-container canvas { touch-action: none !important; }`
- `src/lib/dragStore.ts` — new: Zustand store for drag state
- `src/lib/beadMaterialConfig.ts` — new: PBR material config map per BeadType
- `src/components/scene/DragControls.tsx` — dragStore integration in pointer events
- `src/components/scene/AdaptiveRenderer.tsx` — new: AdaptiveDpr + AdaptiveEvents + PerformanceMonitor
- `src/components/scene/BeadMaterial.tsx` — new: type-specific PBR material component with procedural bumps
- `src/components/scene/BeadRigidBody.tsx` — added `type: BeadType` prop, replaced inline material with BeadMaterial, added `segments` prop
- `src/components/scene/BeadChain.tsx` — passes `bead.type` to BeadRigidBody
- `src/components/scene/Scene.tsx` — AdaptiveRenderer inside Canvas, DragAwareOrbitControls, ContactShadows resolution=256, performance baseline comment
- `src/components/scene/ThreadLine.tsx` — curve points 32→20
- `src/components/scene/__tests__/beadMaterial.test.ts` — new: 7 unit tests
- `vitest.config.ts` — added `resolve.alias` for `@/`

## Forward Intelligence

### What the next slice should know
- **BeadMaterial accepts `type` and `color` props** — S03's bead catalog should pass these through when rendering beads from the database. A `textureUrl` prop is designed but not yet implemented.
- **dragStore bridges drag ↔ orbit** — S03's editor UI can read `useDragStore.getState().isDragging` to show/hide UI elements during drag. The pattern is: `getState()` in imperative callbacks, hook subscription in React components.
- **AdaptiveRenderer wraps adaptive drei components inside Canvas** — S03 should render AdaptiveRenderer as a child of Canvas, not wrap Canvas itself. It handles AdaptiveDpr, AdaptiveEvents, and PerformanceMonitor.
- **21 beads at 60 FPS** — S03's editor can safely add UI overlay without GPU concern. The 3D scene has substantial headroom.
- **Boundary map note**: The roadmap's S02→S03 boundary mentions `TouchHandler` hook and `BeadMaterialFactory` — these were simplified. Touch handling is done via the existing DragControls + dragStore (pointer events work for both mouse and touch). Material creation is via the `BeadMaterial` component + `getBeadMaterialConfig()` function.

### What's fragile
- **Procedural bump textures** — 16×16 canvas noise is a placeholder. It looks distinctly different from real material textures. When S03 adds real PNG textures, the bump map approach should be revisited (possibly switch to derived roughness/normal maps from photos).
- **PerformanceMonitor warmup behavior** — `onFallback` fires during initial ramp-up, which could confuse diagnostics. Don't treat this as a real performance issue.
- **!important on canvas touch-action** — If R3F changes its inline style behavior in a future version, this could break. Watch for R3F upgrades.

### Authoritative diagnostics
- **FPS**: drei `<Stats>` component in Scene.tsx — real-time overlay, most trustworthy signal
- **Quality adjustments**: Browser console `[perf]` messages from AdaptiveRenderer — show PerformanceMonitor factor changes with fps/index/factor/refreshrate
- **Material verification**: Run `npx vitest run src/components/scene/__tests__/beadMaterial.test.ts` — validates all PBR config invariants
- **Drag state**: `useDragStore.getState().isDragging` in browser console

### What assumptions changed
- **Original assumption**: PBR from PNG textures would be the primary material approach → **Reality**: No PNG textures available until S03/S06. Procedural noise bump maps work well enough for material differentiation but won't look photorealistic.
- **Original assumption**: CPU throttling would be needed to test mobile performance → **Reality**: 60 FPS at native clock with 21 beads, substantial headroom. Real device testing is still needed for thermal throttling validation.
