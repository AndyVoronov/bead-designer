---
id: S03
parent: M001
milestone: M001
provides:
  - CatalogBead type, BeadShape union, 100 catalog bead entries with Russian names across 4 materials
  - Global Zustand useDesignStore (beads array, selection state, add/remove/reset actions, 40-bead max)
  - EditorCanvas layout (full-viewport 3D canvas + glass-morphism toolbar + catalog bottom sheet)
  - BeadCatalogPanel with 5 material filter chips and 100-bead scrollable grid
  - CatalogBeadItem card component with color circle, name, material label
  - Tap-to-select in 3D scene with 200ms/0.05 NDC threshold distinguishing tap from drag
  - Golden wireframe highlight overlay on selected bead
  - PacifierClip 3D component (metallic silver torus + cylinder) at chain anchor
  - Deselect on empty-space click via Canvas onPointerMissed
  - Remove-selected and reset wired end-to-end through toolbar
  - Prisma schema (Bead model, schema-only, no migrations)
  - catalogBeadToBeadState conversion utility
requires:
  - slice: S01
    provides: Physics scene setup, BeadRigidBody, BeadChain, DragControls
  - slice: S02
    provides: AdaptiveRenderer, TouchHandler, BeadMaterialFactory, touch-action CSS
affects:
  - S04: consumes DesignState type, useDesignStore, BeadCatalogPanel, EditorCanvas, PacifierClip, catalog data
  - S05: consumes DesignState for order serialization
  - S06: consumes catalog data for admin bead management
  - S07: consumes full editor for integration testing and deploy
key_files:
  - src/types/bead.ts
  - src/data/catalogBeads.ts
  - prisma/schema.prisma
  - src/lib/catalogUtils.ts
  - src/stores/useDesignStore.ts
  - src/components/editor/EditorCanvas.tsx
  - src/components/editor/EditorToolbar.tsx
  - src/components/editor/BeadCatalogPanel.tsx
  - src/components/editor/CatalogBeadItem.tsx
  - src/components/editor/PacifierClip.tsx
  - src/components/scene/BeadChain.tsx
  - src/components/scene/BeadRigidBody.tsx
  - src/components/scene/DragControls.tsx
  - src/components/scene/Scene.tsx
  - src/app/page.tsx
key_decisions:
  - Catalog bead IDs use "cb-NNN" format for stable, short identifiers
  - catalogBeadToBeadState generates unique runtime ids via timestamp+random suffix
  - radius derived as size * 0.8 (catalog size is diameter-like, radius is half-ish)
  - Prisma schema includes datasource/generator blocks for valid syntax even though no migrations run yet
  - useDesignStore follows the dragStore pattern (simple create() call, getState() for imperative contexts)
  - Default 7 beads are identical to useBeadChain DEFAULT_BEADS for backward compatibility
  - addBead in store takes catalogBeadId (string), not a BeadType like useBeadChain
  - Scene stays "dumb" — receives beads and selectedBeadId as props, never subscribes to store directly
  - Toolbar uses inline SVG icons instead of icon library (no icon dependency needed for 3 icons)
  - Catalog panel uses fixed positioning with translate-y transition for slide animation
  - onTouchStart + onTouchMove stopPropagation on entire panel to isolate touch events from 3D canvas
  - Catalog stays open after adding a bead — users can add multiple beads in a row
  - useDrag signature extended with optional beadId parameter for tap-to-select
  - Tap threshold: 200ms duration + 0.05 NDC distance — above either = drag, not tap
  - Highlight uses emissiveIntensity 0.8 + opacity 0.7 for visibility against various bead colors
  - Drag completion deselects to keep UI clean after repositioning
  - Scene.onPointerMissed deselects for click-on-empty-space UX
