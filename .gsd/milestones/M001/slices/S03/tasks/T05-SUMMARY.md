---
id: T05
parent: S03
milestone: M001
provides:
  - PacifierClip 3D component (metallic silver torus + cylinder)
  - Tap-to-select in 3D scene with time/distance threshold (200ms / 0.05 NDC)
  - Golden wireframe highlight on selected bead
  - Deselect on empty-space click via Canvas onPointerMissed
  - Remove-selected and reset wired end-to-end through toolbar
key_files:
  - src/components/editor/PacifierClip.tsx
  - src/components/scene/BeadChain.tsx
  - src/components/scene/BeadRigidBody.tsx
  - src/components/scene/DragControls.tsx
  - src/components/scene/Scene.tsx
key_decisions:
  - useDrag signature extended with optional beadId parameter for tap-to-select
  - Tap threshold: 200ms duration + 0.05 NDC distance — above either = drag, not tap
  - Highlight uses emissiveIntensity 0.8 + opacity 0.7 for visibility against various bead colors
  - Drag completion deselects (selectBead(null)) to keep UI clean after repositioning
  - Scene.onPointerMissed deselects for click-on-empty-space UX
patterns_established:
  - Tap vs drag pattern in pointer event handlers: track startTime + startPos on pointerdown, check threshold on pointerup before deciding action
  - Highlight overlay as non-physical sibling mesh inside RigidBody (no collider impact)
observability_surfaces:
  - useDesignStore.getState().selectedBeadId — inspectable in browser console / Zustand DevTools
  - Selection failure immediately visible: highlight doesn't appear or tap detection is broken
duration: 25m
verification_result: passed
completed_at: 2026-03-30
blocker_discovered: false
---

# T05: Add bead selection in 3D, pacifier clip, and wire remove-selected

**Implemented tap-to-select with golden wireframe highlight, pacifier clip 3D mesh, and full remove/reset end-to-end wiring.**

## What Happened

Created `PacifierClip.tsx` with a metallic silver torus ring and angled cylinder arm, replacing the plain gray anchor sphere in `BeadChain`. Extended `DragControls.useDrag` with a `beadId` parameter and tap detection logic: on `pointerDown` the hook records timestamp and NDC position, and on `pointerUp` checks elapsed time (<200ms) and NDC distance (<0.05). If both thresholds pass, it's a tap → toggle bead selection via `useDesignStore.selectBead`. Otherwise it's a drag → apply velocity as before and deselect. Added `highlighted` prop to `BeadRigidBody` that renders a golden wireframe sphere (scale 1.15x, emissive gold, opacity 0.7). Wired `Scene.tsx` with `onPointerMissed` to deselect on empty-space clicks.

All features verified in browser via store state inspection: tap selects (selectedBeadId updates), tap another bead switches selection, click empty space deselects, "Удалить" removes selected bead from chain (count decreases), "Сброс" resets to 7 defaults with null selection, drag gesture classified correctly as drag (no selection change). Pacifier clip visible at chain anchor in screenshots. Mobile viewport (390px) layout verified.

## Verification

- TypeScript: `npx tsc --noEmit` — zero errors
- Tests: `npx vitest run` — all 44 tests pass (4 test files)
- Build: `npm run build` — production build succeeds, zero errors
- Browser: pacifier clip visible at top of chain
- Browser: tap bead → selectedBeadId updates in store
- Browser: tap another bead → selection switches
- Browser: tap empty space → selectedBeadId = null
- Browser: "Удалить" → bead removed (count decreases)
- Browser: "Сброс" → 7 defaults, null selection
- Browser: drag gesture → classified as drag, no selection change
- Browser: mobile viewport 390px → catalog + toolbar usable

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | npx tsc --noEmit | 0 | ✅ pass | ~5s |
| 2 | npx vitest run | 0 | ✅ pass | 4.0s |
| 3 | npm run build | 0 | ✅ pass | ~9s |
| 4 | Browser: tap select | 0 | ✅ pass | manual |
| 5 | Browser: tap switch | 0 | ✅ pass | manual |
| 6 | Browser: deselect empty | 0 | ✅ pass | manual |
| 7 | Browser: remove selected | 0 | ✅ pass | manual |
| 8 | Browser: reset | 0 | ✅ pass | manual |
| 9 | Browser: drag vs tap | 0 | ✅ pass | manual |
| 10 | Browser: mobile 390px | 0 | ✅ pass | manual |

## Diagnostics

- `useDesignStore.getState().selectedBeadId` in browser console — shows current selection
- If tap detection breaks: either all taps become drags (can't select) or all drags become taps (can't drag) — immediately visible
- If highlight fails: selectedBeadId updates but no visual change — check BeadRigidBody highlighted prop wiring

## Deviations

- Increased highlight emissiveIntensity from 0.3 to 0.8 and opacity from 0.6 to 0.7 for better visibility against varied bead colors

## Known Issues

None

## Files Created/Modified

- `src/components/editor/PacifierClip.tsx` — NEW: metallic silver pacifier clip 3D mesh (torus + cylinder)
- `src/components/scene/BeadChain.tsx` — MODIFIED: replaced anchor sphere with PacifierClip, added selectedBeadId prop, passes beadId + highlighted to BeadRigidBody
- `src/components/scene/BeadRigidBody.tsx` — MODIFIED: added beadId and highlighted props, golden wireframe highlight mesh
- `src/components/scene/DragControls.tsx` — MODIFIED: added beadId parameter to useDrag, tap detection with 200ms/0.05 NDC thresholds, import useDesignStore
- `src/components/scene/Scene.tsx` — MODIFIED: added onPointerMissed for deselect, imported useDesignStore
