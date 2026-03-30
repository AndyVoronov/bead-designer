# S03 — Каталог бусин + редактор UI

**Date:** 2026-03-30

## Summary

S03 transforms the S01/S02 3D physics prototype into a functional bead editor with a browsable catalog, add/remove interactions, and a pacifier-holder product structure. The current codebase has a working 3D bead chain (7 default beads, physics, drag, PBR materials, adaptive rendering, mobile touch) but all state lives in a local `useBeadChain` hook inside `SceneLoader`, and the UI is a minimal overlay with 3 buttons.

The main work is: (1) define the bead data model and create ~100 catalog beads as static TypeScript data, (2) replace the local hook with a Zustand `useDesignStore`, (3) build the mobile-first editor UI (bottom-sheet catalog panel, toolbar, bead selection/removal), and (4) add the pacifier-holder product structure (clip visual replacing the plain anchor sphere). Prisma schema can be defined but no DB connection is needed yet — the catalog works with static client-side data; API routes and Prisma client come in S04.

This is **targeted research** — the technologies (Zustand, Tailwind, TypeScript, R3F) are all established in the codebase. The main complexity is UI composition (layouting 3D canvas + catalog panel on mobile) and state management architecture (replacing local hook with global store while keeping physics integration stable).

## Recommendation

1. **Static catalog data first** — create `src/data/catalogBeads.ts` with ~100 beads as a typed TypeScript array. This unblocks all UI work immediately without needing PostgreSQL running. Define the Prisma schema in parallel (just the file, no migrations) so S04 can pick it up.

2. **Zustand `useDesignStore` to replace `useBeadChain`** — the current hook is `useState`-based and local to `SceneLoader`. S03 needs global state so the 3D scene and the catalog panel can both read/write the design. Use Zustand slices pattern (one slice for beads, one for selection, one for product type). Follow the established `dragStore` pattern: `getState()` in imperative R3F callbacks, hook subscription in React components.

3. **Mobile-first editor layout** — full-viewport 3D canvas with a slide-up bottom sheet for the catalog. Toolbar at the bottom with add/remove/undo. The catalog is a horizontally-filterable vertical grid of bead thumbnails. Use Tailwind classes throughout (D009).

4. **Pacifier holder = enhanced anchor** — replace the plain gray anchor sphere with a clip-shaped mesh (can be a simple torus + cylinder composite for now). This is the fixed top element of the chain, distinct from beads.

## Implementation Landscape

### Key Files

**Existing (will be modified):**

- `src/types/bead.ts` — current types: `BeadId`, `BeadType`, `BeadState`, `ChainConfig`, `ChainState`. Needs extending with `BeadShape`, `CatalogBead`, updated `BeadState` with `catalogBeadId` and `shape`.
- `src/hooks/useBeadChain.ts` — current local state hook with add/remove/reset. Will be **replaced** by `useDesignStore` (Zustand). Tests in `src/hooks/__tests__/useBeadChain.test.ts` will need updating to test the store instead.
- `src/components/SceneLoader.tsx` — current wrapper that owns bead state and renders Scene + minimal overlay. Will be **replaced** by `EditorCanvas` component that composes Scene + catalog + toolbar.
- `src/components/scene/Scene.tsx` — 3D canvas with Physics, BeadChain, DragAwareOrbitControls, AdaptiveRenderer. Interface stays the same (`beads: BeadState[]` prop). May need a `selectedBeadId` prop for highlight rendering.
- `src/components/scene/BeadChain.tsx` — renders anchor + N beads + rope joints + thread. May need to accept a `productType` prop to change the anchor visual (clip vs plain sphere).
- `src/components/scene/BeadRigidBody.tsx` — accepts `type: BeadType`. May need a `highlighted` prop for selection visual. Also needs to support non-sphere shapes eventually (S03 can keep sphere-only for physics, visual-only for other shapes).
- `src/app/page.tsx` — currently just `<SceneLoader />`. Will change to `<EditorCanvas />`.
- `src/lib/dragStore.ts` — Zustand store for drag state. Pattern to follow for `useDesignStore`.

**New files to create:**

