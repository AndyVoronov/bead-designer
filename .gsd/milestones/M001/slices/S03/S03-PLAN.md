# S03: Каталог бусин + редактор UI

**Goal:** Пользователь на мобильном листает каталог бусин, добавляет/удаляет бусины на цепочку, собирает держатель для соски. Полный редакторский UI.
**Demo:** Открыть приложение → видна цепочка бусин с клипсой-держателем → тапнуть на каталог (bottom sheet) → отфильтровать по материалу → тапнуть на бусину → она появляется на цепочке → тапнуть на бусину в 3D → она подсвечивается → нажать «Удалить» → бусина исчезает → нажать «Сброс» → цепочка возвращается к началу.

## Must-Haves

- ~100 бусин в статическом каталоге с метаданными (форма, размер, материал, цвет)
- Zustand `useDesignStore` — глобальное состояние дизайна, замена локального `useBeadChain`
- Мобильный editor layout: 3D canvas на весь экран + toolbar внизу + bottom sheet каталог
- Catalog panel: горизонтальные фильтры по материалу + вертикальная сетка бусин
- Добавление бусины из каталога на цепочку (append only)
- Выделение бусины тапом в 3D (tap vs drag threshold) + подсветка выделенной
- Удаление выделенной бусины кнопкой в toolbar
- Сброс цепочки к начальным бусинам
- PacifierClip 3D компонент (замена plain sphere anchor)
- Все существующие 17 тестов продолжают проходить
- Prisma schema для модели Bead (schema only, без миграций)

## Proof Level

- This slice proves: integration
- Real runtime required: yes (browser — 3D scene + DOM UI + Zustand store must wire together)
- Human/UAT required: yes (mobile UX: catalog scroll, tap-to-add, tap-to-select, bottom sheet animation)

## Verification

- `npx vitest run` — all tests pass (existing 17 + new useDesignStore tests)
- `npm run build` — zero TypeScript errors, production build succeeds
- Browser manual checks:
  - Catalog panel slides up/down smoothly
  - Filter chips filter beads by material type
  - Tapping a catalog bead appends it to the 3D chain with physics rope joint
  - Tapping a 3D bead highlights it (visual indicator)
  - "Remove" button removes the selected bead
  - "Reset" button returns chain to default
  - Pacifier clip visible at top of chain (not a plain sphere)
  - Mobile viewport (360px): catalog usable, touch scroll doesn't interfere with 3D canvas
  - 3D bead drag still works, orbit rotation still works when not dragging
  - `npx vitest run src/stores/__tests__/useDesignStore.test.ts` — store tests pass

## Observability / Diagnostics

- Runtime signals: `useDesignStore.getState()` exposes full design state (beads, selectedBeadId) — inspectable in browser console or Zustand DevTools
- Inspection surfaces: Zustand DevTools (if enabled), browser console `useDesignStore.getState()`, `<Stats>` FPS overlay in 3D scene
- Failure visibility: If bead add/remove breaks physics, beads will fall through floor or joints will detach — immediately visible in 3D scene. If catalog scroll bleeds into canvas, touch events will scroll the whole page — visible immediately.
- Redaction constraints: none (no user data in this slice)

## Integration Closure

- Upstream surfaces consumed:
  - `src/components/scene/Scene.tsx` (beads prop interface)
  - `src/components/scene/BeadChain.tsx` (anchor + bead rendering)
  - `src/components/scene/BeadRigidBody.tsx` (type/color props)
  - `src/components/scene/DragControls.tsx` (drag events — must not break)
  - `src/lib/dragStore.ts` (Zustand pattern to follow)
  - `src/lib/beadMaterialConfig.ts` (material config per BeadType)
  - `src/types/bead.ts` (existing types to extend)
  - `src/hooks/useBeadChain.ts` (being replaced — tests to update)
- New wiring introduced in this slice:
  - `EditorCanvas` composes Scene + EditorToolbar + BeadCatalogPanel
  - `useDesignStore` connects catalog UI (writes) with 3D Scene (reads) — single source of truth
  - `page.tsx` switches from `<SceneLoader />` to `<EditorCanvas />`
  - `PacifierClip` integrated into `BeadChain` anchor position
