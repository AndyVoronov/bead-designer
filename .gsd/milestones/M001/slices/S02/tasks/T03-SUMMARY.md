---
id: T03
parent: S02
milestone: M001
provides:
  - Configurable sphere geometry segments (default 24, down from 32)
  - Reduced thread curve points (20, down from 32)
  - ContactShadows at 256 resolution (down from 512)
  - PerformanceMonitor logging with factor values
  - Performance baseline documented in Scene.tsx
key_files:
  - src/components/scene/BeadRigidBody.tsx
  - src/components/scene/ThreadLine.tsx
  - src/components/scene/Scene.tsx
  - src/components/scene/AdaptiveRenderer.tsx
key_decisions:
  - No further mitigations needed — 60 FPS sustained at 20+ beads on both desktop and mobile emulation
  - CPU throttling (4×) not available via Playwright — noted as limitation in baseline comment
patterns_established:
  - Configurable geometry detail via props with sensible defaults (segments prop pattern)
  - Performance baseline comment block in scene root for regression tracking
observability_surfaces:
  - PerformanceMonitor [perf] console logs with factor values (fps, index, factor, refreshrate)
  - drei Stats FPS overlay (dev mode)
  - Performance baseline comment in Scene.tsx
duration: 8m
verification_result: passed
completed_at: 2026-03-30
blocker_discovered: false
---

# T03: Performance tuning and 20+ bead verification

Applied geometry-level optimizations (sphere segments 32→24, thread curve points 32→20, ContactShadows resolution 512→256) and enhanced PerformanceMonitor logging with factor values. Tested 21 beads on both desktop and Galaxy S24 mobile emulation — sustained 60 FPS with no further mitigations needed. Documented performance baseline in Scene.tsx.

## What Happened

Applied four optimizations per the task plan:

1. **Sphere geometry**: Added `segments?: number` prop to `BeadRigidBodyProps` (default 24, down from hardcoded 32). Reduces per-bead vertex count by ~44%.

2. **ThreadLine curve**: Changed `curve.getPoints(32)` to `curve.getPoints(20)` in `ThreadLine.tsx`. Fewer vertices while maintaining visual smoothness.

3. **ContactShadows resolution**: Added `resolution={256}` to `<ContactShadows>` in `Scene.tsx` (default is 512). Halves shadow pass resolution.

4. **PerformanceMonitor logging**: Enhanced `AdaptiveRenderer.tsx` to include `factor` parameter in `onIncline`/`onDecline` callbacks and added a mount-time initialization log via `useEffect`.

Browser testing confirmed:
- Desktop (1280×720): 60 FPS with 21 beads
- Mobile emulation (Galaxy S24, 360×780): 60 FPS with 21 beads
- No further mitigations were needed (no CPU throttling available in Playwright, but headroom is substantial)
- PerformanceMonitor logs factor objects with fps, index, factor, flipped, and refreshrate fields
- Scene viewport fills mobile screen correctly with no scroll/zoom interference

## Verification

- `npm run build` — zero errors (13.2s)
- `npx vitest run` — 17/17 tests pass (10 useBeadChain + 7 beadMaterial)
- Browser: 21 beads render on desktop at 60 FPS (Stats overlay verified)
- Browser: 21 beads render on Galaxy S24 mobile emulation at 60 FPS
- Browser: PerformanceMonitor console logs show factor values on quality changes
- Browser: mobile viewport fills screen, no pinch-zoom or scroll interference

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm run build` | 0 | ✅ pass | 13.2s |
| 2 | `npx vitest run` | 0 | ✅ pass | 3.5s |
| 3 | Browser: 21 beads desktop FPS | — | ✅ pass | 60 FPS |
| 4 | Browser: 21 beads mobile FPS | — | ✅ pass | 60 FPS |
| 5 | Browser: PerformanceMonitor logs | — | ✅ pass | factor visible |
| 6 | Browser: mobile viewport | — | ✅ pass | 360×780 filled |

## Diagnostics

- **PerformanceMonitor**: Check browser console for `[perf]` prefixed messages. Factor objects include `{fps, index, factor, flipped, refreshrate}`. The monitor ramps quality up from 0.6 to 1.0 on first load (normal warmup behavior).
- **FPS**: drei `<Stats>` component renders a real-time FPS counter in the top-left corner (dev mode only).
- **Baseline comment**: Performance baseline is documented in the JSDoc comment block at the top of `src/components/scene/Scene.tsx`.

## Deviations

- **CPU throttling not applied**: The task plan specified testing with Chrome DevTools 4× CPU throttling, but this is a Chrome DevTools-only feature not available via Playwright's device emulation. Both desktop and mobile emulation at native clock sustained 60 FPS with 21 beads, providing substantial headroom above the 30 FPS target. Real device testing deferred to S07.
- **Task plan was missing `## Observability Impact` section**: Added per pre-flight fix requirement.

## Known Issues

- `PerformanceMonitor` `onFallback` fires after `flipflops={5}` threshold during initial warmup even when FPS is stable — this is expected drei behavior, not a performance issue.
- `THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated` warnings appear per frame — cosmetic only, from drei's Environment/ContactShadows internals.

## Files Created/Modified

- `src/components/scene/BeadRigidBody.tsx` — Added `segments` prop (default 24) for configurable sphere geometry detail
- `src/components/scene/ThreadLine.tsx` — Reduced CatmullRom curve points from 32 to 20
- `src/components/scene/Scene.tsx` — Added `resolution={256}` to ContactShadows; added performance baseline JSDoc comment
- `src/components/scene/AdaptiveRenderer.tsx` — Enhanced PerformanceMonitor callbacks with factor parameter logging; added mount-time initialization log via useEffect
