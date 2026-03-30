# S02: Мобильный рендеринг + PBR-материалы — Research

**Date:** 2026-03-30

## Summary

S02 has three deliverables: (1) make the 3D scene render well on mobile with adaptive quality, (2) make bead drag work on touch devices, and (3) give each bead type a visually distinct PBR material. The good news is that R3F's pointer events already abstract mouse and touch via the Pointer Events API — the existing `useDrag` hook's `onPointerDown/Up/Over/Out` handlers will fire on touch without modification. The main touch problem is an **OrbitControls conflict**: Three.js OrbitControls attaches DOM-level listeners, so `e.stopPropagation()` in R3F events won't prevent it from also handling the same touch gesture. This needs a shared drag state to disable OrbitControls during bead drag.

For adaptive rendering, drei provides `AdaptiveDpr` (one-liner that adjusts pixel ratio), `AdaptiveEvents` (disables raycasting during load), and `PerformanceMonitor` (FPS-based callbacks with gradual factor adjustment). These three components together give a comprehensive adaptive rendering layer with minimal code.

For PBR materials, the approach is a per-BeadType material configuration (`roughness`, `metalness`, `bumpScale`) applied through a `BeadMaterial` React component. Since we don't have actual PNG textures yet, materials are differentiated by PBR constants: wood (rough 0.75, matte), silicone (smooth 0.2, glossy), knit (rough 0.9, bumpy), plastic (mid 0.35, slight sheen). Texture loading can be added later via drei's `useTexture` hook with Suspense. Post-processing (SSGI, HBAO from D006) should be **deferred to S07** — adding it now when mobile is the primary target and it would be immediately disabled on weak devices is premature.

## Recommendation

Split into three tasks: **T01 (Mobile foundation)** sets up viewport meta, touch-action CSS, adaptive rendering (AdaptiveDpr + AdaptiveEvents + PerformanceMonitor), and fixes the OrbitControls-during-drag conflict. **T02 (PBR materials)** creates the BeadMaterialFactory with type-specific material configs and a BeadMaterial React component, integrates it into BeadRigidBody. **T03 (Performance tuning + proof)** optimizes geometry resolution for mobile, tests with 20+ beads, and verifies 30+ FPS.

The riskiest unknown is whether 20+ beads with Rapier physics maintain 30+ FPS on real mid-range mobile devices. T03 should test this explicitly. If FPS drops, the mitigations are: reduce sphere geometry segments (32→16), reduce MeshLine curve points (32→16), lower ContactShadows resolution, reduce Rapier solver iterations, or limit max chain length on mobile.

## Implementation Landscape

### Key Files

- `src/app/layout.tsx` — Root layout. **Missing `<meta name="viewport">` tag.** Must add viewport meta with `user-scalable=no, maximum-scale=1` to prevent pinch-zoom interfering with 3D gestures.
- `src/app/globals.css` — Global styles. Needs `touch-action: none` on canvas/container to prevent browser scroll/zoom gestures on the 3D viewport.
- `src/components/scene/Scene.tsx` — 3D scene root (Canvas + Physics + Environment + ContactShadows + OrbitControls). **Primary integration point** for AdaptiveRenderer: Canvas `dpr` prop becomes dynamic, AdaptiveDpr/AdaptiveEvents/PerformanceMonitor go inside Canvas. OrbitControls needs `enabled` prop driven by drag state.
- `src/components/scene/DragControls.tsx` — `useDrag` hook. Touch events already work (R3F pointer events = mouse + touch unified via Pointer Events API). **Must emit drag state** (via Zustand store or lifted ref) so OrbitControls can disable itself. Currently has no mechanism for this.
- `src/components/scene/BeadRigidBody.tsx` — Individual bead with inline `<meshStandardMaterial>`. **Replace with `<BeadMaterial>` component** that provides type-specific PBR properties.
- `src/components/scene/BeadChain.tsx` — Chain composition. No changes needed unless BeadMaterial requires Suspense boundaries.
- `src/components/scene/ThreadLine.tsx` — MeshLine curve. Geometry resolution (currently 32 points) may need reduction for mobile performance.
- `src/components/SceneLoader.tsx` — Client wrapper with demo UI. No changes needed for S02.
- `src/types/bead.ts` — Type definitions. `BeadType` already has `"wood" | "silicone" | "knit" | "plastic"`. No schema changes needed.
- `src/hooks/useBeadChain.ts` — Chain state hook. No changes needed for S02.

### New Files to Create