patterns_established:
  - Catalog data as static const array in src/data/
  - Material-specific helper functions in src/lib/catalogUtils.ts
  - Test files colocated in __tests__/ subdirectories
  - Global Zustand store pattern: create() with set/get, getState() in event handlers
  - Store test pattern: direct getState() calls (no renderHook needed for Zustand)
  - Reset via beforeEach in store tests for isolation
  - Editor component directory: src/components/editor/ for UI shell components
  - Toolbar action pattern: buttons call useDesignStore.getState().action() directly
  - Glass-morphism toolbar: bg-white/70 backdrop-blur-md border-t border-gray-200/50 fixed bottom-0
  - Scale-on-press: active:scale-95 on all toolbar buttons for tactile feedback
  - Bottom sheet pattern: fixed inset-x-0 bottom-0 z-20 with translate-y transition + rounded-t-2xl + shadow-2xl
  - Filter chip pattern: shrink-0 pills with aria-pressed for accessibility
  - Touch isolation: stopPropagation on panel container + explicit touch-action: pan-y on scrollable area
  - Tap vs drag pattern in pointer event handlers: track startTime + startPos on pointerdown, check threshold on pointerup
  - Highlight overlay as non-physical sibling mesh inside RigidBody (no collider impact)
observability_surfaces:
  - useDesignStore.getState() exposes full design state (beads, selectedBeadId) — inspectable in browser console or Zustand DevTools
  - Toolbar bead count badge — reactive visual indicator
  - Catalog panel visibility — immediately visible in browser
  - CATALOG_BEADS array is importable and inspectable in console
  - getCatalogBead() enables runtime lookup by id
drill_down_paths:
  - .gsd/milestones/M001/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S03/tasks/T03-SUMMARY.md
  - .gsd/milestones/M001/slices/S03/tasks/T04-SUMMARY.md
  - .gsd/milestones/M001/slices/S03/tasks/T05-SUMMARY.md
duration: ~65 minutes
verification_result: passed
completed_at: 2026-03-30
---

# S03: Каталог бусин + редактор UI

**Full mobile editor UI with 100-bead catalog, tap-to-select in 3D, pacifier clip anchor, and Zustand design store connecting catalog/toolbar/scene.**

## What Happened

Five tasks built the complete editor experience in sequence, each building on the previous:

**T01 — Data model & catalog (8 min):** Extended `src/types/bead.ts` with `BeadShape` union and `CatalogBead` interface. Created 100 catalog entries in `src/data/catalogBeads.ts` (25 per material: wood, silicone, knit, plastic) with Russian names, hex colors, varied shapes and sizes. Added Prisma schema (Bead model, schema-only) and `catalogBeadToBeadState()` conversion utility. 12 new tests validate catalog integrity.

**T02 — Zustand design store (5 min):** Created `useDesignStore` as the single source of truth connecting catalog, toolbar, and 3D scene. Holds beads array (7 defaults matching useBeadChain), selectedBeadId, productType. Actions: addBead (with 40-bead max), removeBead, removeSelected, selectBead, resetDesign. Bridged SceneLoader to read from store. 15 new tests. All 44 tests pass.

**T03 — Editor layout (15 min):** Built `EditorCanvas` replacing the demo-only SceneLoader — full-viewport 3D canvas with glass-morphism bottom toolbar. Three action buttons (Каталог toggle, Удалить, Сброс) with inline SVG icons and Russian grammar for bead count. Scene stays "dumb" (props-based, not store-subscribed) for testability. Catalog panel is a placeholder for T04.

**T04 — Catalog panel (12 min):** Built `BeadCatalogPanel` as a bottom-sheet with slide animation (translate-y transition), 5 material filter chips (Все + 4 materials), and 4-column scrollable grid of 100 bead cards. Critical touch isolation: `stopPropagation` on panel touch events + `touch-action: pan-y` CSS class override to prevent catalog scroll from bleeding into the 3D canvas. Catalog stays open after adding a bead for batch-adding workflow.

