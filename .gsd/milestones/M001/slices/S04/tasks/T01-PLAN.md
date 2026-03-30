---
estimated_steps: 6
estimated_files: 5
---

# T01: DesignSerializer + store extensions

**Slice:** S04 — Шаблоны + шеринг
**Milestone:** M001

## Description

Create pure-function serialization that round-trips an array of `catalogBeadId` strings through JSON → LZ-String compression → base64url encoding (D007). Extend `useDesignStore` with `loadFromCatalogIds` and `clearDesign` actions needed by T03 (share page) and T02 (seed script). This is the risk-free foundation — no DB, no server, just deterministic encode/decode.

## Steps

1. Install `lz-string` dependency: `npm install lz-string && npm install -D @types/lz-string`
2. Add `SerializableDesign` interface to `src/types/bead.ts`:
   ```ts
   export interface SerializableDesign {
     v: 1;
     p: "pacifier-holder";
     b: string[]; // catalogBeadId strings
   }
   ```
3. Create `src/lib/serialization.ts` with two exported functions:
   - `encodeDesign(beads: BeadState[]): string` — filter beads that have `catalogBeadId`, build `SerializableDesign`, `JSON.stringify`, pass to `LZString.compressToEncodedURIComponent()`
   - `decodeDesign(code: string): SerializableDesign | null` — call `LZString.decompressFromEncodedURIComponent(code)`, `JSON.parse`, validate structure (must have `v === 1`, `p` string, `b` string array), return `null` on any error (malformed JSON, missing fields, wrong version)
4. Extend `useDesignStore` in `src/stores/useDesignStore.ts`:
   - Add `loadFromCatalogIds: (ids: string[]) => void` — clears beads, then for each ID calls `catalogBeadToBeadState(getCatalogBead(id))` and appends. Skip invalid IDs (getCatalogBead returns undefined).
   - Add `clearDesign: () => void` — sets beads to `[]`, clears selectedBeadId
5. Create `src/lib/__tests__/serialization.test.ts` with tests:
   - Round-trip: encode 1 bead → decode → same catalogBeadId
   - Round-trip: encode 7 beads → decode → same catalogBeadIds in order
   - Round-trip: encode 40 beads → decode → same catalogBeadIds
   - Invalid code returns null (random string, empty string, truncated base64)
   - Beads without catalogBeadId are skipped by encodeDesign
   - Version field is present and equals 1
   - productType is "pacifier-holder"
6. Run `npx vitest run` to verify all tests pass (existing 44 + new serialization tests)

## Must-Haves

- [ ] `encodeDesign(beads)` returns a valid URL-safe string for any BeadState array
- [ ] `decodeDesign(code)` round-trips back to the same catalogBeadId array
- [ ] `decodeDesign` returns null for invalid/malformed codes
- [ ] `loadFromCatalogIds(ids)` clears store and populates beads from catalog IDs
- [ ] `clearDesign()` sets beads to empty array
- [ ] All tests pass (existing + new)

## Observability Impact

- **Runtime signals:** `encodeDesign` and `decodeDesign` are pure functions — no runtime signals emitted. Validation failures are silent (return `null`) by design; callers (T03 share page) will surface errors to the user.
- **Inspection surfaces:** `encodeDesign`/`decodeDesign` can be called in browser console for ad-hoc testing. Store actions `loadFromCatalogIds`/`clearDesign` are inspectable via `useDesignStore.getState()` in DevTools.
- **Failure visibility:** `decodeDesign` returns `null` for malformed codes (callers handle this). Invalid catalog IDs in `loadFromCatalogIds` are silently skipped (non-fatal). No structured logging added — pure logic layer.
- **No changes to:** monitoring, error tracking, or API observability.

## Verification

- `npx vitest run src/lib/__tests__/serialization.test.ts` — all serialization tests pass
- `npx vitest run` — full test suite passes (existing 44 + new)
- `tsc --noEmit` — zero errors

## Inputs

- `src/types/bead.ts` — add SerializableDesign interface
- `src/stores/useDesignStore.ts` — add loadFromCatalogIds and clearDesign actions
- `src/data/catalogBeads.ts` — getCatalogBead used by loadFromCatalogIds
- `src/lib/catalogUtils.ts` — catalogBeadToBeadState used by loadFromCatalogIds

## Expected Output

- `src/lib/serialization.ts` — encodeDesign + decodeDesign pure functions
- `src/lib/__tests__/serialization.test.ts` — comprehensive round-trip and error-handling tests
- `src/types/bead.ts` — extended with SerializableDesign interface
- `src/stores/useDesignStore.ts` — extended with loadFromCatalogIds + clearDesign
- `package.json` — lz-string + @types/lz-string added to deps
