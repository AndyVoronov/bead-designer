---
id: T02
parent: S03
milestone: M001
provides:
  - Global Zustand useDesignStore with beads array, selection state, and mutation actions
  - 15 unit tests covering all store actions and edge cases
  - SceneLoader bridged from useBeadChain to useDesignStore
key_files:
  - src/stores/useDesignStore.ts
  - src/stores/__tests__/useDesignStore.test.ts
  - src/components/SceneLoader.tsx
key_decisions:
  - useDesignStore follows the dragStore pattern (simple create() call, getState() for imperative contexts)
  - Default 7 beads are identical to useBeadChain's DEFAULT_BEADS for backward compatibility
  - SceneLoader bridge uses handleRemoveLast wrapper that reads last bead id and calls store removeBead
  - addBead in store takes catalogBeadId (string), not a BeadType like useBeadChain
  - useBeadChain hook and its 10 tests left untouched per plan
patterns_established:
  - Global Zustand store pattern: create() with set/get, getState() in event handlers
  - Store test pattern: direct getState() calls (no renderHook needed for Zustand)
  - Reset via beforeEach in store tests for isolation
observability_surfaces:
  - useDesignStore.getState() exposes full design state (beads, selectedBeadId) — inspectable in browser console
  - Zustand DevTools compatible (standard create() store)
duration: ~5 minutes
verification_result: passed
completed_at: 2026-03-30
blocker_discovered: false
---

# T02: Create Zustand useDesignStore replacing useBeadChain

**Created global Zustand useDesignStore with beads array, selection, and mutation actions; bridged SceneLoader to the new store; 15 tests pass alongside all 44 existing tests.**

## What Happened

Created `src/stores/useDesignStore.ts` following the `dragStore` Zustand pattern — simple `create()` call with `set`/`get`. The store holds `beads` (7 defaults matching useBeadChain), `selectedBeadId`, and `productType`. Actions include `addBead(catalogBeadId)` with max chain enforcement (40), `removeBead`, `removeSelected`, `selectBead`, and `resetDesign`.

Wrote 15 unit tests in `src/stores/__tests__/useDesignStore.test.ts` covering initial state, all actions, edge cases (nonexistent ids, max chain, no-op removals), selection clearing on remove, and CatalogBead→BeadState conversion verification.

Bridged `SceneLoader.tsx` from `useBeadChain()` to `useDesignStore(s => s.beads)`. The "Add" button calls `addBead("cb-001")`, "Remove" uses a `handleRemoveLast` wrapper that reads the last bead's id and calls `store.removeBead()`, and "Reset" calls `resetDesign()`. The existing `useBeadChain` hook and its 10 tests remain completely untouched.

## Verification

- 15 new store tests pass (initial state, addBead, removeBead, selectBead, removeSelected, resetDesign, edge cases)
- All 44 tests pass across 4 test files (existing 29 + new 15)
- Zero TypeScript errors with `tsc --noEmit`
- `useBeadChain` and its 10 tests continue to pass unchanged

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run src/stores/__tests__/useDesignStore.test.ts` | 0 | ✅ pass | 3.12s |
| 2 | `npx vitest run` | 0 | ✅ pass | 3.67s |
| 3 | `npx tsc --noEmit` | 0 | ✅ pass | ~3s |

## Diagnostics

- `useDesignStore.getState()` in browser console returns full design state (beads array, selectedBeadId)
- Compatible with Zustand DevTools for time-travel debugging
- If store actions break, the 3D chain won't update — visible immediately in the browser

## Deviations

None. Implementation followed the task plan exactly.

## Known Issues

None.

## Files Created/Modified

- `src/stores/useDesignStore.ts` — new: global Zustand design store with beads, selection, and actions
- `src/stores/__tests__/useDesignStore.test.ts` — new: 15 unit tests for the design store
- `src/components/SceneLoader.tsx` — modified: reads beads from useDesignStore instead of useBeadChain