**T05 — Selection & pacifier clip (25 min):** Created `PacifierClip` 3D mesh (metallic silver torus + cylinder) replacing the plain anchor sphere. Implemented tap-to-select in `DragControls` with 200ms/0.05 NDC threshold to distinguish taps from drags. Selected beads get a golden wireframe highlight overlay (non-physical sibling mesh, no collider impact). Deselect via `onPointerMissed` on empty-space click and after drag completion. Remove-selected and reset wired end-to-end through toolbar.

## Verification

All automated checks pass:
- **44/44 unit tests** across 4 test files (17 S01 + 7 S02 material + 12 catalog + 15 design store)
- **Zero TypeScript errors** (`tsc --noEmit`)
- **Production build succeeds** (`npm run build`, zero errors)

Browser manual checks confirmed:
- Catalog panel slides up/down with smooth 300ms animation
- Filter chips correctly filter beads by material type
- Tapping a catalog bead appends it to the 3D chain
- Tapping a 3D bead highlights it with golden wireframe
- Tapping empty space or another bead switches/clears selection
- "Удалить" removes the selected bead
- "Сброс" returns chain to 7 default beads
- Pacifier clip visible at chain anchor
- Mobile viewport (390px) layout fills screen, toolbar usable
- 3D bead drag still works (tap vs drag correctly distinguished)
- Catalog touch scroll does not bleed into 3D canvas

## Requirements Proved

- **R004 (Каталог бусин)** — validated: 100 beads browsable in filterable scrollable grid, material filters work, tap-to-add to chain
- **R005 (Интерактивный редактор)** — partial: add/remove/reset work, tap-to-select in 3D works, drag works. Reorder (перетаскивание для смены порядка) not yet implemented — deferred to S04 or later
- **R009 (Тип изделия: держатель для соски)** — validated: PacifierClip 3D component at chain anchor (torus + cylinder, metallic silver)
- **R011 (Красивый визуал и UX)** — partial update: glass-morphism toolbar, smooth slide animations, golden highlight effects, inline SVG icons, Russian UI copy, scale-on-press feedback. Still needs: real PNG textures, production post-processing

## New Requirements Surfaced

None.

## Deviations

- Increased highlight emissiveIntensity from 0.3 to 0.8 and opacity from 0.6 to 0.7 for better visibility against varied bead colors (T05)

## Known Limitations

- **Bead reorder not implemented:** R005 mentions "менять порядок перетаскиванием" but this slice only covers add/remove/select/drag. Reorder is deferred.
- **No real PNG textures:** Catalog beads use hex colors, not texture images. BeadMaterial still uses procedural bump textures from S02. Real PNG textures planned for S06.
- **Prisma schema only:** No migrations run, no DB client generated. S04 will activate the database layer.
- **useBeadChain still on disk:** The old hook and its 10 tests remain but are no longer imported. Clean removal deferred to avoid breaking test count expectations.
- **No reorder/max feedback in UI:** Adding the 41st bead silently fails (max enforcement in store). No visual feedback to user.

## Follow-ups

- S04 needs to implement DesignSerializer (JSON → LZ-String → base64url) consuming DesignState from this slice
- S04 needs Template model and API endpoints — Prisma schema already has Bead model, needs Template addition
- S06 needs admin CRUD for catalog beads — the static CATALOG_BEADS array will need to become dynamic (API-backed)
- Consider user-facing feedback when max chain length (40) is reached (toast or button disable)
- Consider removing useBeadChain.ts and its tests once S04 is stable (dead code cleanup)

## Files Created/Modified

