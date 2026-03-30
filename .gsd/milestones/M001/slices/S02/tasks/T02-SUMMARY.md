---
id: T02
parent: S02
milestone: M001
provides:
  - Type-specific PBR materials for all 4 BeadTypes (wood, silicone, knit, plastic)
  - BeadMaterial React component replacing inline meshStandardMaterial in BeadRigidBody
  - BeadRigidBody now accepts `type: BeadType` prop from BeadChain
  - Material config unit tests (7 assertions)
key_files:
  - src/lib/beadMaterialConfig.ts
  - src/components/scene/BeadMaterial.tsx
  - src/components/scene/BeadRigidBody.tsx
  - src/components/scene/BeadChain.tsx
  - src/components/scene/__tests__/beadMaterial.test.ts
  - vitest.config.ts
key_decisions:
  - Added `resolve.alias` for `@/` in vitest.config.ts — existing tests only used `import type` (erased at runtime) so the alias was never actually resolved by Vite before
  - Procedural bump texture via 16×16 canvas noise instead of external texture files (no textures available until S03/S06)
  - `BeadMaterial` component designed to accept future `textureUrl` prop for drei `useTexture` integration
patterns_established:
  - Material configuration map pattern: pure TypeScript `Record<BeadType, Config>` with typed interface + helper getter function
  - Procedural texture generation via `document.createElement('canvas')` + `THREE.CanvasTexture` for bump maps
observability_surfaces:
  - `BEAD_MATERIAL_CONFIGS` can be inspected directly in code to verify material differentiation contract
  - Unit tests validate: all roughness/metalness in [0,1], knit roughest, silicone smoothest, all types distinct
  - Browser Three.js inspector shows per-bead material properties (roughness, metalness, bumpMap, envMapIntensity)
duration: ~15m
verification_result: passed
completed_at: 2026-03-30T01:38:00Z
blocker_discovered: false
---

# T02: Create type-specific PBR materials for beads

**Created PBR material config map and BeadMaterial component replacing inline meshStandardMaterial, giving each bead type visually distinct roughness, metalness, and bump properties.**

## What Happened

Created `src/lib/beadMaterialConfig.ts` with a typed configuration map for all 4 BeadTypes (wood: roughness 0.75, silicone: 0.2, knit: 0.9, plastic: 0.35). Built `BeadMaterial.tsx` component that applies these PBR properties via `<meshStandardMaterial>` and generates procedural 16×16 canvas noise bump textures for wood and knit types. Modified `BeadRigidBody.tsx` to accept a new `type: BeadType` prop and use `<BeadMaterial>` instead of the previous inline material (roughness=0.3, metalness=0.1). Updated `BeadChain.tsx` to pass `bead.type` through to `BeadRigidBody`.

Also fixed a latent issue: `vitest.config.ts` had no `resolve.alias` for `@/` — the existing `useBeadChain.test.ts` only used `import type` (erased at compile time), so Vite never actually resolved the alias at runtime. The new material config tests use value imports, exposing the gap. Added `resolve.alias: { "@": path.resolve(realRoot, "src") }` to the vitest config.

## Verification

- 7 new unit tests pass: all 4 BeadTypes have configs, roughness/metalness in [0,1], wood rougher than silicone, knit roughest, silicone smoothest, all roughness values distinct
- All 17 tests pass (10 existing useBeadChain + 7 new beadMaterial)
- `npm run build` compiles with zero TypeScript errors
- Browser: scene renders with 7+ beads, no console errors, all material types applied correctly

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run src/components/scene/__tests__/beadMaterial.test.ts` | 0 | ✅ pass | ~3s |
| 2 | `npx vitest run` (all 17 tests) | 0 | ✅ pass | ~4s |
| 3 | `npm run build` | 0 | ✅ pass | ~20s |
| 4 | Browser: 11 beads rendered, no console errors | 0 | ✅ pass | visual |

## Diagnostics

- Run `npx vitest run src/components/scene/__tests__/beadMaterial.test.ts` to validate material config invariants
- Inspect per-bead materials in browser via Three.js panel: right-click bead → inspect → material.roughness, material.metalness, material.bumpMap
- `getBeadMaterialConfig(type)` is the single entry point — any future texture-loading logic should be added there

## Deviations

- Added `resolve.alias` for `@/` in `vitest.config.ts` — this was a latent bug that didn't surface until this task added value imports via `@/` path. Existing tests only used `import type` which is erased by the compiler.

## Known Issues

None.

## Files Created/Modified

- `src/lib/beadMaterialConfig.ts` — new: PBR material config map with typed interface and helper function
- `src/components/scene/BeadMaterial.tsx` — new: React component applying type-specific PBR properties with procedural bump textures
- `src/components/scene/BeadRigidBody.tsx` — modified: added `type: BeadType` prop, replaced inline `<meshStandardMaterial>` with `<BeadMaterial>`
- `src/components/scene/BeadChain.tsx` — modified: passes `bead.type` to `<BeadRigidBody>`
- `src/components/scene/__tests__/beadMaterial.test.ts` — new: 7 unit tests for material config
- `vitest.config.ts` — modified: added `resolve.alias` for `@/` path
