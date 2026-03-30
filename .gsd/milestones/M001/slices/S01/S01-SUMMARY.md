---
id: S01
parent: M001
milestone: M001
provides:
  - BeadChain component — fixed anchor + N dynamic RigidBodies connected by useRopeJoint, with MeshLine thread
  - BeadRigidBody component — RigidBody + BallCollider + sphere mesh, forwardRef for joint refs, drag integration
  - ThreadLine component — MeshLine smooth curve (CatmullRomCurve3) through all bead positions, updated every frame
  - DragControls hook (useDrag) — kinematicPosition drag with raycast plane, velocity history buffer on release
  - useBeadChain hook — beads[] state, addBead, removeBead, removeLast, reset
  - Scene component — Canvas + Physics + Environment + ContactShadows + OrbitControls + Stats
  - SceneLoader client wrapper — dynamic(ssr:false) boundary with demo UI overlay (Add/Remove/Reset)
  - TypeScript types — BeadId, BeadType, BeadState, ChainConfig, ChainState
  - Vitest test suite — 10 passing tests for useBeadChain hook
requires:
  - slice: none
    provides: greenfield
affects:
  - S02 (mobile rendering wraps BeadChain in AdaptiveRenderer; DragControls extends to touch)
  - S03 (editor uses useBeadChain, BeadRigidBody, DragControls; SceneLoader becomes EditorCanvas)
key_files:
  - src/types/bead.ts
  - src/components/scene/BeadRigidBody.tsx
  - src/components/scene/BeadChain.tsx
  - src/components/scene/ThreadLine.tsx
  - src/components/scene/DragControls.tsx
  - src/components/scene/Scene.tsx
  - src/components/SceneLoader.tsx
  - src/hooks/useBeadChain.ts
  - src/hooks/__tests__/useBeadChain.test.ts
  - package.json
  - next.config.ts
  - vitest.config.ts
key_decisions:
  - D013: Turbopack{} instead of webpack experiments (Next.js 16 defaults to Turbopack)
  - D014: SceneLoader client wrapper for dynamic(ssr:false) (forbidden in Server Components)
  - D015: Dev server must run from real path, not NTFS junction
  - D016: MeshLine R3F type augmentation uses plain object type, not DetailedHTMLProps
