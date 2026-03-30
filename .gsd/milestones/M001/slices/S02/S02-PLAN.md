# S02: Мобильный рендеринг + PBR-материалы

**Goal:** Make the 3D bead chain render on mobile phones with adaptive quality, touch gestures, and visually distinct PBR materials for each bead type (wood, silicone, knit, plastic).
**Demo:** Open the app on a phone (or Chrome DevTools mobile emulation). The 3D scene fills the viewport with no unwanted scroll/zoom. Beads display visually distinct materials (wood is matte, silicone is glossy, knit is bumpy, plastic has slight sheen). Drag a bead by touch — the scene rotates only when not dragging a bead. With 20+ beads, FPS stays above 30.

## Must-Haves

- Mobile viewport: `<meta name="viewport">` with `user-scalable=no, maximum-scale=1` in root layout
- `touch-action: none` on canvas container to prevent browser scroll/zoom gestures
- Adaptive rendering: `AdaptiveDpr`, `AdaptiveEvents`, `PerformanceMonitor` from drei adjust quality based on FPS
- OrbitControls disabled during bead drag (shared Zustand `dragStore`)
- PBR materials per BeadType: wood (rough 0.75), silicone (smooth 0.2), knit (rough 0.9, bump), plastic (mid 0.35)
- `BeadMaterial` component replaces inline `<meshStandardMaterial>` in BeadRigidBody
- 30+ FPS with 20+ beads on mid-range mobile (or Chrome DevTools mobile emulation)

## Proof Level

- This slice proves: integration (adaptive renderer + materials + touch interaction working together in a real browser)
- Real runtime required: yes (browser with WebGL)
- Human/UAT required: yes (visual material distinction, touch feel, FPS reading)

## Verification

- `npm run build` — TypeScript + SSR gate, zero errors
- `npx vitest run` — existing 10 useBeadChain tests still pass + new BeadMaterial config test
- `npx vitest run src/components/scene/__tests__/beadMaterial.test.ts` — material config unit test passes
- Browser (desktop + mobile emulation): beads display 4 visually distinct material types
- Browser: Stats FPS counter shows 60 FPS with default 7 beads
- Browser: add beads to 20+, FPS stays above 30 on mobile emulation (Galaxy S20 or equivalent)
- Browser: touch drag works — bead follows finger, OrbitControls don't interfere
- Browser: orbit rotation works when NOT dragging a bead
- Browser: viewport fills screen on mobile emulation, no pinch-zoom or scroll interference

## Observability / Diagnostics

- Runtime signals: drei `Stats` component (dev-mode FPS overlay), `PerformanceMonitor` `onIncline`/`onDecline` callbacks with `console.log` showing factor changes
- Inspection surfaces: browser DevTools Performance tab, Chrome DevTools mobile emulation device toolbar, `PerformanceMonitor` factor in console
- Failure visibility: if FPS drops below 30, `onFallback` logs a warning; `Stats` overlay makes low FPS visible immediately in dev
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: `src/components/scene/Scene.tsx` (Canvas), `src/components/scene/DragControls.tsx` (useDrag hook), `src/components/scene/BeadRigidBody.tsx` (mesh material), `src/components/scene/ThreadLine.tsx` (geometry detail), `src/app/layout.tsx` (viewport meta), `src/app/globals.css` (touch-action)
- New wiring introduced in this slice: `dragStore.ts` Zustand store bridges DragControls ↔ OrbitControls; `AdaptiveRenderer.tsx` wraps adaptive drei components inside Canvas; `BeadMaterial.tsx` replaces inline material in BeadRigidBody
- What remains before the milestone is truly usable end-to-end: S03 (catalog UI + editor), S04 (templates + sharing), S05 (order + Telegram), S06 (admin), S07 (deploy)

## Tasks

- [ ] **T01: Add mobile viewport, adaptive rendering, and OrbitControls-drag conflict fix** `est:45m`
  - Why: Without proper viewport meta and touch-action CSS, mobile testing is impossible. Adaptive rendering (AdaptiveDpr + AdaptiveEvents + PerformanceMonitor) automatically adjusts quality to maintain FPS. The OrbitControls-during-drag conflict prevents touch drag from working — OrbitControls attaches DOM-level listeners that fire alongside R3F pointer events, causing both to handle the same touch gesture. Must fix via programmatic `enabled` control.
  - Files: `src/app/layout.tsx`, `src/app/globals.css`, `src/lib/dragStore.ts`, `src/components/scene/DragControls.tsx`, `src/components/scene/Scene.tsx`, `src/components/scene/AdaptiveRenderer.tsx`
  - Do:
    1. Add `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">` to `src/app/layout.tsx` via Next.js Metadata API
    2. Add `touch-action: none` to canvas container in `src/app/globals.css` (target a `.canvas-container` class, also apply it to `body`/`html` to prevent overscroll)
    3. Create `src/lib/dragStore.ts` — tiny Zustand store with `isDragging: boolean`, `setDragging(value: boolean)` action
    4. Modify `src/components/scene/DragControls.tsx` — in `onPointerDown`, call `dragStore.setDragging(true)`; in `onPointerUp`, call `dragStore.setDragging(false)`
    5. Create `src/components/scene/AdaptiveRenderer.tsx` — component containing `<AdaptiveDpr pixelated />`, `<AdaptiveEvents />`, and `<PerformanceMonitor>` with `onIncline`/`onDecline` callbacks that log factor changes, `flipflops={5}`, `bounds` function returning `[40, 55]` for 60Hz devices, and `onFallback` that sets a conservative fixed DPR
    6. Modify `src/components/scene/Scene.tsx` — add `<AdaptiveRenderer />` as child of `<Canvas>`, make OrbitControls `enabled` reactive by reading `dragStore.isDragging` via selector
    - Skills: `react-best-practices` (rerender patterns for drag state)
  - Verify: `npm run build` passes; browser shows Stats FPS counter; OrbitControls rotate when NOT dragging; drag bead → OrbitControls stop; mobile emulation viewport fills screen
  - Done when: mobile emulation works — viewport fills screen, no scroll interference, drag/orbit don't conflict, Stats shows stable FPS

