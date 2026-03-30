---
estimated_steps: 5
estimated_files: 4
---

# T03: Build EditorCanvas layout replacing SceneLoader

**Slice:** S03 — Каталог бусин + редактор UI
**Milestone:** M001

## Description

Create the main editor shell (`EditorCanvas`) that composes the 3D scene canvas, bottom toolbar, and catalog panel placeholder. This replaces `SceneLoader` as the app entry point. The layout is mobile-first: full-viewport 3D canvas with a fixed toolbar at the bottom and a slide-up bottom sheet for the catalog (catalog UI comes in T04).

The Scene component stays "dumb" — it receives `beads` as a prop, not from the store. EditorCanvas is the subscriber that bridges store ↔ scene.

## Steps

1. **Create `src/components/editor/EditorCanvas.tsx`** as `"use client"` — This is the main editor layout component. Structure:
   - Full-viewport container (`w-screen h-screen flex flex-col`)
   - 3D canvas area (flex-grow, contains a `canvas-container` div wrapping the dynamically-imported Scene)
   - Bottom toolbar (fixed at bottom via `EditorToolbar` component)
   - Catalog panel area (conditionally rendered via `catalogOpen` state — just a placeholder div for now, T04 fills it in)
   - State: `const [catalogOpen, setCatalogOpen] = useState(false)`
   - Store subscription: `const beads = useDesignStore(s => s.beads)` and `const selectedBeadId = useDesignStore(s => s.selectedBeadId)`
   - Pass `beads` and `selectedBeadId` to `<Scene beads={beads} selectedBeadId={selectedBeadId} />`
   - Use the SceneLoader dynamic-import pattern: `const Scene = dynamic(() => import("@/components/scene/Scene"), { ssr: false })` inside the component
   - The canvas-container div must have `className="canvas-container w-full h-full"` (critical for touch-action CSS)

2. **Create `src/components/editor/EditorToolbar.tsx`** as `"use client"` — Fixed bottom toolbar bar:
   - Props: `onToggleCatalog: () => void`, `catalogOpen: boolean`
   - Reads from store: `const beadCount = useDesignStore(s => s.beads.length)`, `const selectedId = useDesignStore(s => s.selectedBeadId)`
   - Layout: horizontal bar with backdrop-blur glass effect (same style as existing S02 overlay buttons)
   - Elements (left to right):
     - Bead count badge: pill with number (e.g., "7 бусин")
     - Spacer
     - "Каталог" button — calls `onToggleCatalog`, shows different icon/text based on `catalogOpen`
     - "Удалить" button — calls `useDesignStore.getState().removeSelected()`, disabled when `!selectedId`
     - "Сброс" button — calls `useDesignStore.getState().resetDesign()`
   - Tailwind classes: `fixed bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-white/70 backdrop-blur-md border-t border-gray-200/50 z-10`
   - The toolbar must have `touch-action: manipulation` so button taps are responsive

3. **Update `src/components/scene/Scene.tsx`** — Add optional `selectedBeadId?: string | null` prop to `SceneProps`. Pass it down to `<BeadChain beads={beads} anchorPosition={[0, 3, 0]} selectedBeadId={selectedBeadId} />`. The BeadChain will use this in T05 for highlight rendering. For now, the prop is accepted but may not be used until T05.

4. **Update `src/app/page.tsx`** — Change from `import SceneLoader from "@/components/SceneLoader"` + `<SceneLoader />` to `import EditorCanvas from "@/components/editor/EditorCanvas"` + `<EditorCanvas />`.

5. **Verify the build works** — Run `npm run build` and fix any TypeScript errors. Common issues:
   - Missing `"use client"` on new components
   - Dynamic import path issues (use `@/` alias, not relative)
   - The Scene component must NOT subscribe to the store directly (it receives props)

## Must-Haves

- [ ] `EditorCanvas` renders as the app root with full-viewport layout
- [ ] 3D scene (bead chain with physics) renders correctly inside EditorCanvas
- [ ] Toolbar shows bead count and 3 functional buttons (catalog toggle, remove, reset)
- [ ] Catalog toggle button shows/hides the placeholder panel area
- [ ] Remove button is disabled when no bead is selected
- [ ] Reset button clears chain and restores defaults
- [ ] All existing 17 tests still pass
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] Mobile viewport fills screen correctly
- [ ] Touch-action CSS on canvas-container preserved

## Verification

- `npm run build` — zero errors
- `npx vitest run` — all tests pass
- Browser: app loads with 3D chain, toolbar at bottom, buttons work
- Browser: "Каталог" button toggles catalog area visibility
- Browser: toolbar glass/blur effect matches S02 overlay aesthetic

## Observability Impact

- No new runtime signals. Editor state is already observable via `useDesignStore.getState()`.

## Inputs

- `src/stores/useDesignStore.ts` — global design store (created in T02)
- `src/components/scene/Scene.tsx` — 3D scene component (add selectedBeadId prop)
- `src/components/SceneLoader.tsx` — reference for dynamic import pattern
- `src/lib/dragStore.ts` — reference for Zustand hook pattern
- `src/app/page.tsx` — current entry point to replace

## Expected Output

- `src/components/editor/EditorCanvas.tsx` — new: main editor layout
- `src/components/editor/EditorToolbar.tsx` — new: bottom toolbar
- `src/components/scene/Scene.tsx` — modified: add selectedBeadId prop
- `src/app/page.tsx` — modified: render EditorCanvas instead of SceneLoader
