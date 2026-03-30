# S01: 3D-физика цепочки бусин

**Goal:** Цепочка сферических бусин висит в 3D-сцене под гравитацией, провисает на rope-джоинтах, бусины перетаскиваются мышкой. Нить рендерится как плавная кривая (MeshLine). Десктоп-браузер, базовые MeshStandardMaterial.
**Demo:** `npm run dev` → http://localhost:3000 → цепочка из 5-10 бусин висит под якорем, качается при взаимодействии, мышка перетаскивает любую бусину, нить плавно следует за бусинами.

## Must-Haves

- Fixed anchor (RigidBody type="fixed") + массив RigidBody бусин с BallCollider, соединённых rope joints
- Гравитация и провисание цепочки — бусины висят реалистично, качаются при толчке
- MeshLine-нить по CatmullRomCurve3 через позиции тел — плавная кривая между бусинами
- Pointer-drag перетаскивание: onPointerDown → kinematicPosition → setNextKinematicTranslation → onPointerUp → dynamic + velocity (Vercel pattern)
- useBeadChain хук: beads[], addBead, removeBead, reset — пересоздаёт цепочку при изменении массива
- TypeScript типы: BeadId, BeadType, BeadState, ChainConfig, ChainState
- SSR-safe: "use client" + dynamic(ssr: false) — `npm run build` проходит без ошибок
- Минимальный UI: кнопки добавить/убрать бусину для демонстрации useBeadChain

## Proof Level

- This slice proves: contract
- Real runtime required: yes
- Human/UAT required: yes

## Verification

- `npm run build` — no TypeScript errors, no SSR build failures (the gate check)
- `npm run dev` starts without console errors
- Browser: цепочка из 5+ бусин висит под гравитацией и качается
- Browser: мышка может перетаскивать любую бусину, цепочка следует за ней
- Browser: при отпускании бусина продолжает движение по инерции
- Browser: MeshLine-нить плавно проходит через все бусины
- `npx vitest run` — useBeadChain state logic tests pass

## Observability / Diagnostics

- Runtime signals: drei `<Stats>` FPS counter (visible in dev), `<Physics debug>` prop for collider/joint overlay
- Inspection surfaces: Browser DevTools console, React DevTools for component state, Stats overlay for FPS
- Failure visibility: Console errors from Rapier WASM init, physics "explosions" (bodies flying apart — visual), MeshLine warnings from stale refs
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: nothing (first slice, greenfield)
- New wiring introduced in this slice: Next.js app entrypoint (`page.tsx`) → dynamic-imported Scene → Canvas → Physics → BeadChain → BeadRigidBody + ThreadLine + DragControls
- What remains before the milestone is truly usable end-to-end: S02 (mobile rendering + PBR materials), S03 (catalog + editor UI), S04-S07 (templates, orders, admin, deploy)

## Tasks

- [x] **T01: Scaffold Next.js project with 3D dependencies and SSR-safe Canvas** `est:45m`
  - Why: Greenfield — no source code exists. Everything must be created from scratch: Next.js project, 3D libraries, TypeScript types, SSR configuration, test framework, and a minimal working Canvas+Physics scene that renders without errors.
  - Files: `package.json`, `next.config.ts`, `tsconfig.json`, `src/types/bead.ts`, `src/components/scene/Scene.tsx`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `vitest.config.ts`
  - Do: Run `create-next-app` with App Router + TypeScript + Tailwind + no src dir (use `src/`). Install `@react-three/fiber @react-three/rapier @react-three/drei three @types/three meshline`. Configure `next.config.ts`: `transpilePackages: ['meshline']`, `webpack` config for WASM `.wasm` file handling. Set up `vitest.config.ts` with jsdom environment. Create `src/types/bead.ts` with all types from research. Create minimal `Scene.tsx` with `Canvas` + `<Physics gravity={[0, -40, 0]}>` + drei `Environment` + `<OrbitControls>` + a simple test mesh. Wire into `page.tsx` via `dynamic(() => import(Scene), { ssr: false })`. Confirm `npm run build` passes.
  - Verify: `npm run build` exits 0; `npm run dev` starts and serves http://localhost:3000 without console errors
  - Done when: `npm run build` succeeds, `npm run dev` renders a 3D scene with a test mesh visible in browser

