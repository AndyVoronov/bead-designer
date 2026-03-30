---
id: T02
parent: S01
milestone: M001
provides:
  - BeadRigidBody component: RigidBody + BallCollider + visual sphere with configurable radius/color/damping
  - BeadChain component: fixed anchor + N dynamic beads connected by rope joints (useRopeJoint)
  - ThreadLine component: MeshLine smooth curve through all bead positions updated every frame
  - Updated Scene.tsx: 7 demo beads hanging from anchor with ThreadLine, Stats FPS overlay
key_files:
  - src/components/scene/BeadRigidBody.tsx
  - src/components/scene/BeadChain.tsx
  - src/components/scene/ThreadLine.tsx
  - src/components/scene/Scene.tsx
key_decisions:
  - D_T02_01: Replaced DetailedHTMLProps-based meshLineMaterial type augmentation with plain object type to fix TypeScript build error (HTML ref types incompatible with Three.js MeshLineMaterial)
  - D_T02_02: useRopeJoint params passed as [[0,0,0],[0,0,0],length] — library destructures as [body1Anchor, body2Anchor, length] and converts via vector3ToRapierVector which handles arrays
patterns_established:
  - JointLink pattern: separate component calling useRopeJoint for each body pair (hooks can't be called in loops)
  - Stable ref objects via useMemo keyed on beads.length (avoid ref recreation on re-render)
  - MeshLine type augmentation pattern: extend ThreeElements with plain object types, include attach/args props
  - useFrame ThreadLine update: read Rapier body translations, build CatmullRomCurve3, call geoRef.setPoints
  - Ref guard pattern: skip useFrame update until all body refs are populated
observability_surfaces:
  - drei Stats FPS overlay visible in dev (canvas[1] renders at 80x48)
  - Physics debug prop available on Physics component for collider/joint wireframe overlay
  - Console: Rapier WASM "deprecated parameters" message confirms init; Three.js Clock/ShadowMap deprecations confirm load
  - WebGL context check via gl.isContextLost() for canvas health
duration: ~20m
verification_result: passed
completed_at: 2026-03-29
blocker_discovered: false
---

# T02: Build physics bead chain with rope joints and MeshLine thread

**Fixed TypeScript build error in ThreadLine meshLineMaterial type augmentation; verified physics bead chain architecture (BeadRigidBody + BeadChain rope joints + ThreadLine MeshLine) compiles and initializes without runtime errors.**

## What Happened

All four component files (`BeadRigidBody.tsx`, `BeadChain.tsx`, `ThreadLine.tsx`, `Scene.tsx`) already existed from a prior attempt with the correct architecture matching the task plan. The only issue was a TypeScript build error in `ThreadLine.tsx`: the `meshLineMaterial` type augmentation in the R3F `ThreeElements` declaration used `React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>` as its base type, which brought HTML ref types (`HTMLElement`) incompatible with Three.js `MeshLineMaterial`. The `<meshLineMaterial ref={matRef}>` JSX caused a type error because `RefObject<MeshLineMaterial>` was not assignable to `RefObject<HTMLElement>`.

Fixed by replacing the `DetailedHTMLProps` base with a plain object type containing only the MeshLineMaterial-specific props (`color`, `lineWidth`, `resolution`, `sizeAttenuation`, etc.) plus R3F-required `attach` and `args` properties. This eliminates the HTML ref type conflict entirely.

Verified runtime correctness through multiple checks:
- **Build**: `npm run build` passes clean (0 errors, 4 static pages generated)
- **Dev server**: Starts on real path (junction workaround from T01), no JS errors
- **Canvas**: Element present (2560×1600 @ 2x DPR), WebGL context alive and not lost
- **Three.js**: Initialized (Clock/ShadowMap deprecation warnings confirm library loads)
- **Rapier WASM**: Initialized cleanly ("deprecated parameters" message is benign)
- **Stats overlay**: drei `<Stats>` renders (visible 80×48 canvas), confirming active render loop
- **useRopeJoint API**: Verified against library source — destructures params as `[body1Anchor, body2Anchor, length]`, `vector3ToRapierVector` handles `[x,y,z]` arrays correctly
- **Ref propagation**: Traced full chain (useForwardedRef → useImperativeInstance → React effect ordering) confirming body refs are populated before JointLink effects run
- **Visual rendering**: Headless Chromium returns all-zero WebGL framebuffer pixels (known T01 limitation — requires real browser for visual verification)

## Verification

- `npm run build` exits 0 — TypeScript compiles, all pages statically generated
- `npm run dev` starts without console errors (only benign Three.js/Rapier deprecations)
- Canvas element mounted with valid WebGL context (not lost)
- React fiber root on canvas confirms R3F mounted
- No JS errors from Rapier WASM, Three.js, or meshline
- Visual verification (beads hanging, rope joints, MeshLine curve) requires real browser — blocked by headless Chromium WebGL limitation from T01

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm run build` | 0 | ✅ pass | ~8s |
| 2 | `npm run dev` (serves /) | 200 | ✅ pass | ~1s |
| 3 | `npx vitest run` | 0 | ✅ pass | ~1s |
| 4 | Canvas element in DOM | present | ✅ pass | instant |
| 5 | WebGL context check | alive | ✅ pass | instant |
| 6 | Console JS errors | 0 | ✅ pass | 5s |
| 7 | Browser visual (beads) | blocked* | ⚠️ skip | n/a |

\* Headless Chromium WebGL framebuffer returns all-zero pixels (known T01 issue). Real browser UAT required for visual confirmation.

## Diagnostics

- `npm run build` — TypeScript + SSR safety gate (primary check)
- `npm run dev` — runtime initialization check (Rapier WASM, Three.js, meshline)
- Browser DevTools console — Three.js/Rapier initialization warnings, JS errors
- `browser_evaluate` — WebGL context health (`gl.isContextLost()`), canvas element verification
- `<Stats>` overlay — FPS counter confirms render loop is active
- `<Physics debug>` prop — uncomment in Scene.tsx to render collider wireframes and joint connections for debugging
- Physics "explosion" detection — bodies flying apart visually indicates solver instability (mitigated by damping=2 on all bodies, gravity=-40)

## Deviations

- **ThreadLine.tsx type augmentation**: Replaced `React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>` base with plain object type for `meshLineMaterial` in `ThreeElements` declaration. This was a required fix — the HTML types are incompatible with Three.js material refs.
- **ThreadLine.tsx args/attach props**: Added `attach` and `args` (ConstructorParameters) to both `meshLineGeometry` and `meshLineMaterial` type augmentations for completeness.

## Known Issues

- **Headless Chromium WebGL rendering**: Same as T01 — Playwright headless Chromium shows blank/transparent WebGL canvas despite correct Three.js initialization. The 3D scene is structurally sound (canvas mounted, WebGL context alive, render loop active, Stats rendering) but pixel output is all-zero. Requires real browser for visual confirmation of bead chain, rope joints, and MeshLine thread.
- **Worktree junction path**: Dev server must run from real path `C:\Users\Andy\.gsd\projects\e8d021c112b7\worktrees\M001`, not junction path `D:\ProjectsOnCursor\ToyDesigner\.gsd\worktrees\M001` (from T01).

## Files Created/Modified

- `src/components/scene/BeadRigidBody.tsx` — Physics bead component: RigidBody + BallCollider + mesh sphere with forwardRef for joint refs (unchanged from prior attempt)
- `src/components/scene/BeadChain.tsx` — Full chain: fixed anchor + N dynamic beads + JointLink rope joints + ThreadLine integration (unchanged from prior attempt)
- `src/components/scene/ThreadLine.tsx` — MeshLine smooth curve through all bead positions, updated every frame via useFrame (fixed meshLineMaterial type augmentation)
- `src/components/scene/Scene.tsx` — Updated with BeadChain + 7 demo beads + Stats FPS overlay + ContactShadows (unchanged from prior attempt)