- `src/components/scene/AdaptiveRenderer.tsx` — Wrapper component that goes inside Canvas, containing `<AdaptiveDpr />`, `<AdaptiveEvents />`, and `<PerformanceMonitor>` with gradual DPR adjustment logic.
- `src/components/scene/BeadMaterial.tsx` — React component that renders `<meshStandardMaterial>` with type-specific PBR properties based on `BeadType`. When texture URLs are added later, uses `useTexture` from drei for Suspense-based loading.
- `src/lib/dragStore.ts` — Tiny Zustand store (or module-level ref) for shared drag state. `useDrag` sets `isDragging = true/false`; OrbitControls reads `enabled={!isDragging}`. Alternative: lift drag state via props/context — but a tiny Zustand store is simpler and avoids prop drilling through BeadRigidBody → BeadChain → Scene.

### Build Order

**T01: Mobile foundation (AdaptiveRenderer + touch + OrbitControls fix)**
- Unblocks: everything else — without mobile viewport and adaptive rendering, no mobile testing is possible
- Add viewport meta to layout.tsx
- Add `touch-action: none` to globals.css (on canvas container)
- Create `dragStore.ts` (tiny Zustand: `isDragging` boolean)
- Modify `useDrag` to set `dragStore.isDragging` on pointer down/up
- Modify `Scene.tsx`: pass `enabled={!dragStore.isDragging}` to OrbitControls, add AdaptiveDpr/AdaptiveEvents/PerformanceMonitor inside Canvas
- Create `AdaptiveRenderer.tsx` as a clean container for adaptive components
- Install `@react-three/postprocessing` and `postprocessing` only if post-processing is added (recommend deferring)

**T02: PBR materials (BeadMaterialFactory)**
- Depends on: T01 (needs working mobile viewport to verify materials on mobile)
- Create material config map: `BeadType → { roughness, metalness, bumpScale, envMapIntensity }`
- Create `BeadMaterial.tsx` component using `meshStandardMaterial` with type-specific props
- Modify `BeadRigidBody.tsx`: replace inline `<meshStandardMaterial>` with `<BeadMaterial type={bead.type} />`
- Visual verification: 4 bead types look visually distinct

**T03: Performance tuning + verification**
- Depends on: T01 + T02 (full scene with materials must be running)
- Add 20+ beads via Add button, monitor FPS via drei `<Stats>`
- If FPS < 30: reduce sphere segments (32→16), MeshLine points (32→16), ContactShadows resolution, Rapier solver iterations
- Record baseline FPS numbers for documentation
- Verify touch drag works smoothly on mobile viewport (emulated via Chrome DevTools or real device)

### Verification Approach

1. `npm run build` — TypeScript + SSR gate (must pass clean)
2. `npx vitest run` — existing useBeadChain tests still pass
3. Browser (desktop): beads display with visually distinct materials per type
4. Browser (desktop): FPS counter (Stats) shows stable 60 FPS with 7 beads
5. Browser (desktop): add beads to 20+, FPS remains 30+
6. Browser (desktop): touch drag works via Chrome DevTools mobile emulation
7. Browser (mobile or emulation): viewport fills screen, no unwanted scroll/zoom
8. Browser (desktop): OrbitControls rotates scene when NOT dragging a bead; stops rotating when dragging a bead

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Adaptive DPR | `AdaptiveDpr` from `@react-three/drei` | One-liner, handles pixel ratio adjustment automatically. No custom implementation needed. |
| Adaptive raycasting | `AdaptiveEvents` from `@react-three/drei` | One-liner, disables raycasting during performance regression. Prevents jank from hit-testing while scene is struggling. |
| Performance monitoring | `PerformanceMonitor` from `@react-three/drei` | FPS-based callbacks with `factor` (0-1), `onIncline`/`onDecline`, `onFallback`. Gradual quality adjustment without manual frame timing. |
| Texture loading | `useTexture` from `@react-three/drei` | Suspense-based texture loading with automatic TextureLoader. Supports keyed objects for PBR maps. |
| Shared drag state | Zustand (already in project decisions D005) | Tiny store for `isDragging` boolean. Avoids prop drilling. Zustand is the planned state management solution. |

## Constraints

- **R3F pointer events ≠ DOM events for OrbitControls**: `e.stopPropagation()` on R3F mesh events does NOT stop Three.js OrbitControls from handling the same touch event, because OrbitControls attaches its own DOM-level event listeners to the canvas. The fix is programmatic `enabled` control, not event propagation.
- **useThree().pointer tracks only the last pointer**: This works fine for single-finger drag but means multi-touch scenarios (e.g., user touches scene with two fingers) will only track one pointer. This is acceptable — bead drag is always single-finger.
- **No actual PNG textures yet**: The PBR material factory must work with just BeadType + color for now. Texture loading is infrastructure to prepare, not data to process.
- **ContactShadows are expensive**: They render a separate pass. On very weak devices, may need to disable or reduce resolution.
- **PerformanceMonitor `bounds` function**: The default `bounds` callback receives the device refresh rate and returns `[lower, upper]` FPS thresholds. For mobile (60Hz), use `[40, 55]` to give margin for 30 FPS minimum.
- **drei `Stats` component shows FPS in dev only**: For production performance monitoring, use `PerformanceMonitor` callbacks + custom logging, or remove Stats in production builds.