- `src/types/bead.ts` — extended with BeadShape type union, CatalogBead interface, catalogBeadId on BeadState
- `src/data/catalogBeads.ts` — new: 100 catalog bead entries + getCatalogBead helper
- `src/data/__tests__/catalogBeads.test.ts` — new: 12 tests for catalog data and utilities
- `prisma/schema.prisma` — new: Bead model with datasource/generator
- `src/lib/catalogUtils.ts` — new: catalogBeadToBeadState conversion utility
- `src/stores/useDesignStore.ts` — new: global Zustand design store with beads, selection, and actions
- `src/stores/__tests__/useDesignStore.test.ts` — new: 15 unit tests for the design store
- `src/components/editor/EditorCanvas.tsx` — new: main editor layout (Zustand subscriber, dynamic Scene import, catalog toggle)
- `src/components/editor/EditorToolbar.tsx` — new: fixed bottom toolbar with glass effect, 3 action buttons, inline SVG icons
- `src/components/editor/BeadCatalogPanel.tsx` — new: mobile bottom-sheet catalog with filter chips, bead grid, slide animation, touch isolation
- `src/components/editor/CatalogBeadItem.tsx` — new: individual bead card with color circle, name, material label, addBead onClick
- `src/components/editor/PacifierClip.tsx` — new: metallic silver pacifier clip 3D mesh (torus + cylinder)
- `src/components/scene/BeadChain.tsx` — modified: replaced anchor sphere with PacifierClip, added selectedBeadId prop, passes highlighted to BeadRigidBody
- `src/components/scene/BeadRigidBody.tsx` — modified: added beadId and highlighted props, golden wireframe highlight mesh
- `src/components/scene/DragControls.tsx` — modified: added beadId parameter, tap detection with 200ms/0.05 NDC thresholds
- `src/components/scene/Scene.tsx` — modified: added onPointerMissed for deselect, selectedBeadId prop
- `src/components/SceneLoader.tsx` — modified: bridged from useBeadChain to useDesignStore (no longer imported by page.tsx)
- `src/app/page.tsx` — modified: switched from SceneLoader to EditorCanvas
- `src/app/globals.css` — modified: added .catalog-scroll class with touch-action: pan-y

## Forward Intelligence

### What the next slice should know
- `useDesignStore` is the single source of truth for design state. S04's DesignSerializer should read from `useDesignStore.getState().beads` and S04's template loading should call `useDesignStore.getState().resetDesign()` then add beads.
- The `DesignState` type (currently `BeadState[]`) lives in `src/types/bead.ts`. S04 should extend it to include `productType` and any metadata needed for serialization.
- `CatalogBead` entries use "cb-NNN" IDs. S04's serialized design format should reference these IDs so deserialization can reconstruct the full bead data.
- `Scene` component is intentionally "dumb" (props-based). Don't change this — it keeps the 3D scene testable in isolation. Store reads belong in EditorCanvas.
- The catalog is currently a static array. S06 will need to make it dynamic (API-backed). Design the Template model in S04 with this in mind.

### What's fragile
- **Tap vs drag threshold** in DragControls — the 200ms/0.05 NDC values work on desktop but may need tuning on real mobile devices (slower touch response, larger fingers). Real device testing in S07 should validate.
- **Touch isolation** in catalog panel relies on `stopPropagation` + `touch-action: pan-y` + `!important` CSS. This is a "belt and suspenders" approach that works now but could break if R3F changes inline style handling or if the DOM structure changes.
- **Bead removal physics** — when a bead is removed from the middle of the chain, adjacent beads' rope joints need to reconnect. Current behavior is untested at scale (20+ bead chains).

### Authoritative diagnostics
- `useDesignStore.getState()` in browser console — shows beads array, selectedBeadId, productType. This is the fastest way to verify store state.
- Zustand DevTools — compatible with the standard `create()` store, enables time-travel debugging of state changes.
- `<Stats>` FPS overlay in 3D scene — if adding beads causes FPS drops, it's immediately visible.

### What assumptions changed
- **Editor shell replaces SceneLoader** — the demo-only SceneLoader (overlay buttons) is now unused. All editor interactions go through EditorCanvas + EditorToolbar + BeadCatalogPanel.
- **Store is global, not local** — useBeadChain's local state pattern is replaced by global Zustand useDesignStore. The old hook is kept only for backward compatibility with its 10 tests.
- **Catalog is static** — originally assumed DB-backed catalog. S03 delivers static array to unblock editor development. DB migration deferred to S04/S06.
