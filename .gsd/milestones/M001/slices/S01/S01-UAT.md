# S01: 3D-физика цепочки бусин — UAT

**Milestone:** M001
**Written:** 2026-03-30

## UAT Type

- UAT mode: live-runtime
- Why this mode is sufficient: S01 delivers an interactive 3D physics demo. The value is visceral — the chain must hang realistically, respond to drag, and swing with inertia. This can only be judged by a human watching the runtime behavior in a real browser. Automated tests cover the state logic (10 passing), but the physics feel requires eyes on screen.

## Preconditions

- Node.js 18+ installed
- Dev server running: `npm run dev` from the real path `C:\Users\Andy\.gsd\projects\e8d021c112b7\worktrees\M001` (NOT the junction path)
- Real desktop browser (Chrome/Firefox/Edge) — headless/Playwright won't show WebGL content
- URL: http://localhost:3000

## Smoke Test

**Open http://localhost:3000 in a desktop browser.** You should see a 3D scene with a chain of 7 colorful spheres hanging from a small dark anchor point at the top, connected by a brown thread. The beads should sway gently. An FPS counter appears in the top-left. A control panel at the bottom shows "7 beads" with +Add, −Remove, and ↺Reset buttons.

## Test Cases

### 1. Chain hangs under gravity

1. Load http://localhost:3000
2. Wait 2 seconds for physics to settle
3. **Expected:** 7 beads hang vertically below the anchor in a column. The chain sags slightly (not perfectly rigid). The MeshLine thread is visible as a smooth brown curve passing through all bead centers.

### 2. Chain swings when disturbed

1. With the chain settled, click and drag any middle bead (e.g., bead #4) quickly to the side and release
2. **Expected:** The entire chain swings back and forth like a pendulum. Beads above and below the dragged bead follow the motion. The swing gradually dampens and stops (damping=2). No bead "explodes" or flies off to infinity.

### 3. Drag any bead — chain follows

1. Click and hold any bead
2. While holding, move the mouse around the viewport
3. **Expected:** The held bead follows the mouse position (projected onto a plane). All other beads on the chain follow with a slight delay due to rope joint physics. The thread remains smooth and connected throughout. Cursor shows "grabbing" while dragging.

### 4. Release with inertia

1. Click a bead, drag it quickly in one direction, and release
2. **Expected:** On release, the bead continues moving in the drag direction (inertia/throw). The chain follows the bead's momentum. Beads swing and gradually come to rest.

### 5. Add bead button

1. Click the green "+ Add" button at the bottom
2. **Expected:** A new bead appears at the bottom of the chain. Bead count in the UI increases by 1 (e.g., "7 beads" → "8 beads"). The new bead is connected to the chain by a rope joint and hangs under gravity. The thread extends to include the new bead.

### 6. Remove bead button

1. Click the red "− Remove" button at the bottom
2. **Expected:** The last bead is removed from the chain. Bead count decreases by 1 (e.g., "8 beads" → "7 beads"). The remaining chain adjusts — the thread shortens, physics settles.

### 7. Reset button

1. Add a few beads (+ Add), then click the "↺ Reset" button
2. **Expected:** Chain resets to exactly 7 beads in the default configuration. All added beads are removed. The chain hangs freshly from the anchor.

### 8. Camera orbit

1. Click and drag on the background (not on a bead)
2. **Expected:** The camera orbits around the chain. You can view the chain from the side, above, or below. Release stops orbiting.

### 9. Visual quality

1. Look at the scene overall
2. **Expected:** Soft studio lighting (no harsh shadows). Ground contact shadow beneath the chain. Beads have a slight specular highlight (metalness=0.1, roughness=0.3). Background is a light gradient. The UI overlay is semi-transparent with blur (frosted glass look). Beads are different colors (wood tones, pink, blue, cream).

### 10. Build verification (non-browser)

1. Run `npm run build`
2. **Expected:** Exit code 0. No TypeScript errors. Output shows "✓ Compiled successfully".

### 11. Test suite (non-browser)

1. Run `npx vitest run`
2. **Expected:** 10 tests pass across 1 test file. No failures.

## Edge Cases

### Rapid add/remove

1. Click "+ Add" 5 times quickly, then "− Remove" 5 times quickly
2. **Expected:** Beads are added and removed without physics explosions or visual glitches. Chain remains stable. No console errors.

### Drag bead to extreme position

1. Click a bead and drag it far from the anchor (to the edge of the viewport)
2. **Expected:** The chain stretches but rope joints constrain the maximum distance. Beads cluster near the dragged bead. No joint breaks (beads don't separate from the chain).

### Drag anchor area

1. Click near the anchor point (the small dark sphere at top)
2. **Expected:** Nothing happens — the anchor is `type="fixed"` and is not interactive. No crash or error.

### Single bead chain

1. Click "− Remove" until only 1 bead remains
2. **Expected:** Chain with 1 bead hangs normally. Thread connects anchor to the single bead. Drag works. Add button can still add more.

### Empty chain

1. Click "− Remove" until 0 beads remain
2. **Expected:** "0 beads" displayed. Only anchor and thread endpoint visible. No errors. "+ Add" button adds a bead back normally.

## Failure Signals

- **White/blank page**: Rapier WASM failed to load or SSR boundary broken — check browser console for errors
- **Beads falling through floor**: Physics world not initialized — check `<Physics>` wrapper in Scene.tsx
- **No thread visible**: MeshLine initialization failed — check console for "meshline" errors
- **Click on bead does nothing**: DragControls not wired — check onPointerDown on mesh in BeadRigidBody
- **Beads "explode" on add**: Ref instability on bead count change — check useMemo key on beadRefs in BeadChain
- **Cursor stuck on "grabbing"**: pointerUp not firing — check event propagation
- **Build fails with TS errors**: Type augmentation issue — check ThreeElements declaration in ThreadLine.tsx

## Not Proven By This UAT

- **Touch/mobile interaction**: DragControls is mouse-only. No touch gesture support verified.
- **Performance on mobile devices**: Only tested on desktop browser. FPS unknown on mobile.
- **Stability at 20-40 beads**: Only tested up to ~12 beads. Milestone requires stable behavior at 40.
- **PBR material rendering**: All beads use basic MeshStandardMaterial (color only, no textures).
- **Post-processing effects**: No SSGI, HBAO, or bloom applied yet.
- **Headless/automated browser rendering**: WebGL canvas shows blank in Playwright headless — known limitation.

## Notes for Tester

- **Dev server path**: You MUST run `npm run dev` from `C:\Users\Andy\.gsd\projects\e8d021c112b7\worktrees\M001`, not from the junction path. The junction path causes Next.js to double-concatenate paths and fail with ENOENT.
- **Three.js deprecation warnings**: You'll see "Clock is deprecated, use Timer" and "PCFSoftShadowMap is deprecated" in the console. These are cosmetic — ignore them.
- **Rapier "deprecated parameters"**: Benign message from Rapier WASM init. Not an error.
- **FPS counter**: The small panel in the top-left corner shows live FPS. Should be 60+ on desktop.
- **Settle time**: After page load, give the chain 1-2 seconds to settle under gravity before judging its resting position.
- **Physics debug mode**: To see collider wireframes and joint connections, uncomment `<Physics debug>` in Scene.tsx and reload.
