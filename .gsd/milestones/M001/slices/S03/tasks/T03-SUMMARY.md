---
id: T03
parent: S03
milestone: M001
provides:
  - EditorCanvas layout component (full-viewport 3D + toolbar + catalog placeholder)
  - EditorToolbar component with glass-morphism bottom bar (catalog toggle, remove, reset)
  - Scene/BeadChain updated with selectedBeadId prop for T05 highlight support
key_files:
  - src/components/editor/EditorCanvas.tsx
  - src/components/editor/EditorToolbar.tsx
  - src/components/scene/Scene.tsx
  - src/components/scene/BeadChain.tsx
  - src/app/page.tsx
key_decisions:
  - Scene stays "dumb" — receives beads and selectedBeadId as props, never subscribes to store directly
  - Catalog panel is a placeholder div for now (T04 fills in real catalog UI)
  - Toolbar uses inline SVG icons instead of icon library (no icon dependency needed for 3 icons)
  - Russian grammar for bead count: 1 бусина, 2-4 бусины, 5+ бусин
patterns_established:
  - Editor component directory: src/components/editor/ for UI shell components
  - Toolbar action pattern: buttons call useDesignStore.getState().action() directly
  - Glass-morphism toolbar: bg-white/70 backdrop-blur-md border-t border-gray-200/50 fixed bottom-0
  - Scale-on-press: active:scale-95 on all toolbar buttons for tactile feedback
observability_surfaces:
  - No new runtime signals — useDesignStore.getState() already exposes full design state
  - Toolbar bead count is reactive via Zustand subscription (updates immediately on add/remove/reset)
duration: ~15m
verification_result: passed
completed_at: 2026-03-30
blocker_discovered: false
---

# T03: Build EditorCanvas layout replacing SceneLoader

**Replaced SceneLoader with EditorCanvas editor shell: full-viewport 3D canvas, glass-morphism bottom toolbar with catalog toggle / remove / reset buttons, and catalog panel placeholder.**

## What Happened

Created the main editor layout (`EditorCanvas`) as the new app entry point, replacing the demo-only `SceneLoader`. The component subscribes to `useDesignStore` for beads and selectedBeadId, passes them as props to the Scene (which stays "dumb" — no store subscription). Built `EditorToolbar` as a fixed bottom bar with glass-morphism styling matching the S02 overlay aesthetic: backdrop-blur, border-t, and three action buttons (Каталог toggle, Удалить, Сброс) with inline SVG icons and active:scale-95 press feedback. The remove button is disabled when no bead is selected. Added a `selectedBeadId` prop through Scene → BeadChain for T05 highlight rendering. The catalog panel is a placeholder div that toggles visibility — T04 will replace it with the real catalog bottom sheet.

Updated `page.tsx` to render `<EditorCanvas />` instead of `<SceneLoader />`. SceneLoader is kept on disk but no longer imported.

## Verification

- `npm run build` — zero TypeScript errors, production build succeeds
- `npx vitest run` — all 44 tests pass (15 store + 12 catalog + 7 material + 10 beadChain)
- Browser: 3D bead chain renders correctly inside EditorCanvas with toolbar at bottom
- Browser: "Каталог" button toggles catalog placeholder panel (text changes Каталог ↔ Закрыть)
- Browser: "Удалить" button is disabled when no bead is selected (confirmed via JS)
- Browser: All 5 must-have UI elements visible (bead count, canvas, 3 buttons)
- Browser: canvas-container has touch-action: none (verified via getComputedStyle)
- Browser: mobile viewport (390×844) fills screen correctly, toolbar usable
- No JavaScript errors in console (only pre-existing Three.js deprecation warnings)

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm run build` | 0 | ✅ pass | 12.7s |
| 2 | `npx vitest run` | 0 | ✅ pass | 5.9s |
| 3 | Browser: page loads with toolbar | 0 | ✅ pass | ~3s |
| 4 | Browser: catalog toggle | 0 | ✅ pass | ~1s |
| 5 | Browser: remove button disabled | 0 | ✅ pass | ~0.5s |
| 6 | Browser: mobile viewport | 0 | ✅ pass | ~2s |
| 7 | Browser: touch-action CSS | 0 | ✅ pass | ~0.5s |

## Diagnostics

- No new runtime signals — `useDesignStore.getState()` in browser console shows full design state
- Toolbar bead count is reactive via Zustand selector (updates on add/remove/reset)
- If 3D scene fails, beads won't render — immediately visible
- If store actions break, toolbar buttons won't update — immediately visible

## Deviations

None — implemented exactly per task plan.

## Known Issues

None.

## Files Created/Modified

- `src/components/editor/EditorCanvas.tsx` — new: main editor layout (Zustand subscriber, dynamic Scene import, catalog toggle state)
- `src/components/editor/EditorToolbar.tsx` — new: fixed bottom toolbar with glass effect, 3 action buttons, inline SVG icons
- `src/components/scene/Scene.tsx` — modified: added optional selectedBeadId prop, passed to BeadChain
- `src/components/scene/BeadChain.tsx` — modified: added optional selectedBeadId prop to interface (unused until T05)
- `src/app/page.tsx` — modified: switched from SceneLoader to EditorCanvas
