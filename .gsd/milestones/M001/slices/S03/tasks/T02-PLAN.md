---
estimated_steps: 4
estimated_files: 4
---

# T02: Create Zustand useDesignStore replacing useBeadChain

**Slice:** S03 — Каталог бусин + редактор UI
**Milestone:** M001

## Description

Create a global Zustand store (`useDesignStore`) that replaces the local `useBeadChain` hook as the single source of truth for the bead chain state. The store holds the beads array, selection state, and all mutation actions. This enables the 3D scene, catalog panel, and toolbar to all read/write the same design state.

Follow the established `dragStore` pattern from `src/lib/dragStore.ts`: simple `create()` call, `getState()` in imperative contexts.

## Steps

1. **Create `src/stores/useDesignStore.ts`** — Zustand store with:
   - State: `beads: BeadState[]` (initialized to 7 default beads), `selectedBeadId: string | null`, `productType: "pacifier-holder"`
   - Actions:
     - `addBead(catalogBeadId: string)`: look up `CATALOG_BEADS` from `src/data/catalogBeads.ts`, convert via `catalogBeadToBeadState()` from `src/lib/catalogUtils.ts`, append to beads. No-op if catalogBeadId not found. No-op if beads.length >= 40 (max chain).
     - `removeBead(id: string)`: filter out bead by id, clear selection if removed bead was selected
     - `removeSelected()`: remove bead at `selectedBeadId`, clear selection
     - `selectBead(id: string | null)`: set `selectedBeadId`
     - `resetDesign()`: restore beads to initial 7 defaults, clear selection
   - Import `CATALOG_BEADS` and `catalogBeadToBeadState` from T01 outputs.
   - Define the 7 default beads inline (same values as in `useBeadChain` DEFAULT_BEADS): wood/silicone/wood/plastic/wood/silicone/wood with matching radii and colors.

2. **Write tests in `src/stores/__tests__/useDesignStore.test.ts`** — Use `useDesignStore` directly (it's a Zustand store, no renderHook needed). Before each test, call `useDesignStore.getState().resetDesign()`. Test cases:
   - Initial state: 7 beads, selectedBeadId is null, productType is "pacifier-holder"
   - `addBead("cb-001")` increases bead count by 1 (use a real catalog bead id from CATALOG_BEADS)
   - `addBead("nonexistent")` is a no-op (count unchanged)
   - `addBead` beyond max (40) is a no-op
   - `removeBead(id)` decreases count, removes correct bead
   - `removeBead` with unknown id is a no-op
   - `selectBead("id")` sets selectedBeadId
   - `selectBead(null)` clears selection
   - `removeSelected()` removes the selected bead and clears selection
   - `removeSelected()` with no selection is a no-op
   - `resetDesign()` returns to 7 default beads and clears selection
   - All beads have required fields (id, type, radius, color)

3. **Bridge `SceneLoader` to use the store** — Update `src/components/SceneLoader.tsx` to read beads from `useDesignStore` instead of `useBeadChain`. Replace `const { beads, addBead, removeLast, reset } = useBeadChain()` with `const beads = useDesignStore(s => s.beads)`, and wire buttons to `useDesignStore.getState().addBead()`, `.removeLast()` (rename to a wrapper that removes the last bead by id), `.resetDesign()`. This is a temporary bridge — T03 will replace SceneLoader with EditorCanvas. Keep the existing overlay UI unchanged.

4. **Do NOT modify `useBeadChain` or its tests** — The existing hook and its 10 tests must continue to pass unchanged. T03 will properly deprecate the hook.

## Must-Haves

- [ ] `useDesignStore` created with all state fields and actions
- [ ] Max chain length (40) enforced in `addBead`
- [ ] `addBead` correctly converts CatalogBead → BeadState
- [ ] `removeSelected` clears selection after removing
- [ ] All 12+ store tests pass
- [ ] All 17 existing tests still pass
- [ ] SceneLoader reads beads from store and buttons work

## Verification

- `npx vitest run src/stores/__tests__/useDesignStore.test.ts` — all new tests pass
- `npx vitest run` — all tests pass (17 existing + new store tests)
- `npx tsc --noEmit` — zero TypeScript errors

## Observability Impact

- Signals added: `useDesignStore.getState()` exposes full design state — inspectable via browser console
- How a future agent inspects this: `useDesignStore.getState()` in browser console, or Zustand DevTools if installed
- Failure state exposed: If store actions break, the 3D chain won't update — visible immediately in the browser

## Inputs

- `src/types/bead.ts` — BeadState type (extended in T01)
- `src/data/catalogBeads.ts` — CATALOG_BEADS array (created in T01)
- `src/lib/catalogUtils.ts` — catalogBeadToBeadState function (created in T01)
- `src/lib/dragStore.ts` — reference for Zustand pattern
- `src/hooks/useBeadChain.ts` — reference for default bead values and existing test patterns

## Expected Output

- `src/stores/useDesignStore.ts` — new: global Zustand design store
- `src/stores/__tests__/useDesignStore.test.ts` — new: store unit tests
- `src/components/SceneLoader.tsx` — modified: reads from store instead of local hook