- What remains before the milestone is truly usable end-to-end: S04 (templates + sharing/serialization), S05 (order + Telegram), S06 (admin), S07 (deploy + real device testing)

## Tasks

- [ ] **T01: Define bead data model and create ~100 catalog beads** `est:45m`
  - Why: All downstream tasks (store, catalog UI, editor) depend on typed catalog data. Without this, nothing can render or filter beads. Also writes the Prisma schema so S04 can pick it up.
  - Files: `src/types/bead.ts`, `src/data/catalogBeads.ts`, `prisma/schema.prisma`, `src/lib/beadMaterialConfig.ts`
  - Do:
    1. Extend `src/types/bead.ts` with `BeadShape` type ("sphere" | "disc" | "star" | "heart" | "cylinder"), `CatalogBead` interface (id, name, nameRu, shape, size, material as BeadType, color, secondaryColor?), and update `BeadState` to include optional `catalogBeadId: string`
    2. Create `prisma/schema.prisma` with `Bead` model (id Int @id @default(autoincrement()), name String, nameRu String, shape String, size Float, material String, color String, createdAt DateTime @default(now())) — plus a basic `design_json` note for S04. Schema only, no migrations, no client generation.
    3. Create `src/data/catalogBeads.ts` with ~100 static `CatalogBead` entries spanning all 4 materials (~25 each): wood (natural tones, varied sizes), silicone (pastel/bright colors), knit (warm muted tones), plastic (vibrant colors). Include realistic Russian names for beads. Export as `CATALOG_BEADS: CatalogBead[]` and a helper `getCatalogBead(id: string): CatalogBead | undefined`.
    4. Add `getCatalogBeadColorByMaterial` utility in `src/lib/beadMaterialConfig.ts` or a new `src/lib/catalogUtils.ts` that maps CatalogBead → BeadState (with radius derived from size).
  - Verify: `npx tsc --noEmit` passes (new types used correctly). `grep -c "export const CATALOG_BEADS" src/data/catalogBeads.ts` returns 1. `grep -c "model Bead" prisma/schema.prisma` returns 1.
  - Done when: `CatalogBead` type defined, 80+ beads in `CATALOG_BEADS` array, each has all required fields, Prisma schema file exists