- [x] **T02: Build physics bead chain with rope joints and MeshLine thread** `est:1.5h`
  - Why: This is the core of R001 — the physical bead chain with realistic rope physics. Without this, there's no product. Uses the proven Vercel badge architecture: fixed anchor → array of dynamic RigidBodies → rope joints between neighbors.
  - Files: `src/components/scene/BeadRigidBody.tsx`, `src/components/scene/BeadChain.tsx`, `src/components/scene/ThreadLine.tsx`, `src/components/scene/Scene.tsx`
  - Do: Create `BeadRigidBody`: RigidBody with `BallCollider` + `<mesh>` sphere, accepts bead props (radius, color, damping). Set `angularDamping={2} linearDamping={2}` on each body for stability. Create `BeadChain`: renders a fixed anchor RigidBody at `[0, 2, 0]`, then N `BeadRigidBody` components below it. Connect each pair with `useRopeJoint` — anchor→bead1, bead1→bead2, etc. Store body refs in a useRef map keyed by index. Create `ThreadLine`: in useFrame, read `rigidBody.translation()` from all body refs, build `CatmullRomCurve3`, update a `MeshLine` geometry. Use `extend({ MeshLineGeometry, MeshLineMaterial })` from meshline. Wire BeadChain into Scene replacing the test mesh. Use 7 beads as default. Confirm chain hangs and swings.
  - Verify: `npm run build` exits 0; in browser, 7 beads hang from anchor under gravity and swing when disturbed
  - Done when: Chain of 7+ beads hangs realistically under gravity with rope joints, visible MeshLine thread connecting them

- [ ] **T03: Add pointer drag, useBeadChain hook, and visual polish** `est:1.5h`
  - Why: Completes R001 (interactive drag) and R011 (beautiful visuals). The Vercel kinematicPosition pattern lets users grab and throw beads. useBeadChain provides the state interface for downstream slices (S03 editor). Visual polish (Environment, ContactShadows, lighting) makes the demo emotionally engaging.
  - Files: `src/components/scene/DragControls.tsx`, `src/hooks/useBeadChain.ts`, `src/components/scene/BeadRigidBody.tsx`, `src/components/scene/Scene.tsx`, `src/app/page.tsx`, `src/hooks/__tests__/useBeadChain.test.ts`
  - Do: Implement DragControls as a hook/component: on `onPointerDown` on a BeadRigidBody mesh → call `setBodyType('kinematicPosition')` + `wakeUp()`, track pointer via useFrame with `setNextKinematicTranslation()`. On `onPointerUp`: compute velocity from last 2 frames delta, call `setLinvel()` + `setAngvel()`, switch back to `type='dynamic'`. Integrate into BeadRigidBody. Create `useBeadChain` hook: `beads[]` state (array of BeadState), `addBead()`, `removeBead(id)`, `reset()`. Each bead gets a unique BeadId. Write vitest test for the hook's state transitions. Enhance Scene: add drei `Environment preset="studio"`, `ContactShadows`, warm directional + ambient lighting, `<Stats>` for FPS monitoring. Wire useBeadChain into page.tsx with minimal demo buttons ("Add bead", "Remove last", "Reset"). Ensure `npm run build` passes.
  - Verify: `npx vitest run` passes; `npm run build` exits 0; in browser, can drag any bead and chain follows, beads have inertia on release, add/remove buttons change chain length
  - Done when: Full interactive demo works — drag beads with mouse, chain follows, beads swing with inertia, add/remove changes chain, scene looks polished

## Files Likely Touched

- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `vitest.config.ts`
- `src/types/bead.ts`
- `src/components/scene/Scene.tsx`
- `src/components/scene/BeadChain.tsx`
- `src/components/scene/BeadRigidBody.tsx`
- `src/components/scene/ThreadLine.tsx`
- `src/components/scene/DragControls.tsx`
- `src/hooks/useBeadChain.ts`
- `src/hooks/__tests__/useBeadChain.test.ts`
- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`