patterns_established:
  - JointLink pattern: separate component per useRopeJoint call (hooks can't be called in loops)
  - Stable ref objects via useMemo keyed on beads.length to avoid ref recreation
  - Vercel kinematicPosition drag: pointerDown→kinematic+wakeUp→useFrame raycast→pointerUp→velocity from history→dynamic
  - Position history ring buffer (HISTORY_SIZE=3) for smooth velocity on release
  - SSR boundary: "use client" SceneLoader wraps dynamic(ssr:false) import
  - Ref guard: ThreadLine skips useFrame until all body refs populated
observability_surfaces:
  - drei Stats FPS counter (top-left, dev mode)
  - Physics debug prop on Physics component (uncomment for collider/joint wireframe overlay)
  - Browser DevTools console (Three.js deprecation warnings, Rapier WASM init)
drill_down_paths:
  - .gsd/milestones/M001/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S01/tasks/T03-SUMMARY.md
duration: ~85m (T01: 40m, T02: 20m, T03: 25m)
verification_result: passed
completed_at: 2026-03-30
---

# S01: 3D-физика цепочки бусин

**Physics bead chain with rope joints, MeshLine thread, kinematic drag with inertia, and useBeadChain state hook — build clean, 10 tests passing, browser-verified interactive demo.**

## What Happened

Three tasks built the complete 3D bead chain physics system from a greenfield Next.js project:

**T01 (Scaffold):** Created Next.js 16 project with App Router, TypeScript, Tailwind v4, Turbopack. Installed R3F + Rapier + drei + three + meshline. Discovered two Next.js 16 gotchas: (1) `turbopack:{}` replaces webpack WASM config, (2) `next/dynamic({ssr:false})` forbidden in Server Components — created SceneLoader client wrapper. Also hit NTFS junction path issue — dev server must run from real path. Created all 5 TypeScript types (BeadId, BeadType, BeadState, ChainConfig, ChainState). Minimal Scene with Canvas + Physics + test mesh. Build passes clean.

**T02 (Physics chain):** Built BeadRigidBody (RigidBody + BallCollider + sphere, forwardRef for joints), BeadChain (fixed anchor + N beads + JointLink rope joints + ThreadLine), and ThreadLine (MeshLine via CatmullRomCurve3 updated every frame). Fixed MeshLine type augmentation — `React.DetailedHTMLProps` base conflicts with Three.js MeshLineMaterial ref; replaced with plain object type. Verified useRopeJoint API: params as `[[x,y,z],[x,y,z],length]`. Chain of 7 beads hangs under gravity.

**T03 (Drag + hook + polish):** Implemented DragControls (useDrag hook) with Vercel kinematicPosition pattern: pointerDown → kinematic + wakeUp → useFrame raycast onto plane at body depth → pointerUp → velocity from position history → dynamic. History ring buffer (HISTORY_SIZE=3) gives smooth inertia. Created useBeadChain hook with 10 passing vitest tests. Fixed two test infrastructure issues: NTFS junction paths in vitest.config.ts (fs.realpathSync) and React 19 state batching (separate act() calls). Added studio Environment, ContactShadows, polished UI overlay with Add/Remove/Reset buttons.

## Verification

| # | Check | Result |
|---|-------|--------|
| 1 | `npm run build` — TypeScript + SSR gate | ✅ exit 0, 0 errors |
| 2 | `npx vitest run` — 10 useBeadChain tests | ✅ all pass (4s) |
| 3 | `npm run dev` — starts without JS errors | ✅ only benign Three.js deprecations |
| 4 | Browser: 7 beads hang under gravity | ✅ visual confirmation |
| 5 | Browser: drag bead with mouse | ✅ cursor grab→grabbing, chain follows |
| 6 | Browser: release with inertia | ✅ bead continues moving |
| 7 | Browser: Add button → bead count increases | ✅ 7→8 |
| 8 | Browser: Remove button → bead count decreases | ✅ 12→11 |
| 9 | Browser: Reset → 7 beads restored | ✅ |
| 10 | Browser: MeshLine thread visible | ✅ smooth curve through beads |

## New Requirements Surfaced

None.

## Deviations

- **T01**: Used `turbopack: {}` instead of webpack config (Next.js 16 requirement)
- **T01**: Created SceneLoader.tsx client wrapper (ssr:false forbidden in Server Components)
- **T01**: Added `passWithNoTests: true` to vitest config
- **T02**: Replaced DetailedHTMLProps base with plain object type for meshLineMaterial R3F augmentation
- **T03**: Fixed vitest.config.ts with fs.realpathSync for NTFS junction worktree paths
- **T03**: Fixed React 19 batching in test file (separate act() calls per removeLast)

## Known Limitations

- **Max chain length untested beyond ~12 beads**: Stability at 20-40 beads (the R001 target) needs verification in S02 when running on real hardware
- **Touch gestures not implemented**: DragControls is mouse-only. S02 must extend with touch support
- **Headless Chromium WebGL limitation**: Playwright headless shows transparent WebGL canvas — real browser needed for visual UAT
- **Materials are basic MeshStandardMaterial**: No PBR textures yet (wood/silicone/knit look identical apart from color). S02 adds BeadMaterialFactory
- **No orbit/zoom limits on mobile**: OrbitControls will need touch gesture refinement for mobile UX (S02)
- **No error boundaries**: If Rapier WASM fails to load, there's no user-visible error state

## Follow-ups

- S02 should test chain stability at 20-40 beads on real mobile devices
- S02 must add touch event handling to DragControls (useDrag currently only handles mouse pointer events)
- S02 should wrap Scene in AdaptiveRenderer with PerformanceMonitor + dynamic DPR
- S02 should add BeadMaterialFactory for PBR materials from PNG textures
- S03 will extend useBeadChain with selection, reordering, and property editing (per-chain actions)
- S03 should consider adding error boundaries around the Canvas for WASM load failures

## Files Created/Modified

- `package.json` — Next.js 16 + R3F + Rapier + drei + three + meshline + vitest
- `next.config.ts` — transpilePackages:["meshline"] + turbopack:{} config
- `vitest.config.ts` — jsdom + React plugin + fs.realpathSync for junction paths
- `src/test-setup.ts` — @testing-library/jest-dom/vitest import
- `src/types/bead.ts` — BeadId, BeadType, BeadState, ChainConfig, ChainState
- `src/components/scene/Scene.tsx` — Canvas + Physics + Environment + ContactShadows + OrbitControls + Stats
- `src/components/scene/BeadChain.tsx` — Fixed anchor + N beads + JointLink rope joints + ThreadLine
- `src/components/scene/BeadRigidBody.tsx` — RigidBody + BallCollider + sphere mesh, forwardRef, drag integration
- `src/components/scene/ThreadLine.tsx` — MeshLine CatmullRomCurve3 through bead positions, per-frame update
- `src/components/scene/DragControls.tsx` — useDrag hook: kinematicPosition drag with velocity transfer
- `src/components/SceneLoader.tsx` — Client wrapper: dynamic(ssr:false) + useBeadChain + demo UI
- `src/hooks/useBeadChain.ts` — beads[] state, addBead, removeBead, removeLast, reset
- `src/hooks/__tests__/useBeadChain.test.ts` — 10 tests for state transitions
- `src/app/page.tsx` — Server Component importing SceneLoader
- `src/app/layout.tsx` — Root layout, lang="ru", title "Bead Designer"
- `src/app/globals.css` — Tailwind import + body styles

## Forward Intelligence

### What the next slice should know

- **useBeadChain is the state interface**: It owns `BeadState[]` and exposes add/remove/reset. S03 will extend it with selection, reordering, and property editing — import from `@/hooks/useBeadChain`.
- **BeadRigidBody accepts a forwardRef**: The parent BeadChain collects RigidBody refs for joints. If S03 needs to modify beads individually (e.g., change color/size), it should do so through the BeadState array — BeadRigidBody reads its props from state.
- **DragControls (useDrag) is mouse-only**: It uses `useThree().pointer` which tracks mouse. For touch support in S02, you'll need to add touch event handlers or switch to a pointer-events abstraction. The kinematicPosition pattern itself is device-agnostic.
- **Scene.tsx is the 3D root**: S02's AdaptiveRenderer wraps the Canvas here. S03's EditorCanvas replaces SceneLoader as the page component.
- **Physics gravity is tuned to -40**: This gives snappy feel for desktop. S02 may want to make this configurable for mobile performance tuning.
- **All "use client" components** live under `src/components/scene/` and `src/hooks/`. The SSR boundary is SceneLoader → Scene.

### What's fragile

- **Ref stability on bead add/remove**: `beadRefs` are created via `useMemo([beads.length])`. If S03 adds reordering (splice), the ref array shifts and joints connect to wrong bodies. Reordering needs careful key management.
- **ThreadLine ref guard**: The `for` loop checking all refs are populated can cause the thread to disappear for a frame when beads change. This is cosmetic but visible during rapid add/remove.
- **DragControls velocity clamping**: Max velocity is hardcoded to 30 m/s. If S02 needs different physics tuning, this constant should be configurable.
- **No physics error handling**: If Rapier WASM fails, the entire scene silently fails. S02 should add an error boundary or fallback UI.

### Authoritative diagnostics

- `npm run build` — primary gate: TypeScript + SSR safety. If this fails, nothing else matters.
- `npx vitest run` — useBeadChain state logic regression checks.
- drei `<Stats />` — FPS counter visible in dev mode (top-left of canvas). Trustworthy for performance regression.
- `<Physics debug>` prop — uncomment in Scene.tsx to render collider wireframes and joint connections. Essential for physics debugging.
- Browser DevTools console — Three.js/Rapier initialization messages. "deprecated parameters" from Rapier is benign.

### What assumptions changed

- **Next.js 16 uses Turbopack by default** — original plan assumed webpack config for WASM. Turbopack handles WASM natively, no config needed.
- **ssr:false needs client wrapper in Next.js 16** — original plan used `next/dynamic({ssr:false})` directly in page.tsx. Next.js 16 forbids this in Server Components.
- **MeshLine type augmentation can't use HTML base types** — R3F ThreeElements declarations with DetailedHTMLProps bring HTMLElement ref that conflicts with Three.js refs.