- [ ] **T02: Create Zustand useDesignStore replacing useBeadChain** `est:45m`
  - Why: The current `useBeadChain` hook is local state inside `SceneLoader` — the catalog panel and toolbar need to read/write the same bead array. A global Zustand store is the single source of truth connecting 3D scene, catalog, and toolbar.
  - Files: `src/stores/useDesignStore.ts`, `src/stores/__tests__/useDesignStore.test.ts`, `src/hooks/useBeadChain.ts`, `src/components/SceneLoader.tsx`, `src/components/scene/Scene.tsx`, `src/components/scene/BeadChain.tsx`
  - Do:
    1. Create `src/stores/useDesignStore.ts` following the `dragStore` pattern (simple Zustand `create`). State: `beads: BeadState[]`, `selectedBeadId: string | null`, `productType: "pacifier-holder"`. Actions: `addBead(catalogBeadId: string)` (looks up CATALOG_BEADS, creates BeadState, appends), `removeBead(id: string)`, `removeSelected()`, `resetDesign()`, `selectBead(id: string | null)`. Enforce max chain length (40 beads). Initialize beads from the existing 7 default beads (import DEFAULT_BEADS logic from useBeadChain).
    2. Write tests in `src/stores/__tests__/useDesignStore.test.ts`: initial state has 7 beads, addBead appends, addBead with invalid id is no-op, removeBead removes, removeSelected removes the selected, selectBead sets/clears, resetDesign returns to defaults, max chain length enforced, beads have required fields.
    3. Update `src/components/SceneLoader.tsx` to read from `useDesignStore` instead of `useBeadChain` — this is a temporary bridge, T03 will replace SceneLoader entirely. Import `useDesignStore`, subscribe to `beads`, pass to Scene. Wire the existing overlay buttons to store actions.
    4. Keep `src/hooks/useBeadChain.ts` and its tests intact for now (don't break existing tests). The hook is still the source of DEFAULT_BEADS. In T03 it gets deprecated.
  - Verify: `npx vitest run` — all 17 existing tests + new store tests pass. `npx vitest run src/stores/__tests__/useDesignStore.test.ts` passes specifically.
  - Done when: useDesignStore created with all actions, tests pass, SceneLoader reads beads from store and buttons work

- [ ] **T03: Build EditorCanvas layout replacing SceneLoader** `est:1h`
  - Why: This is the main editor shell that composes 3D canvas, toolbar, and catalog panel. It replaces the demo-only SceneLoader with a production editor layout designed for mobile.
  - Files: `src/components/editor/EditorCanvas.tsx`, `src/components/editor/EditorToolbar.tsx`, `src/app/page.tsx`, `src/components/scene/Scene.tsx`
  - Do:
    1. Create `src/components/editor/EditorCanvas.tsx` as `"use client"`. Full-viewport layout: 3D canvas (flex-grow) at top, toolbar at bottom. Uses the SceneLoader dynamic-import pattern (client wrapper for ssr:false). Subscribes to `useDesignStore` for `beads` and passes to `<Scene beads={beads} />`. Contains a state `catalogOpen: boolean` for the bottom sheet toggle.
    2. Create `src/components/editor/EditorToolbar.tsx` as `"use client"`. Fixed bottom bar with: bead count badge (reads from store), toggle catalog button ("Каталог"), remove-selected button (disabled when no selection), reset button. All actions call `useDesignStore` methods. Tailwind-styled for mobile: rounded-full pill, backdrop-blur, consistent with existing S02 overlay aesthetic.
    3. Update `src/app/page.tsx` to render `<EditorCanvas />` instead of `<SceneLoader />`.
    4. Update `src/components/scene/Scene.tsx` — no changes to Scene itself, but verify it still receives `beads` as a prop from EditorCanvas (Scene stays "dumb", reading props not store — this is intentional for testability).
    5. SceneLoader can be kept but is no longer imported. Don't delete it yet (existing tests reference it indirectly).
  - Verify: `npm run build` passes. Browser: app loads with 3D chain + toolbar at bottom. "Каталог" button toggles catalog panel open/close. Bead count updates. Add/Remove/Reset buttons work.
  - Done when: EditorCanvas renders 3D scene with toolbar overlay, all toolbar buttons functional, catalog toggle works, mobile viewport fills screen

- [ ] **T04: Build mobile BeadCatalogPanel with filters and add-to-chain** `est:1h`
  - Why: This is the core of R004 — the browsable catalog. Users must be able to scroll through beads, filter by material, and tap to add to the chain. Without this, the editor is useless.
  - Files: `src/components/editor/BeadCatalogPanel.tsx`, `src/components/editor/CatalogBeadItem.tsx`, `src/components/editor/EditorCanvas.tsx`, `src/app/globals.css`
  - Do:
    1. Create `src/components/editor/CatalogBeadItem.tsx` as `"use client"`. Single catalog bead card: colored circle (using bead.color as background), bead name (nameRu), material label. Tailwind styled: ~72px square cards in a grid. `onClick` calls `useDesignStore.getState().addBead(catalogBead.id)`.
    2. Create `src/components/editor/BeadCatalogPanel.tsx` as `"use client"`. Bottom sheet panel: header with close button, horizontal scrollable filter chips (Все, Дерево, Силикон, Вязаное, Пластик — mapping BeadType to Russian labels), vertically scrollable grid of `CatalogBeadItem` components. Reads `CATALOG_BEADS` from data, filters by selected material. Critical: the scrollable grid must have `touch-action: pan-y` on its container and `overflow-y: auto` with a max-height — do NOT scroll the entire page. Add `stopPropagation` on touch events inside the panel to prevent bleeding into the 3D canvas.
    3. Integrate `BeadCatalogPanel` into `EditorCanvas.tsx` — render it as a conditional slide-up panel (animated with Tailwind `transition-transform` + `translate-y-full` / `translate-y-0`). When `catalogOpen` is true, the panel slides up from the bottom over the 3D canvas.
    4. Add CSS rule in `src/app/globals.css`: `.catalog-panel { touch-action: pan-y; }` to ensure scroll works inside the catalog panel despite the global `touch-action: none`.
  - Verify: Browser: catalog opens with animation, filter chips work (tapping "Дерево" shows only wood beads), grid scrolls smoothly on mobile viewport, tapping a bead card adds it to the 3D chain, catalog panel touch events don't interfere with 3D canvas below, `npm run build` passes.
  - Done when: Catalog panel renders 80+ beads in a filterable scrollable grid, material filters work, tapping a bead adds it to the chain, touch scroll is isolated from 3D canvas

- [ ] **T05: Add bead selection in 3D, pacifier clip, and wire remove-selected** `est:1h`
  - Why: Closes the loop on R005 (remove beads) and R009 (pacifier holder product type). Users need to select a bead in 3D to remove it, and the chain needs a pacifier clip visual instead of a plain sphere anchor.
  - Files: `src/components/scene/BeadRigidBody.tsx`, `src/components/scene/BeadChain.tsx`, `src/components/editor/PacifierClip.tsx`, `src/components/scene/DragControls.tsx`, `src/components/editor/EditorToolbar.tsx`
  - Do:
    1. Create `src/components/editor/PacifierClip.tsx` as a `"use client"` 3D component: a simple clip shape using Three.js primitives — a torus (ring) + a small cylinder (clip arm). Material: metallic silver/gray. This replaces the plain gray anchor sphere in `BeadChain`. The component renders inside the fixed RigidBody at the anchor position.
    2. Update `src/components/scene/BeadChain.tsx` — replace the anchor's sphere mesh with `<PacifierClip />` inside the fixed RigidBody. Keep the BallCollider (physics still needs a spherical collider). Add a `selectedBeadId` prop (from store) and pass `highlighted={bead.id === selectedBeadId}` to each `BeadRigidBody`.
    3. Update `src/components/scene/BeadRigidBody.tsx` — add an optional `highlighted: boolean` prop. When highlighted, render an additional wireframe ring or emissive glow around the bead (e.g., `<meshStandardMaterial emissive="#FFD700" emissiveIntensity={0.3}>` overlay, or a slightly larger transparent wireframe sphere).
    4. Update `src/components/scene/DragControls.tsx` — add tap detection: if pointer-down → pointer-up happens within 200ms and pointer moved less than 5px (NDC), call `useDesignStore.getState().selectBead(bodyId)` instead of starting a drag. This distinguishes "tap to select" from "press + move to drag". The bodyId needs to be passed through — add a `beadId: string` parameter to `useDrag` and store it on the dragRef.
    5. Wire `EditorToolbar` remove button to `useDesignStore.removeSelected()` — it already exists, just ensure it's connected.
  - Verify: Browser: pacifier clip visible at top of chain (not a plain sphere), tapping a 3D bead highlights it with visual indicator, tapping empty space or another bead switches selection, "Remove" button removes the selected bead, bead drag still works (longer press + move), `npx vitest run` passes, `npm run build` passes.
  - Done when: PacifierClip renders at anchor, tap-to-select works in 3D, highlight visual shows on selected bead, remove-selected removes from chain, drag still works

## Files Likely Touched

- `src/types/bead.ts` — extend with BeadShape, CatalogBead
- `src/data/catalogBeads.ts` — new: ~100 catalog beads
- `prisma/schema.prisma` — new: Bead model definition
- `src/lib/catalogUtils.ts` — new: CatalogBead → BeadState conversion
- `src/stores/useDesignStore.ts` — new: global design state (Zustand)
- `src/stores/__tests__/useDesignStore.test.ts` — new: store unit tests
- `src/components/editor/EditorCanvas.tsx` — new: main editor layout
- `src/components/editor/EditorToolbar.tsx` — new: bottom toolbar
- `src/components/editor/BeadCatalogPanel.tsx` — new: mobile catalog
- `src/components/editor/CatalogBeadItem.tsx` — new: bead card
- `src/components/editor/PacifierClip.tsx` — new: clip 3D mesh
- `src/components/scene/BeadChain.tsx` — add PacifierClip, selection prop
- `src/components/scene/BeadRigidBody.tsx` — add highlighted prop
- `src/components/scene/DragControls.tsx` — add tap detection (beadId param)
- `src/components/scene/Scene.tsx` — pass selectedBeadId through
- `src/components/SceneLoader.tsx` — temporary store bridge (T02), then unused
- `src/app/page.tsx` — switch to EditorCanvas
- `src/app/globals.css` — add catalog-panel touch-action rule
