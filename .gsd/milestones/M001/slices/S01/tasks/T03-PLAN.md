---
estimated_steps: 8
estimated_files: 6
---

# T03: Add pointer drag, useBeadChain hook, and visual polish

**Slice:** S01 — 3D-физика цепочки бусин
**Milestone:** M001

## Description

Completes the interactive demo: adds Vercel-pattern kinematic drag so users can grab and throw beads, creates the useBeadChain state management hook (interface for S03 editor), polishes visuals with Environment/ContactShadows/lighting, and wires a minimal UI for add/remove beads. This closes R001 (full interactive physics chain) and R011 (beautiful visuals).

## Steps

1. Create `src/components/scene/DragControls.tsx`:
   - Implement as a React context/hook pair that wraps individual bead interaction
   - Core pattern (from Vercel badge):
     - On `onPointerDown` on a bead mesh: call `rigidBody.setBodyType('kinematicPosition')`, `rigidBody.wakeUp()`, store the body ref and initial pointer position
     - In `useFrame`: if dragging, cast ray from camera through pointer, project to plane at bead's depth, call `rigidBody.setNextKinematicTranslation({ x, y, z })`
     - On `onPointerUp`: compute velocity from last 2-3 frames of position deltas (store `prevPos` and timestamp each frame), call `rigidBody.setLinvel(velocity)`, `rigidBody.setAngvel(angularVel)`, call `rigidBody.setBodyType('dynamic')`
   - Use `useThree()` to access camera and pointer
   - Export a `useDrag` hook or `<Draggable>` wrapper component that beads can use

2. Integrate drag into `src/components/scene/BeadRigidBody.tsx`:
   - Wrap the `<mesh>` with drag event handlers from DragControls
   - On `onPointerDown`: initiate drag (switch to kinematic, start tracking)
   - On `onPointerUp`: end drag (restore dynamic, apply velocity)
   - On `onPointerMissed` on the Canvas: no-op (don't deselect)
   - Ensure `cursor: grab` / `cursor: grabbing` style on hover/drag via R3F `onPointerOver`/`onPointerOut`

3. Create `src/hooks/useBeadChain.ts`:
   - State: `beads: BeadState[]` with useState, initialized with 7 default beads
   - `addBead(type?: BeadType)`: creates a new BeadState with unique id (`bead-${Date.now()}`), default radius/color for type, appends to array
   - `removeBead(id: BeadId)`: removes bead by id from array
   - `removeLast()`: removes the last bead
   - `reset()`: restores initial 7-bead array
   - Return `{ beads, addBead, removeBead, removeLast, reset }`
   - Export default bead types config: colors and radii for wood/silicone/knit/plastic

4. Create `src/hooks/__tests__/useBeadChain.test.ts`:
   - Test: initial state has 7 beads
   - Test: `addBead()` increases count by 1
   - Test: `removeBead(id)` removes the correct bead
   - Test: `removeLast()` removes the last bead
   - Test: `reset()` returns to initial 7 beads
   - Test: each bead has required fields (id, type, radius, color)
   - Use `renderHook` from @testing-library/react

5. Enhance `src/components/scene/Scene.tsx` with visual polish:
   - Replace `<Environment preset="city" />` with `<Environment preset="studio" />` for softer product-style lighting
   - Add warm directional light: `<directionalLight position={[5, 8, 5]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />`
   - Add ambient fill: `<ambientLight intensity={0.3} />`
   - Keep `<ContactShadows>` for soft ground shadows
   - Set canvas background to a soft gradient or off-white via CSS
   - Add `<Stats />` from drei in dev mode for FPS monitoring

6. Wire useBeadChain into `src/app/page.tsx`:
   - Create a wrapper `"use client"` component (e.g., `BeadDesigner`) that uses `useBeadChain`
   - Pass `beads` to `<Scene beads={beads} />`
   - Add minimal overlay UI with Tailwind:
     - Bottom-center floating panel with 3 buttons: "+ Add bead", "− Remove", "↺ Reset"
     - Small title "Bead Chain" in top-left corner
   - Style: soft rounded buttons, subtle backdrop-blur panel, pastel palette

7. Update `src/components/scene/BeadChain.tsx` to accept beads as props from parent:
   - Change from hardcoded default beads to `beads: BeadState[]` prop
   - Position beads in a vertical column below anchor based on array index
   - Ensure React keys use bead.id for correct remounting on add/remove

8. Final verification: `npm run build`, `npx vitest run`, `npm run dev` → browser test:
   - Chain hangs, drag works, add/remove changes chain, scene looks polished
   - FPS stable at 60 on desktop

## Must-Haves

- [ ] Drag any bead with mouse — chain follows realistically
- [ ] Released bead continues moving with inertia (velocity preserved)
- [ ] `useBeadChain` hook manages beads state with add/remove/reset
- [ ] useBeadChain vitest tests pass
- [ ] Add/remove/reset buttons in UI change the chain
- [ ] Scene has studio lighting, contact shadows, and polished look
- [ ] `<Stats>` FPS counter visible in dev
- [ ] `npm run build` succeeds

## Verification

- `npx vitest run` — all useBeadChain tests pass
- `npm run build` exits 0
- Browser: drag bead → chain follows → release → bead swings with inertia
- Browser: click "+ Add" → new bead appears on chain; "− Remove" → last bead gone; "↺ Reset" → back to 7 beads
- Browser: FPS counter shows 55-60 on desktop

## Observability Impact

- Signals added: `<Stats>` FPS counter overlay in dev mode
- How to inspect: FPS counter visible in top-left corner of canvas; browser DevTools console for any Three.js/Rapier warnings
- Failure state: If physics explodes during drag (bodies fly apart), check damping values and verify kinematicPosition mode is correctly toggled on/off

## Inputs

- `src/types/bead.ts` — BeadState, BeadId, BeadType types (from T01)
- `src/components/scene/BeadRigidBody.tsx` — physics bead component (from T02)
- `src/components/scene/BeadChain.tsx` — chain with rope joints (from T02)
- `src/components/scene/ThreadLine.tsx` — meshline thread (from T02)
- `src/components/scene/Scene.tsx` — Canvas + Physics scene (from T02)
- `vitest.config.ts` — test runner config (from T01)
- `.gsd/milestones/M001/slices/S01/S01-RESEARCH.md` — Vercel drag pattern details, common pitfalls (velocity transfer, wakeUp)

## Expected Output

- `src/components/scene/DragControls.tsx` — kinematic drag logic (context + hook)
- `src/hooks/useBeadChain.ts` — bead chain state management hook
- `src/hooks/__tests__/useBeadChain.test.ts` — unit tests for hook
- `src/components/scene/BeadRigidBody.tsx` — updated with drag event handlers
- `src/components/scene/Scene.tsx` — updated with studio lighting, shadows, Stats
- `src/app/page.tsx` — updated with useBeadChain + demo UI buttons
