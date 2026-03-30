---
id: T01
parent: S03
milestone: M001
provides:
  - BeadShape type union, CatalogBead interface, extended BeadState
  - 100 catalog bead entries with Russian names across 4 materials
  - Prisma schema (schema-only, no migrations)
  - catalogBeadToBeadState conversion utility
  - 12 new unit tests for catalog data and utilities
key_files:
  - src/types/bead.ts
  - src/data/catalogBeads.ts
  - prisma/schema.prisma
  - src/lib/catalogUtils.ts
  - src/data/__tests__/catalogBeads.test.ts
key_decisions:
  - Catalog bead IDs use "cb-NNN" format for stable, short identifiers
  - catalogBeadToBeadState generates unique runtime ids via timestamp+random suffix
  - radius derived as size * 0.8 (catalog size is diameter-like, radius is half-ish)
  - Prisma schema includes datasource/generator blocks for valid syntax even though no migrations run yet
patterns_established:
  - Catalog data as static const array in src/data/
  - Material-specific helper functions in src/lib/catalogUtils.ts
  - Test files colocated in __tests__/ subdirectories
observability_surfaces:
  - CATALOG_BEADS array is importable and inspectable in console
  - getCatalogBead() enables runtime lookup by id
  - Type correctness verified by tsc --noEmit and vitest
duration: ~8m
verification_result: passed
blocker_discovered: false
completed_at: 2026-03-30
---

# T01: Define bead data model and create ~100 catalog beads

**Extended BeadState with catalogBeadId, created BeadShape/CatalogBead types, wrote 100 catalog beads with Russian names, added Prisma schema, and catalog-to-state utility.**

## What Happened

Extended `src/types/bead.ts` additively with `BeadShape` type union (sphere/disc/star/heart/cylinder), `CatalogBead` interface, and optional `catalogBeadId` on `BeadState`. All existing types and exports remain intact.

Created `prisma/schema.prisma` with a `Bead` model and minimal datasource/generator blocks for valid Prisma syntax. A TODO comment marks where S04 will add Template/Order models.

Wrote 100 catalog bead entries in `src/data/catalogBeads.ts` — 25 per material (wood, silicone, knit, plastic) with English/Russian names, varied shapes, hex colors, and sizes in 0.15–0.28 range. Also exported `getCatalogBead()` lookup helper.

Created `src/lib/catalogUtils.ts` with `catalogBeadToBeadState()` that maps catalog definitions to runtime BeadState objects with unique IDs and radius derived from size.

Added 12 new tests covering: catalog entry count, required field validation, material distribution balance, ID uniqueness, shape diversity, ID format, getCatalogBead lookup, and catalogBeadToBeadState mapping including unique ID generation.

## Verification

- `npx tsc --noEmit` — zero TypeScript errors
- `grep -c "cb-" src/data/catalogBeads.ts` — 108 matches (100 data entries + imports/usage)
- `grep -c "model Bead" prisma/schema.prisma` — 1
- `grep "BeadShape" src/types/bead.ts` — type confirmed
- `npx vitest run` — 29 tests pass (17 existing + 12 new)

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | ~8s |
| 2 | `grep -c "cb-" src/data/catalogBeads.ts` | 0 (108) | ✅ pass | <1s |
| 3 | `grep -c "model Bead" prisma/schema.prisma` | 0 (1) | ✅ pass | <1s |
| 4 | `grep "BeadShape" src/types/bead.ts` | 0 | ✅ pass | <1s |
| 5 | `npx vitest run` | 0 | ✅ pass | ~4s |

## Diagnostics

No runtime observability needed for this data-only task. All data is static and type-checked. Future tasks (T02+) will consume `CATALOG_BEADS` and `catalogBeadToBeadState` — any type mismatch will be caught at compile time by `tsc --noEmit`.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/types/bead.ts` — extended with BeadShape type, CatalogBead interface, catalogBeadId on BeadState
- `src/data/catalogBeads.ts` — new: 100 catalog bead entries + getCatalogBead helper
- `prisma/schema.prisma` — new: Bead model with datasource/generator
- `src/lib/catalogUtils.ts` — new: catalogBeadToBeadState conversion utility
- `src/data/__tests__/catalogBeads.test.ts` — new: 12 tests for catalog data and utilities