- `src/data/catalogBeads.ts` — ~100 static catalog beads with metadata (id, name, shape, size, material, color). No textures yet.
- `src/stores/useDesignStore.ts` — Zustand store: `beads[]`, `addBead(catalogBeadId)`, `removeBead(id)`, `reorderBead`, `resetDesign`, `selectedBeadId`, `productType`.
- `src/components/editor/EditorCanvas.tsx` — main editor layout: 3D canvas (top) + toolbar + catalog panel (bottom sheet).
- `src/components/editor/BeadCatalogPanel.tsx` — mobile catalog: filter bar (material type) + scrollable grid of bead thumbnails.
- `src/components/editor/CatalogBeadItem.tsx` — individual catalog bead card (color swatch, name, material icon, tap to add).
- `src/components/editor/EditorToolbar.tsx` — bottom toolbar: bead count, remove selected, undo, reset.
- `src/components/editor/PacifierClip.tsx` — 3D clip mesh for the anchor point (replaces plain sphere).
- `prisma/schema.prisma` — Prisma schema definition for `Bead` model (no migrations yet, just the schema file for S04).
- `src/stores/__tests__/useDesignStore.test.ts` — tests for the design store.

### Build Order

**Task 1: Data model + catalog data** — Define extended TypeScript types (`BeadShape`, `CatalogBead`) and create the ~100 bead seed data in `src/data/catalogBeads.ts`. This unblocks everything else. Write the Prisma schema file (schema only, no DB). Update `src/types/bead.ts` with new types.

**Task 2: useDesignStore (Zustand)** — Create the global design store replacing `useBeadChain`. The store holds `beads[]`, `selectedBeadId`, `productType`, and all actions (`addBead`, `removeBead`, `resetDesign`, `selectBead`). Adding a bead takes a `catalogBeadId`, looks up the catalog bead, and appends a `BeadState` to the chain. Write tests.

**Task 3: Editor layout (EditorCanvas)** — Build the main editor component that replaces SceneLoader. Layout: full-viewport with 3D canvas and a slide-up bottom sheet. The 3D scene reads beads from the store. Update `page.tsx` to render EditorCanvas.

**Task 4: BeadCatalogPanel** — The mobile catalog UI. Horizontal filter chips (All, Wood, Silicone, Knit, Plastic) + vertically scrollable grid of bead cards. Tapping a card calls `addBead(catalogBeadId)` from the store. Each card shows a colored circle (material preview), bead name, and material label.

**Task 5: Editor toolbar + interactions** — Bottom toolbar with: bead count badge, remove-selected button, reset button. Wire up bead selection (tap bead in 3D → highlight it, show remove option). The 3D scene needs a way to report which bead was tapped — extend `useDrag` or add an `onBeadTap` callback.

**Task 6: Pacifier holder structure** — Replace the plain anchor sphere with a clip visual. Add a `PacifierClip` 3D component (torus + cylinder composite). The product type is hardcoded to `pacifier-holder` for now.

### Verification Approach

1. `npx vitest run` — all existing 17 tests + new store tests must pass
2. `npm run build` — zero TypeScript errors, successful production build
3. Browser verification:
   - Catalog panel opens/closes with smooth animation
   - Filter chips work (tapping "Wood" shows only wood beads)
   - Tapping a catalog bead adds it to the 3D chain
   - Chain grows with new bead, physics connects it with rope joint
   - Remove button removes selected bead from chain
   - Reset button clears chain to default
   - Pacifier clip visible at top of chain
   - Mobile viewport: catalog usable on 360px width
   - Touch: catalog scrolling doesn't interfere with 3D canvas
   - 3D canvas: bead drag still works, orbit rotation still works when not dragging

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Global state management | Zustand (already in project) | dragStore pattern established, slices pattern well-documented |
| CSS utility classes | Tailwind CSS (already configured) | D009 decision, mobile-first approach |
| 3D material config lookup | `getBeadMaterialConfig()` | Already works for 4 bead types |
| Adaptive rendering | `AdaptiveRenderer` component | Already wraps Canvas internals |
| Drag state bridge | `useDragStore` | Already isolates drag ↔ orbit conflict |

## Constraints

