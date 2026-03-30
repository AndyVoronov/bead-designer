---
estimated_steps: 6
estimated_files: 4
---

# T03: Performance tuning and 20+ bead verification

**Slice:** S02 — Мобильный рендеринг + PBR-материалы
**Milestone:** M001

## Description

Closes R002 by proving 30+ FPS with 20+ beads on mobile emulation. Applies geometry-level optimizations (sphere segments, thread curve points, shadow resolution) to reduce vertex count and draw calls. Documents baseline performance numbers for future regression testing.

**Important context:** S01 tested chain stability up to ~12 beads. This task pushes to 20+ and measures both physics stability and rendering performance. If FPS drops below 30, apply mitigations in order: reduce sphere segments (32→16), reduce ThreadLine curve points (20→12), reduce ContactShadows resolution (256→128), reduce Rapier solver iterations. Document which mitigations were needed.

**Risk:** The primary unknown is whether Rapier WASM + R3F rendering maintains 30+ FPS with 20+ beads on real mid-range mobile. Chrome DevTools mobile emulation with CPU throttling (4x slowdown) is the available proxy. Real device testing happens in S07.

## Steps

1. **Optimize sphere geometry in `src/components/scene/BeadRigidBody.tsx`** — Add `segments?: number` prop (default 24, down from hardcoded 32). Change `<sphereGeometry args={[radius, 32, 32]} />` to `<sphereGeometry args={[radius, segments, segments]} />`. This reduces per-bead vertex count by ~44% (32→24 segments).

2. **Optimize ThreadLine curve in `src/components/scene/ThreadLine.tsx`** — Reduce CatmullRom curve points from 32 to 20. Change `curve.getPoints(32)` to `curve.getPoints(20)`. Still produces a visually smooth thread but with fewer vertices.

3. **Reduce ContactShadows resolution in `src/components/scene/Scene.tsx`** — Add `resolution={256}` prop to `<ContactShadows>` (default is 512). This halves the shadow pass resolution, saving GPU time.

4. **Add performance baseline logging in `src/components/scene/AdaptiveRenderer.tsx`** — In the `PerformanceMonitor` callbacks, include the current `factor` value in the log message: `console.log('[perf] FPS dropping — reducing quality, factor:', factor)`. Also add an initial log on mount: `console.log('[perf] AdaptiveRenderer initialized — monitoring FPS')`.

5. **Test with 20+ beads in browser** — Open the app, use the Add button to add beads until count reaches 20+. Observe the Stats FPS counter. Switch to Chrome DevTools mobile emulation (Galaxy S20 or Pixel 5), enable CPU throttling (4x slowdown), and verify FPS stays above 30. If below 30, apply mitigations:
   - Reduce sphere segments to 16
   - Reduce ThreadLine curve points to 12
   - Reduce ContactShadows resolution to 128
   - Add `solverIterations={4}` to `<Physics>` (default is 8)

6. **Document baseline performance** — Add a comment block at the top of `src/components/scene/Scene.tsx` or in `src/components/scene/AdaptiveRenderer.tsx`:
   ```
   /**
    * Performance Baseline (S02):
    * - Device: [emulated device name]
    * - Beads: 20+
    * - FPS: [observed value]
    * - Mitigations applied: [list or "none"]
    * - Sphere segments: [value]
    * - Thread curve points: [value]
    * - ContactShadows resolution: [value]
    */
   ```

## Must-Haves

- [ ] Sphere geometry uses configurable segment count (default 24)
- [ ] ThreadLine curve uses 20 points (down from 32)
- [ ] ContactShadows resolution reduced to 256
- [ ] 20+ beads render at 30+ FPS on mobile emulation with CPU throttling
- [ ] Performance baseline documented in code comment
- [ ] `npm run build` passes clean

## Verification

- `npm run build` — zero errors
- `npx vitest run` — all tests pass (existing + T02 additions)
- Browser: add beads to 20+, Stats FPS counter shows 30+ on mobile emulation with 4x CPU throttle
- Browser: all bead types still visually distinct after geometry reduction
- Browser: chain physics remains stable (no explosions, no jitter) at 20+ beads
- Browser: console shows PerformanceMonitor log messages when FPS changes

## Inputs

- `src/components/scene/BeadRigidBody.tsx` — sphere geometry to optimize (currently hardcoded 32 segments)
- `src/components/scene/ThreadLine.tsx` — curve points to reduce (currently 32)
- `src/components/scene/Scene.tsx` — ContactShadows to tune
- `src/components/scene/AdaptiveRenderer.tsx` — PerformanceMonitor to enhance logging

## Expected Output

- `src/components/scene/BeadRigidBody.tsx` — configurable sphere segments, default 24
- `src/components/scene/ThreadLine.tsx` — reduced curve points (20)
- `src/components/scene/Scene.tsx` — ContactShadows resolution=256, performance baseline comment
- `src/components/scene/AdaptiveRenderer.tsx` — enhanced PerformanceMonitor logging with factor values