## Common Pitfalls

- **Forgetting `touch-action: none` on canvas**: Without this CSS property, the browser will intercept touch gestures for scrolling/zooming instead of passing them to the WebGL canvas. The entire touch interaction depends on this.
- **OrbitControls `enabled={false}` must be reactive, not initial**: Setting `enabled` as a static prop won't work because OrbitControls caches its state. Must use a reactive source (Zustand store value) that triggers re-render when drag state changes.
- **AdaptiveDpr inside Canvas, not outside**: `AdaptiveDpr` must be a child of `<Canvas>`, not a sibling. It accesses R3F internals via context.
- **MeshStandardMaterial roughness > 1 or < 0**: Three.js clamps roughness to [0, 1]. Values outside this range have no effect.
- **bumpScale too high**: On bead spheres with relatively low-poly geometry (32 segments), high bumpScale (>0.05) will create visible artifacts. Keep bumpScale subtle (0.01-0.03).
- **PerformanceMonitor `flipflops`**: If FPS oscillates rapidly between incline/decline, the factor ping-pongs. Set `flipflops={5}` and implement `onFallback` to set a conservative fixed DPR.

## Open Risks

- **Real mobile FPS at 20+ beads untested**: The S01 summary noted chain stability was only tested to ~12 beads. 20-40 beads with Rapier WASM + R3F rendering on a real mid-range phone (Samsung Galaxy A-series) is the primary performance risk. T03 must test this and document findings. If FPS is below 30, the mitigations are: lower geometry detail, reduce physics solver iterations, or cap chain length on mobile.
- **Rapier WASM load time on slow mobile connections**: The WASM binary (~1MB) may take several seconds on 3G. This blocks the entire physics scene. No mitigation in S02 (would need streaming/splash screen, which is S03+ work). Worth monitoring.
- **Procedural bump from diffuse textures**: When actual PNG textures arrive, generating convincing bump maps from a single photograph is non-trivial. May need manual per-texture tuning or external tools (Substance, normalmap online generators). This is deferred beyond S02 — the factory will accept optional textureUrl and apply it as `map` when available.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| React Three Fiber | `freshtechbro/claudedesignskills@threejs-webgl` (201 installs) | Available — `npx skills add freshtechbro/claudedesignskills@threejs-webgl` |
| Three.js Graphics Optimizer | `ovachiever/droid-tings@threejs-graphics-optimizer` (80 installs) | Available — `npx skills add ovachiever/droid-tings@threejs-graphics-optimizer` |
| React Best Practices | `react-best-practices` (installed) | Already loaded — `rerender-use-ref-transient-values` relevant for drag state |

## Sources

- drei PerformanceMonitor docs: gradual quality adjustment via `factor`, `onIncline`/`onDecline`, `bounds` callback, `flipflops` and `onFallback` (source: [drei docs](https://github.com/pmndrs/drei/blob/master/docs/performances/performance-monitor.mdx))
- R3F event system: unified pointer events (mouse+touch), `setPointerCapture`/`releasePointerCapture`, event contains both DOM data and Three.js intersection (source: [R3F events API](https://github.com/pmndrs/react-three-fiber/blob/master/docs/API/events.mdx))
- drei AdaptiveDpr: one-liner dynamic pixel ratio adjustment inside Canvas (source: [drei adaptive-dpr](https://github.com/pmndrs/drei/blob/master/docs/performances/adaptive-dpr.mdx))
- drei AdaptiveEvents: disables raycasting during high load (source: [drei adaptive-events](https://github.com/pmndrs/drei/blob/master/docs/performances/adaptive-events.mdx))
- drei useTexture: Suspense-based texture loading with keyed objects for PBR maps (source: [drei useTexture](https://github.com/pmndrs/drei/blob/master/docs/loaders/texture-use-texture.mdx))
- Three.js MeshStandardMaterial: PBR properties roughness, metalness, bumpMap, bumpScale, normalMap, aoMap (source: [Three.js docs](https://github.com/mrdoob/three.js/blob/dev/docs/pages/MeshStandardMaterial.html.md))