- **Windows NTFS junction worktree**: dev server must run from real path (`C:\Users\Andy\.gsd\projects\...`), not junction path (`D:\...`). Vitest config already handles this with `fs.realpathSync`.
- **Next.js 16 + Turbopack**: `ssr:false` forbidden in Server Components. All new components touching R3F must be `"use client"`. SceneLoader pattern (dynamic import wrapper) already established.
- **Touch-action on canvas**: `!important` CSS override must be preserved. Any new layout changes must not break `touch-action: none !important` on `.canvas-container canvas`.
- **Zustand access pattern**: `getState()` in R3F pointer callbacks, hook subscription in React components. New code touching R3F events must follow this.
- **No real PNG textures**: BeadMaterial uses procedural bumps. Catalog can show colored circles/swatches. `textureUrl` prop on BeadMaterial is designed but not yet implemented.
- **Prisma without running DB**: S03 defines the schema but doesn't need migrations or client. PostgreSQL connection is deferred to S04.
- **Bead physics shape**: All beads use `BallCollider` (sphere). Non-sphere shapes (disc, star, heart) are visual-only — the physics collider stays spherical. This avoids complex collider geometry.

## Common Pitfalls

- **Catalog scroll bleeding into 3D canvas** — The bottom sheet panel must have its own scroll container with `overflow-y: auto` and a max-height, NOT scroll the entire page. Touch events inside the panel must be isolated from the 3D canvas (use `stopPropagation`).
- **Adding a bead mid-chain breaks rope joints** — The current `BeadChain` component rebuilds joints when `beads.length` changes via `useMemo` keyed on length. Adding a bead to the end works. Inserting in the middle or reordering requires re-creating all joints, which may cause physics instability. Recommendation: S03 only supports **append** and **remove** (not reorder). Reorder is deferred.
- **Store state and R3F ref lifecycle** — When a bead is added/removed from the store, `BeadChain` re-renders with new `beads` array. The `useMemo` on `beads.length` creates new refs, but the physics world may not clean up old RigidBody/Joint objects immediately. Need to verify stable cleanup.
- **Catalog panel overlaying touch-action: none** — The catalog panel sits above the canvas in the DOM. If the panel has `touch-action: none` inherited from body/html, scrolling inside the panel won't work. Fix: set `touch-action: pan-y` on the catalog panel's scroll container.
- **Large bead count performance** — S02 validated 21 beads at 60 FPS. The catalog adds ~100 entries but these are DOM elements, not 3D objects. The 3D chain should still be capped at reasonable counts (20-40 beads on the chain at a time). Add a max chain length to the store.

## Open Risks

- **Catalog UX on small screens** — 100 beads in a grid at 360px width means ~4 columns of 80px cells. This is tight but workable. Filtering by material reduces the list significantly. May need to test on real devices (S07).
- **Bead selection in 3D** — Tapping a bead in the 3D scene needs to distinguish between "tap to select" and "drag to move". Current DragControls fires on pointer-down. Need to add a time/distance threshold: short tap = select, longer press + move = drag.
- **Prisma schema forward-compatibility** — Defining the schema now without running migrations means we can't validate it against a real database. If the schema has issues, they'll surface in S04 when migrations first run. Mitigate by keeping the schema simple (one model, standard field types).

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Zustand | `jezweb/claude-skills@zustand-state-management` (1.2K installs) | available — `npx skills add jezweb/claude-skills@zustand-state-management` |
| Prisma | `prisma/skills@prisma-database-setup` (3.6K installs) | available — `npx skills add prisma/skills@prisma-database-setup` |
| Tailwind | `wshobson/agents@tailwind-design-system` (25.8K installs) | available — `npx skills add wshobson/agents@tailwind-design-system` |

None are critical — the technologies are well-understood and already in the codebase. These skills may help with edge cases but aren't required.

## Sources

- Zustand slices pattern (source: [Zustand Advanced TypeScript](https://github.com/pmndrs/zustand/blob/main/docs/learn/guides/advanced-typescript.md))
- Prisma + Next.js setup (source: [Prisma AI Prompts](https://www.prisma.io/docs/ai/prompts/nextjs))
- Frontend design skill (source: installed skill `frontend-design` — playful/toy-like aesthetic direction)
- React best practices (source: installed skill `react-best-practices` — re-render optimization, conditional rendering)
