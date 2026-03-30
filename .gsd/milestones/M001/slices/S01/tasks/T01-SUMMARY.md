---
id: T01
parent: S01
milestone: M001
provides:
  - Next.js 16 project with App Router, TypeScript, Tailwind v4
  - 3D dependencies: @react-three/fiber, @react-three/rapier, @react-three/drei, three, meshline
  - SSR-safe Canvas via SceneLoader client wrapper + dynamic(ssr: false)
  - TypeScript types: BeadId, BeadType, BeadState, ChainConfig, ChainState
  - Vitest test runner configured with jsdom + React plugin
  - Minimal Scene with Canvas + Physics + test mesh + ground plane
key_files:
  - package.json
  - next.config.ts
  - vitest.config.ts
  - src/test-setup.ts
  - src/types/bead.ts
  - src/components/scene/Scene.tsx
  - src/components/SceneLoader.tsx
  - src/app/page.tsx
  - src/app/layout.tsx
  - src/app/globals.css
key_decisions:
  - D_T01_01: Next.js 16 Turbopack requires turbopack:{} config instead of webpack config; removed webpack WASM experiment
  - D_T01_02: next/dynamic ssr:false cannot be used in Server Components in Next.js 16; created SceneLoader client wrapper
  - D_T01_03: Added passWithNoTests:true to vitest config for clean CI on scaffolding tasks
patterns_established:
  - Scene component is "use client" with Canvas + Physics + Environment + OrbitControls
  - SSR boundary via SceneLoader (client component) using next/dynamic ssr:false
  - Worktree junction path issue: dev server must run from real path (C:\Users\Andy\.gsd\projects\...) not junction path
observability_surfaces:
  - npm run build exit code — TypeScript + SSR safety gate
  - npx vitest run — test runner health
  - Browser DevTools console — Three.js/Rapier initialization errors
  - Playwright browser_evaluate WebGL context check for canvas rendering
duration: ~40m
verification_result: passed
completed_at: 2026-03-29
blocker_discovered: false
---

# T01: Scaffold Next.js project with 3D dependencies and SSR-safe Canvas

**Scaffolded Next.js 16 project with Turbopack, R3F Canvas, Rapier Physics, all TypeScript types, and vitest — build passes clean.**

## What Happened

Created the entire Next.js project from scratch using `create-next-app` with App Router, TypeScript, Tailwind v4, and ESLint. Installed 3D/physics stack (`@react-three/fiber`, `@react-three/rapier`, `@react-three/drei`, `three`, `meshline`) and test tooling (`vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`).

Two deviations from the plan were required:
1. **Next.js 16 Turbopack vs webpack**: Next.js 16 defaults to Turbopack. The planned webpack WASM config (`config.experiments.asyncWebAssembly`) causes a build failure. Fixed by adding `turbopack: {}` and removing the webpack block — Turbopack handles WASM natively.
2. **ssr:false in Server Components**: Next.js 16 forbids `next/dynamic({ ssr: false })` in Server Components. Created a `SceneLoader.tsx` client wrapper that uses dynamic import with `ssr: false`, keeping `page.tsx` as a clean Server Component.

Created `src/types/bead.ts` with all 5 slice types (BeadId, BeadType, BeadState, ChainConfig, ChainState). Created `Scene.tsx` with Canvas + Physics + Environment + OrbitControls + test pink box + ground plane. Configured `vitest.config.ts` with jsdom + React plugin + passWithNoTests.

**Worktree path issue discovered**: The `.gsd/worktrees/M001` is a Windows junction to `C:\Users\Andy\.gsd\projects\...`. Next.js dev server constructs invalid doubled paths when run from the junction. Dev server must be started from the real path.

**Browser rendering note**: In automated Playwright browser, the WebGL canvas renders with transparent pixels (WebGL context loss/recovery cycle). This is an environment limitation of the headless Chromium in the automation toolchain — not a code issue. Three.js initializes correctly (Clock deprecation warning confirms it), React mounts on the canvas element, and no errors appear. Manual browser verification is required for visual confirmation (Proof Level: human/UAT required).

## Verification

- `npm run build` — exit 0, no TypeScript errors, no SSR failures, all pages statically generated
- `npx vitest run` — exit 0 (0 tests, passWithNoTests enabled)
- Canvas element present in browser DOM with correct dimensions (1280x800)
- React fiber root mounted on canvas (confirmed via `__reactFiber$` key)
- Three.js Clock deprecation warning in server logs confirms Three.js loaded
- `transpilePackages: ["meshline"]` confirmed in next.config.ts
- All 5 types exported from `src/types/bead.ts`

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm run build` | 0 | ✅ pass | ~10s |
| 2 | `npx vitest run` | 0 | ✅ pass | ~2s |
| 3 | `npm run dev` (serves /) | 200 | ✅ pass | ~3s |
| 4 | Canvas element in DOM | present | ✅ pass | instant |
| 5 | Types export check | 5 types | ✅ pass | instant |

## Diagnostics

- `npm run build` — primary gate check for TypeScript + SSR safety
- `npx vitest run` — test runner health
- Browser DevTools console — Three.js/Rapier WASM initialization errors
- `browser_evaluate` WebGL context check (`gl.isContextLost()`) for canvas health
- Server log `[browser]` prefix lines — captured Three.js deprecation warnings confirm library loads

## Deviations

- **next.config.ts**: Used `turbopack: {}` instead of `webpack.experiments.asyncWebAssembly` (Next.js 16 requires Turbopack config)
- **SceneLoader.tsx**: New file added to wrap `next/dynamic({ ssr: false })` in a client component (Next.js 16 forbids it in Server Components)
- **vitest.config.ts**: Added `passWithNoTests: true` (not in plan, but needed for clean CI)

## Known Issues

- **Worktree junction path**: Next.js dev server fails with ENOENT when run from the junction path `D:\ProjectsOnCursor\ToyDesigner\.gsd\worktrees\M001`. Must run from real path `C:\Users\Andy\.gsd\projects\e8d021c112b7\worktrees\M001`. This affects `npm run dev` in the worktree.
- **Browser rendering in automation**: Playwright headless Chromium shows transparent WebGL canvas despite correct Three.js initialization. Manual browser testing needed for visual verification.

## Files Created/Modified

- `package.json` — Next.js 16 + R3F + Rapier + drei + three + meshline + vitest deps
- `next.config.ts` — transpilePackages:["meshline"] + turbopack:{} config
- `vitest.config.ts` — jsdom environment + React plugin + jest-dom setup
- `src/test-setup.ts` — @testing-library/jest-dom/vitest import
- `src/types/bead.ts` — BeadId, BeadType, BeadState, ChainConfig, ChainState types
- `src/components/scene/Scene.tsx` — Canvas + Physics + Environment + OrbitControls + test mesh + ground
- `src/components/SceneLoader.tsx` — Client wrapper with dynamic(ssr:false) import
- `src/app/page.tsx` — Server Component importing SceneLoader
- `src/app/layout.tsx` — Clean root layout, lang="ru", title "Bead Designer"
- `src/app/globals.css` — Tailwind import + body margin:0 overflow:hidden
