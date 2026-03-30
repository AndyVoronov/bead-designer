---
id: T03
parent: S01
milestone: M001
provides:
  - DragControls hook for kinematicPosition-based pointer drag with velocity transfer
  - useBeadChain state management hook (addBead, removeBead, removeLast, reset)
  - SceneLoader with demo UI overlay (Add/Remove/Reset buttons)
  - Polished Scene with studio lighting, ContactShadows, Stats FPS counter
key_files:
  - src/components/scene/DragControls.tsx
  - src/hooks/useBeadChain.ts
  - src/hooks/__tests__/useBeadChain.test.ts
  - src/components/SceneLoader.tsx
  - src/components/scene/Scene.tsx
  - vitest.config.ts
key_decisions:
  - Vitest config uses fs.realpathSync to resolve NTFS junction paths (worktree is D:\ProjectsOnCursor → C:\Users\Andy junction)
  - React 19 state batching requires separate act() calls for sequential removeLast() in tests
patterns_established:
  - Vercel kinematicPosition drag pattern: pointerDown → kinematic + wakeUp → useFrame raycast → pointerUp → velocity from history → dynamic
  - Position history ring buffer (HISTORY_SIZE=3) for smooth velocity computation on release
observability_surfaces:
  - drei Stats FPS counter visible in dev mode (top-left corner of canvas)
  - Browser DevTools console for Three.js/Rapier deprecation warnings
  - WebGL pixel sampling for verifying scene renders content
duration: 25m
verification_result: passed
completed_at: 2026-03-29T23:55:00Z
blocker_discovered: false
---

# T03: Add pointer drag, useBeadChain hook, and visual polish

**Verified all T03 deliverables: DragControls kinematic drag works, useBeadChain hook with 10 passing tests, polished Scene with studio lighting, and demo UI with Add/Remove/Reset buttons.**

## What Happened

All T03 files were already implemented in prior work. This task verified and fixed two issues to make everything pass:

1. **Vitest config NTFS junction fix**: The worktree directory is an NTFS junction (`D:\ProjectsOnCursor\ToyDesigner\.gsd\worktrees\M001` → `C:\Users\Andy\.gsd\projects\e8d021c112b7\worktrees\M001`). Vite's `/@fs/` protocol couldn't resolve the setup file path across the junction boundary. Fixed by using `fs.realpathSync(__dirname)` in `vitest.config.ts` for both `setupFiles` and `server.fs.allow`.

2. **React 19 batching test fix**: Three tests in `useBeadChain.test.ts` failed with `RangeError: Invalid array length` because React 19 batches state updates inside a single `act()` callback. A `while` loop calling `removeLast()` in one `act()` caused stale reads. Fixed by splitting into separate `act()` calls for each `removeLast()` invocation.

Browser verification confirmed:
- Chain of 7 beads renders and hangs under gravity
- Drag interaction works (cursor: grab → grabbing → auto on release)
- Add button increases bead count (7 → 8)
- Remove button decreases bead count (12 → 11)
- Reset button restores to 7 beads
- No console errors (only Three.js deprecation warnings)

## Verification

All automated checks pass. Browser interaction confirmed drag lifecycle and UI buttons work correctly.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run` | 0 | ✅ pass | 4.6s |
| 2 | `npm run build` | 0 | ✅ pass | 13.4s |
| 3 | Browser: chain renders with 7 beads | — | ✅ pass | visual |
| 4 | Browser: drag bead → cursor grab/grabbing | — | ✅ pass | interactive |
| 5 | Browser: + Add → 8 beads | — | ✅ pass | interactive |
| 6 | Browser: − Remove → 11 beads | — | ✅ pass | interactive |
| 7 | Browser: ↺ Reset → 7 beads | — | ✅ pass | interactive |

## Diagnostics

- **FPS counter**: drei `<Stats />` renders in top-left corner during dev
- **Console**: Three.js deprecation warnings (Clock→Timer, PCFSoftShadowMap→PCFShadowMap) — non-blocking
- **Dev server**: Must run from real path (`C:\Users\Andy\.gsd\projects\...`) not junction path (`D:\ProjectsOnCursor\...`) due to Next.js path concatenation bug with NTFS junctions

## Deviations

- Fixed `vitest.config.ts` to handle NTFS junction worktree paths (not in original plan)
- Fixed React 19 state batching issue in test file (not in original plan)

## Known Issues

- Dev server must be started from the real filesystem path, not the junction path — Next.js concatenates both paths when resolving `.next/dev/routes-manifest.json`, causing 500 errors
- Three.js emits deprecation warnings for Clock and PCFSoftShadowMap — cosmetic, non-functional

## Files Created/Modified

- `vitest.config.ts` — Added fs.realpathSync for NTFS junction compatibility
- `src/hooks/__tests__/useBeadChain.test.ts` — Fixed React 19 batching in removeLast edge-case test
- `src/components/scene/Scene.tsx` — Removed debug preserveDrawingBuffer (was only for verification)
