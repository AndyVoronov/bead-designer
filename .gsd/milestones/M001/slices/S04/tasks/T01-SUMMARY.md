---
id: T01
parent: S04
milestone: M001
provides:
  - encodeDesign / decodeDesign pure serialization functions
  - SerializableDesign type definition
  - loadFromCatalogIds and clearDesign store actions
key_files:
  - src/lib/serialization.ts
  - src/lib/__tests__/serialization.test.ts
  - src/types/bead.ts
  - src/stores/useDesignStore.ts
key_decisions:
  - Used lz-string compressToEncodedURIComponent for URL-safe encoding (D007)
  - Validation returns null for any malformed input rather than throwing
  - loadFromCatalogIds skips invalid catalog IDs silently (non-fatal)
patterns_established:
  - Serialization test pattern: round-trip 1/7/40 beads, invalid inputs, edge cases
  - Type narrowing pattern in decodeDesign using intermediate typed variable
observability_surfaces:
  - useDesignStore.getState() for inspecting loadFromCatalogIds/clearDesign results
  - encodeDesign/decodeDesign callable from browser console for ad-hoc testing
duration: 8m
verification_result: passed
completed_at: 2026-03-30T01:50:00Z
blocker_discovered: false
---

# T01: DesignSerializer + store extensions

**Added lz-string-based design serialization (encodeDesign/decodeDesign) and extended useDesignStore with loadFromCatalogIds and clearDesign actions.**

## What Happened

Installed `lz-string` + `@types/lz-string`. Added `SerializableDesign` interface (`{ v: 1, p: "pacifier-holder", b: string[] }`) to `src/types/bead.ts`. Created `src/lib/serialization.ts` with two pure functions: `encodeDesign` filters beads with `catalogBeadId`, builds the wire format, JSON-stringifies, and compresses via LZ-String's `compressToEncodedURIComponent`; `decodeDesign` reverses the pipeline with strict structural validation (version check, type checks on all fields, array element type check), returning `null` for any invalid input. Extended `useDesignStore` with `loadFromCatalogIds` (clears store, maps each ID through `getCatalogBead` → `catalogBeadToBeadState`, skips invalid IDs) and `clearDesign` (sets beads to `[]`, clears selection). Wrote 13 tests covering round-trips at 1/7/40 beads, invalid inputs (random string, empty string, truncated base64, null/undefined), beads without catalogBeadId being skipped, empty array encoding, structure validation (version, productType), and URL-safety of output.

Fixed two TypeScript errors during implementation: a missing `getCatalogBead` import in the store (import edit didn't apply on first attempt), and a type narrowing issue in `decodeDesign` where `(parsed as Record<string, unknown>).b` remained `unknown` — resolved by extracting to an intermediate `obj` variable.

## Verification

All 57 tests pass (44 existing + 13 new). TypeScript compiles with zero errors. Production build succeeds.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run src/lib/__tests__/serialization.test.ts` | 0 | ✅ pass | 3.2s |
| 2 | `npx vitest run` | 0 | ✅ pass (57/57) | 3.8s |
| 3 | `npx tsc --noEmit` | 0 | ✅ pass | 4.4s |
| 4 | `npm run build` | 0 | ✅ pass | 8.3s |

## Diagnostics

- Call `encodeDesign(beads)` / `decodeDesign(code)` from browser console for ad-hoc testing
- `useDesignStore.getState()` shows current beads, selectedBeadId, productType
- No structured logging added — pure logic layer with silent null returns for invalid input

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/types/bead.ts` — Added `SerializableDesign` interface
- `src/lib/serialization.ts` — Created `encodeDesign` and `decodeDesign` pure functions
- `src/lib/__tests__/serialization.test.ts` — Created 13 tests (round-trips, error handling, edge cases)
- `src/stores/useDesignStore.ts` — Added `loadFromCatalogIds` and `clearDesign` actions, imported `getCatalogBead`
- `package.json` — Added `lz-string` (dependency) and `@types/lz-string` (devDependency)
- `.gsd/milestones/M001/slices/S04/tasks/T01-PLAN.md` — Added Observability Impact section