- [ ] **T02: Create type-specific PBR materials for beads** `est:30m`
  - Why: R003 requires visually distinct materials for wood, silicone, knit, and plastic beads. Currently all beads use identical `roughness=0.3, metalness=0.1`. Each material type needs distinct PBR properties to look realistic even without PNG textures.
  - Files: `src/lib/beadMaterialConfig.ts`, `src/components/scene/BeadMaterial.tsx`, `src/components/scene/BeadRigidBody.tsx`, `src/components/scene/__tests__/beadMaterial.test.ts`
  - Do:
    1. Create `src/lib/beadMaterialConfig.ts` — export `BeadMaterialConfig` interface (`roughness`, `metalness`, `bumpScale`, `envMapIntensity`, `color` multiplier) and `BEAD_MATERIAL_CONFIGS: Record<BeadType, BeadMaterialConfig>` with: wood (roughness 0.75, metalness 0.0, bumpScale 0.02), silicone (roughness 0.2, metalness 0.05, bumpScale 0.0), knit (roughness 0.9, metalness 0.0, bumpScale 0.03), plastic (roughness 0.35, metalness 0.15, bumpScale 0.0)
    2. Create `src/components/scene/BeadMaterial.tsx` — React component accepting `type: BeadType` and `color: string`, renders `<meshStandardMaterial>` with PBR properties from config. Include `envMapIntensity` from config for realistic reflections. Use a procedural bump pattern (a small inline canvas texture) for knit type's bumpMap — or use `roughnessMap`-equivalent via noise if simpler. Document that texture loading (`useTexture`) can be added later via drei.
    3. Modify `src/components/scene/BeadRigidBody.tsx` — add `type: BeadType` prop, replace inline `<meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />` with `<BeadMaterial type={type} color={color} />`
    4. Create `src/components/scene/__tests__/beadMaterial.test.ts` — unit test verifying each BeadType has valid roughness (0–1), metalness (0–1), and that wood is rougher than silicone, knit is roughest
  - Verify: `npx vitest run` passes all tests (existing + new); browser shows 4 visually distinct bead types (wood matte, silicone glossy, knit bumpy, plastic sheen)
  - Done when: each bead type renders with a distinct look that a human can tell apart

- [ ] **T03: Performance tuning and 20+ bead verification** `est:30m`
  - Why: R002 requires 30+ FPS with 20+ beads on mobile. Must test this explicitly and apply mitigations if needed. Also optimizes geometry detail for mobile (sphere segments, thread curve points) to reduce draw calls and vertex count.
  - Files: `src/components/scene/BeadRigidBody.tsx`, `src/components/scene/ThreadLine.tsx`, `src/components/scene/Scene.tsx`, `src/components/SceneLoader.tsx`
  - Do:
    1. Make sphere geometry segments configurable in BeadRigidBody — add a `segments?: number` prop (default 32). When PerformanceMonitor factor drops below 0.5, the parent can pass lower segment count. For now, reduce default to 24 segments (sufficient visual quality with 50% fewer vertices).
    2. Reduce ThreadLine CatmullRom curve points from 32 to 20 — still smooth, fewer vertices. Change in `curve.getPoints(32)` → `curve.getPoints(20)`.
    3. Add `ContactShadows` resolution reduction — add `resolution={256}` prop (default is 512). Lower resolution = faster shadow pass.
    4. In Scene.tsx, wire `PerformanceMonitor` state to conditionally reduce detail: when factor < 0.7, log a warning suggesting lower segment count. Don't dynamically change segments in this slice (too complex), but document the mitigation path.
    5. Test in browser: use Add button to reach 20+ beads. Observe Stats FPS. If below 30 on mobile emulation: reduce sphere segments to 16, ThreadLine points to 12, ContactShadows resolution to 128.
    6. Document baseline FPS in a comment in Scene.tsx or AdaptiveRenderer.tsx: tested device, bead count, FPS achieved, and which mitigations were applied.
  - Verify: `npm run build` passes; 20+ beads at 30+ FPS on mobile emulation (Chrome DevTools, Galaxy S20 throttling); Stats counter visible
  - Done when: 20+ beads render with PBR materials and maintain 30+ FPS on mobile emulation; baseline numbers documented

## Files Likely Touched

- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/lib/dragStore.ts` (new)
- `src/lib/beadMaterialConfig.ts` (new)
- `src/components/scene/DragControls.tsx`
- `src/components/scene/AdaptiveRenderer.tsx` (new)
- `src/components/scene/BeadMaterial.tsx` (new)
- `src/components/scene/BeadRigidBody.tsx`
- `src/components/scene/Scene.tsx`
- `src/components/scene/ThreadLine.tsx`
- `src/components/SceneLoader.tsx`
- `src/components/scene/__tests__/beadMaterial.test.ts` (new)
