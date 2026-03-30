---
estimated_steps: 9
estimated_files: 9
---

# T01: Scaffold Next.js project with 3D dependencies and SSR-safe Canvas

**Slice:** S01 — 3D-физика цепочки бусин
**Milestone:** M001

## Description

Greenfield scaffolding — create the entire Next.js project from scratch with all 3D/physics dependencies, TypeScript types, SSR-safe rendering configuration, test framework, and a minimal working Canvas+Physics scene. This is the foundation every subsequent task depends on.

## Steps

1. Create Next.js project in the worktree root using `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-npm`. If prompted, accept defaults. This creates `src/app/`, `tailwind.config.ts`, `next.config.ts`, etc.

2. Install 3D/physics dependencies: `npm install @react-three/fiber @react-three/rapier @react-three/drei three meshline` and dev deps: `npm install -D @types/three vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom`.

3. Configure `next.config.ts`:
   - Add `transpilePackages: ['meshline']` — meshline is ESM-only and needs transpilation
   - Add `webpack` config to handle `.wasm` files: `config.experiments = { ...config.experiments, asyncWebAssembly: true }`
   - Keep existing Next.js defaults

4. Create `vitest.config.ts`:
   - Use `@vitejs/plugin-react` plugin
   - Set `test.environment: 'jsdom'`
   - Set `test.setupFiles: ['./src/test-setup.ts']`
   - Create `src/test-setup.ts` that imports `@testing-library/jest-dom`

5. Create `src/types/bead.ts` with all types needed by the slice:
   ```typescript
   export type BeadId = string;
   export type BeadType = 'wood' | 'silicone' | 'knit' | 'plastic';
   export interface BeadState {
     id: BeadId;
     type: BeadType;
     radius: number;
     color: string;
   }
   export interface ChainConfig {
     anchorPosition: [number, number, number];
     gravity: [number, number, number];
   }
   export interface ChainState {
     beads: BeadState[];
     config: ChainConfig;
   }
   ```

6. Create `src/components/scene/Scene.tsx` as a `"use client"` component:
   - Import `Canvas` from `@react-three/fiber`
   - Import `Physics` from `@react-three/rapier`
   - Import `OrbitControls`, `Environment` from `@react-three/drei`
   - Render `<Canvas camera={{ position: [0, 2, 8], fov: 50 }}>`
   - Inside: `<Suspense>` → `<Physics gravity={[0, -40, 0]}>` → a simple `<mesh position={[0, 1, 0]}><boxGeometry /><meshStandardMaterial color="hotpink" /></mesh>` (test mesh)
   - Add `<OrbitControls />` and `<Environment preset="city" />` for basic lighting
   - Add a ground plane: `<RigidBody type="fixed"><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}><planeGeometry args={[20, 20]} /><meshStandardMaterial color="#f0f0f0" /></mesh></RigidBody>`

7. Update `src/app/page.tsx`:
   - Keep it as Server Component
   - Import Scene via `dynamic(() => import('@/components/scene/Scene'), { ssr: false })`
   - Render Scene inside a full-viewport container: `<div className="w-screen h-screen"><Scene /></div>`
   - Remove the default Next.js boilerplate content

8. Update `src/app/layout.tsx` and `src/app/globals.css`:
   - Clean layout: set lang="ru", minimal metadata (title: "Bead Designer")
   - Ensure globals.css imports Tailwind directives and has `body { margin: 0; overflow: hidden; }` for full-viewport 3D

9. Verify: run `npm run build` — must exit 0 with no errors. Run `npm run dev` and confirm the test mesh renders in browser at http://localhost:3000.

## Must-Haves

- [ ] `npm run build` succeeds with exit code 0
- [ ] `npm run dev` starts and serves http://localhost:3000
- [ ] 3D test mesh (pink box) is visible in browser
- [ ] OrbitControls allow rotating the camera
- [ ] `src/types/bead.ts` exports BeadId, BeadType, BeadState, ChainConfig, ChainState
- [ ] `vitest.config.ts` is configured with jsdom + React plugin
- [ ] `next.config.ts` has `transpilePackages: ['meshline']`

## Verification

- `npm run build` exits 0 — no TypeScript errors, no SSR failures
- `npx vitest run` — passes (even with 0 tests, runner works)
- Manual: browser shows pink box mesh at http://localhost:3000 with orbit camera control

## Inputs

- `.gsd/milestones/M001/slices/S01/S01-PLAN.md` — slice plan with dependency list and type definitions
- `.gsd/DECISIONS.md` — D001 (React Three Fiber), D002 (React Three Rapier), D003 (Next.js), D009 (Tailwind)

## Expected Output

- `package.json` — Next.js project with 3D deps installed
- `next.config.ts` — transpilePackages + WASM config
- `vitest.config.ts` — test runner config
- `src/test-setup.ts` — jest-dom setup
- `src/types/bead.ts` — bead chain TypeScript types
- `src/components/scene/Scene.tsx` — minimal Canvas + Physics scene
- `src/app/page.tsx` — SSR-safe dynamic import of Scene
- `src/app/layout.tsx` — clean root layout
- `src/app/globals.css` — Tailwind + full-viewport body styles
