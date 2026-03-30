---
estimated_steps: 4
estimated_files: 4
---

# T04: Build mobile BeadCatalogPanel with filters and add-to-chain

**Slice:** S03 — Каталог бусин + редактор UI
**Milestone:** M001

## Description

Build the mobile catalog bottom-sheet UI: a slide-up panel with horizontal filter chips (by material type) and a vertically scrollable grid of bead cards. Tapping a catalog bead card adds it to the 3D chain via `useDesignStore.addBead()`.

Critical constraint: the catalog panel's touch scroll must NOT bleed into the 3D canvas below. The global CSS sets `touch-action: none` on html/body/canvas — the catalog panel needs its own `touch-action: pan-y` override.

## Steps

1. **Create `src/components/editor/CatalogBeadItem.tsx`** as `"use client"` — Single bead card in the catalog grid:
   - Props: `bead: CatalogBead`
   - Renders a card (~72px square, rounded corners) with:
     - Colored circle (32px) using `bead.color` as background
     - Bead name: `bead.nameRu` (truncated with `truncate` if long)
     - Material label: small text below name (Russian: "Дерево", "Силикон", "Вязаное", "Пластик")
   - `onClick` handler: calls `useDesignStore.getState().addBead(bead.id)`. Uses `getState()` (not hook) because this is a simple click handler and we don't need re-renders on store changes for the card itself.
   - Tailwind: `w-[72px] flex flex-col items-center gap-1 p-1.5 rounded-xl hover:bg-gray-100 active:scale-95 transition-transform cursor-pointer`

2. **Create `src/components/editor/BeadCatalogPanel.tsx`** as `"use client"` — Full catalog bottom sheet:
   - Props: `isOpen: boolean`, `onClose: () => void`
   - Local state: `const [activeFilter, setActiveFilter] = useState<BeadType | "all">("all")`
   - Material filter config: array of `{ value: BeadType | "all", label: string }` — `[ { value: "all", label: "Все" }, { value: "wood", label: "Дерево" }, { value: "silicone", label: "Силикон" }, { value: "knit", label: "Вязаное" }, { value: "plastic", label: "Пластик" } ]`
   - Filter logic: `const filteredBeads = activeFilter === "all" ? CATALOG_BEADS : CATALOG_BEADS.filter(b => b.material === activeFilter)`
   - Layout structure:
     - Slide-up container: `fixed inset-x-0 bottom-0 z-20 max-h-[60vh] bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ${isOpen ? "translate-y-0" : "translate-y-full"}` (this replaces the placeholder from T03)
     - Header row: drag handle bar (small gray pill), title "Каталог бусин", close (✕) button
     - Filter chips row: `flex gap-2 overflow-x-auto px-4 pb-2` — horizontal scrollable, each chip is a pill button
     - Bead grid: `overflow-y-auto px-4 pb-20 grid grid-cols-4 gap-2` — 4 columns at 360px width, vertically scrollable with max height
   - **Critical CSS**: The bead grid scroll container must have `touch-action: pan-y` style to enable vertical scrolling. Add `onTouchStart={e => e.stopPropagation()}` on the entire panel to prevent touch events from reaching the 3D canvas underneath.
   - Closed state: panel slides down to `translate-y-full`, hidden

3. **Integrate into `EditorCanvas.tsx`** — Remove the placeholder catalog area from T03 and replace with the real `<BeadCatalogPanel>`:
   - Import `BeadCatalogPanel` and render it: `<BeadCatalogPanel isOpen={catalogOpen} onClose={() => setCatalogOpen(false)} />`
   - The toolbar's "Каталог" button already calls `onToggleCatalog` which toggles `catalogOpen`
   - Close the catalog when a bead is added: either listen to store changes (if `beads.length` changes, close catalog) or add an `onBeadAdded` callback. Simpler: just keep the catalog open — users may want to add multiple beads in a row.

4. **Update `src/app/globals.css`** — Add rule: `.catalog-scroll { touch-action: pan-y; }` and apply this class to the bead grid container in BeadCatalogPanel. This ensures vertical scrolling works despite the global `touch-action: none`.

## Must-Haves

- [ ] Catalog panel slides up/down with smooth animation
- [ ] Filter chips render all 5 options (Все + 4 materials)
- [ ] Tapping a filter chip shows only matching beads (or all)
- [ ] Bead grid renders 80+ beads in 4-column layout
- [ ] Each bead card shows color circle, Russian name, material label
- [ ] Tapping a bead card calls `addBead(bead.id)` on the store
- [ ] Added bead appears in the 3D chain (physics rope joint connects)
- [ ] Catalog panel vertical scroll works on mobile viewport
- [ ] Catalog touch events do NOT interfere with 3D canvas
- [ ] Close button and toolbar toggle both dismiss the catalog

## Verification

- `npm run build` — zero TypeScript errors
- `npx vitest run` — all tests pass (no new tests for UI, existing must pass)
- Browser: catalog opens with slide animation
- Browser: "Дерево" filter shows only wood beads, "Все" shows all
- Browser: tapping a catalog bead → chain grows by 1 bead in 3D
- Browser: scroll inside catalog panel works smoothly
- Browser: scrolling catalog does NOT rotate/move the 3D scene
- Browser: closing catalog (✕ or toolbar toggle) hides the panel

## Observability Impact

- No new runtime signals. Catalog state is local React state + store reads.
- Failure visibility: if `addBead` fails silently (bad catalog id), bead won't appear in chain — immediately visible. If touch events bleed, the 3D scene will rotate during catalog scroll — immediately visible.

## Inputs

- `src/data/catalogBeads.ts` — CATALOG_BEADS array (from T01)
- `src/stores/useDesignStore.ts` — addBead action (from T02)
- `src/types/bead.ts` — CatalogBead, BeadType types (from T01)
- `src/components/editor/EditorCanvas.tsx` — integrate catalog panel (from T03)

## Expected Output

- `src/components/editor/BeadCatalogPanel.tsx` — new: mobile catalog bottom sheet
- `src/components/editor/CatalogBeadItem.tsx` — new: individual bead card
- `src/components/editor/EditorCanvas.tsx` — modified: integrate real catalog panel
- `src/app/globals.css` — modified: add catalog-scroll touch-action rule
