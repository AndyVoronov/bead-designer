---
estimated_steps: 5
estimated_files: 5
---

# T05: Add bead selection in 3D, pacifier clip, and wire remove-selected

**Slice:** S03 — Каталог бусин + редактор UI
**Milestone:** M001

## Description

This task closes the loop on R005 (interactive editor — remove beads) and R009 (pacifier holder product type). Three features: (1) tap-to-select a bead in the 3D scene with a time/distance threshold to distinguish from drag, (2) visual highlight on the selected bead, and (3) a pacifier clip 3D mesh replacing the plain gray anchor sphere.

The tap-vs-drag distinction is the trickiest part: `useDrag` currently starts dragging on every pointer-down. We need to defer the drag decision — if the pointer is released quickly (<200ms) without moving much (<5px NDC), it's a tap (select). Otherwise, it's a drag.

## Steps

1. **Create `src/components/editor/PacifierClip.tsx`** as `"use client"` — A 3D component that renders a pacifier clip shape using Three.js primitives:
   - A torus (ring) as the main clip loop: `<mesh><torusGeometry args={[0.15, 0.03, 16, 32]} /><meshStandardMaterial color="#C0C0C0" roughness={0.3} metalness={0.8} /></mesh>`
   - A cylinder as the clip arm: `<mesh position={[0.12, 0, 0]} rotation={[0, 0, Math.PI/4]}><cylinderGeometry args={[0.025, 0.025, 0.2, 16]} /><meshStandardMaterial color="#C0C0C0" roughness={0.3} metalness={0.8} /></mesh>`
   - Wrap in a `<group>` with `position={[0, -0.1, 0]}` to offset slightly below the anchor point (clip hangs below the attachment point)
   - Metallic silver appearance (roughness 0.3, metalness 0.8) — looks like a real clip

2. **Update `src/components/scene/BeadChain.tsx`** — Replace the anchor sphere mesh with `<PacifierClip />`:
   - Import `PacifierClip` from `@/components/editor/PacifierClip`
   - Replace the `<mesh><sphereGeometry ...><meshStandardMaterial ... /></mesh>` inside the anchor RigidBody with `<PacifierClip />`
   - Keep the `<BallCollider args={[ANCHOR_RADIUS]} />` (physics needs the spherical collider)
   - Add `selectedBeadId` prop to `BeadChainProps` (optional, defaults to null)
   - Pass `highlighted={bead.id === selectedBeadId}` to each `<BeadRigidBody>`

3. **Update `src/components/scene/BeadRigidBody.tsx`** — Add selection highlight:
   - Add optional `highlighted?: boolean` prop
   - When `highlighted` is true, render an additional wireframe sphere slightly larger than the bead: `<mesh scale={[1.15, 1.15, 1.15]}><sphereGeometry args={[radius, segments, segments]} /><meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.3} wireframe transparent opacity={0.6} /></mesh>`
   - This gives a golden wireframe glow effect on the selected bead
   - The highlight mesh is a sibling of the main mesh (inside the same RigidBody) — no physics impact

4. **Update `src/components/scene/DragControls.tsx`** — Add tap detection to distinguish from drag:
   - Add `beadId: string` parameter to `useDrag(bodyRef, beadId)` (or as a separate `useBeadInteraction` hook to avoid changing the existing drag API)
   - **Recommended approach**: Create a separate tap detection layer. In `BeadRigidBody`, add an `onPointerUp` handler that checks:
     - If the bead was NOT dragged (pointer didn't move more than 5px and time < 200ms since pointer-down)
     - Then call `useDesignStore.getState().selectBead(beadId)`
     - If it WAS dragged, call `selectBead(null)` to deselect
   - To implement: store `pointerDownTime` and `pointerDownPosition` (NDC) on pointer-down. On pointer-up, check `(performance.now() - startTime < 200) && (distance(pointerDownPos, currentPointer) < 0.05)`. If tap → select bead. This can be done in `useDrag` by adding the time/position tracking and returning an `isTap` flag, OR it can be done in `BeadRigidBody` with a separate `onPointerUp` handler.
   - **Simpler approach for the executor**: Track `pointerDownTime` and `pointerDownPos` in the drag ref. In `onPointerUp`, before the velocity computation, check if it was a tap. If so, call `selectBead(beadId)` instead of applying velocity and switching back to dynamic. Add `beadId` as a second parameter to `useDrag`.
   - The `useDrag` function signature becomes: `useDrag(bodyRef, beadId?: string)`

5. **Wire everything together**:
   - Update `BeadRigidBody` to accept and forward `beadId` (which is `bead.id` from the parent `BeadChain`) to `useDrag`, and also accept `highlighted` prop
   - Update `BeadChain` to pass `bead.id` and `highlighted` to each `BeadRigidBody`
   - Verify `EditorToolbar`'s "Удалить" button calls `useDesignStore.getState().removeSelected()` — this was wired in T03, just verify it works end-to-end
   - Clicking empty space (not on a bead) should deselect: add a click handler on the Canvas or a background plane in Scene that calls `selectBead(null)`

## Must-Haves

- [ ] `PacifierClip` renders a metallic clip shape (torus + cylinder)
- [ ] Anchor in `BeadChain` shows the pacifier clip instead of plain sphere
- [ ] `BeadRigidBody` accepts `highlighted` prop and shows golden wireframe glow
- [ ] `BeadChain` passes `selectedBeadId` prop and derives `highlighted` per bead
- [ ] Tapping a 3D bead selects it (highlight appears, store `selectedBeadId` updates)
- [ ] Tapping another bead switches selection
- [ ] Tapping empty space deselects
- [ ] "Удалить" toolbar button removes the selected bead from chain
- [ ] Bead drag still works (press + move without tap threshold breach)
- [ ] `npx vitest run` — all tests pass
- [ ] `npm run build` — zero TypeScript errors

## Verification

- `npm run build` — zero errors
- `npx vitest run` — all tests pass
- Browser: pacifier clip visible at top of chain (metallic silver torus + cylinder)
- Browser: tapping a bead in 3D → golden wireframe highlight appears on that bead
- Browser: tapping another bead → highlight moves to new bead
- Browser: tapping empty space in 3D → highlight disappears
- Browser: pressing "Удалить" → selected bead disappears from chain
- Browser: pressing and dragging a bead → bead moves (drag), no selection change
- Browser: "Сброс" → chain resets to defaults, no selection

## Observability Impact

- Selection state is visible via `useDesignStore.getState().selectedBeadId` — inspectable in browser console
- Failure visibility: if tap detection breaks, either all taps become drags (can't select) or all drags become taps (can't drag beads) — immediately visible in the browser

## Inputs

- `src/components/scene/BeadChain.tsx` — anchor rendering, bead mapping (from S01, modified in T03)
- `src/components/scene/BeadRigidBody.tsx` — bead mesh with drag interaction (from S01/S02)
- `src/components/scene/DragControls.tsx` — drag hook to extend with tap detection (from S01)
- `src/components/scene/Scene.tsx` — 3D scene with selectedBeadId prop (modified in T03)
- `src/stores/useDesignStore.ts` — selectBead/removeSelected actions (from T02)
- `src/components/editor/EditorToolbar.tsx` — remove button already wired (from T03)

## Expected Output

- `src/components/editor/PacifierClip.tsx` — new: pacifier clip 3D mesh
- `src/components/scene/BeadChain.tsx` — modified: PacifierClip anchor, selectedBeadId prop
- `src/components/scene/BeadRigidBody.tsx` — modified: highlighted prop, beadId forwarding
- `src/components/scene/DragControls.tsx` — modified: tap detection, beadId parameter
- `src/components/scene/Scene.tsx` — modified: deselect on background click
