# S02: Мобильный рендеринг + PBR-материалы — UAT

**Milestone:** M001
**Written:** 2026-03-30

## UAT Type

- UAT mode: live-runtime
- Why this mode is sufficient: S02's deliverables are inherently visual and performance-oriented (material appearance, touch interaction, FPS). Contract tests cover the configuration invariants; this UAT verifies the integrated runtime behavior in a real browser.

## Preconditions

- Dev server running from real path (not junction): `npm run dev -- --port 3000` from `C:\Users\Andy\.gsd\projects\...\worktrees\M001`
- Browser with WebGL support (Chrome recommended)
- Chrome DevTools device toolbar for mobile emulation (Galaxy S24 or equivalent)

## Smoke Test

Open `http://localhost:3000` in Chrome. The 3D scene fills the viewport with beads hanging on a thread. The Stats FPS counter is visible in the top-left corner. No console errors.

## Test Cases

### 1. Mobile viewport fills screen without scroll/zoom

1. Open Chrome DevTools → toggle device toolbar (Ctrl+Shift+M)
2. Select Galaxy S24 (360×780) or iPhone 14 Pro (393×852)
3. **Expected:** Scene fills the entire viewport (360×780 or 393×852). No horizontal scrollbar. No vertical scrollbar. Pinch-zoom gesture does nothing.
4. Verify: In Elements panel, `<html>` computed height = viewport height. `<canvas>` computed touch-action = `none`.

### 2. Four visually distinct bead material types

1. On the default scene (7 beads), observe the beads closely
2. Identify beads of different types — the default chain includes wood (brown), silicone (pink), knit (multicolor), plastic (teal) beads
3. **Expected:** Wood beads appear matte/diffuse. Silicone beads appear glossy/smooth with slight reflections. Knit beads have a bumpy/textured appearance. Plastic beads have a slight sheen.
4. Verify: In Three.js inspector (right-click bead → Inspect), check material.roughness values differ between bead types (wood ~0.75, silicone ~0.2, knit ~0.9, plastic ~0.35).

### 3. Drag bead — OrbitControls do not interfere

1. Click and hold on any bead in the scene
2. Drag the bead to a new position
3. **Expected:** The bead follows the cursor/finger. The camera does NOT rotate during the drag. Other beads remain connected via the thread.
4. Verify: Open console, during drag run `useDragStore.getState()` (or check React DevTools for the store). `isDragging` should be `true`.

### 4. Orbit rotation when NOT dragging a bead

1. Click and hold on empty space (not on a bead)
2. Drag to rotate the camera
3. **Expected:** Camera orbits around the scene center. Beads remain in their positions. The thread follows the beads.
4. Verify: After releasing, drag a bead — OrbitControls should stop again (confirm bidirectional switching).

### 5. FPS at 7 beads (baseline)

1. Observe the Stats FPS counter (top-left)
2. Wait 3-5 seconds for PerformanceMonitor to stabilize
3. **Expected:** FPS = 60 on desktop. FPS = 60 on mobile emulation.

### 6. FPS at 20+ beads

1. Use the "+" button to add beads until count reaches 21+
2. Wait 3-5 seconds for PerformanceMonitor to stabilize
3. **Expected:** FPS ≥ 30 on mobile emulation (360×780, Galaxy S24). In practice, 60 FPS was observed during T03 testing.

### 7. PerformanceMonitor adaptive quality

1. Open browser console
2. Look for `[perf]` prefixed messages
3. If using Chrome DevTools: enable "4× slowdown" in Performance tab
4. **Expected:** `[perf] FPS declining` and `[perf] FPS critically low — fallback applied` messages appear. Quality adjusts (DPR reduces, fewer pixels rendered). After removing throttling, `[perf] FPS improving` appears and quality ramps back up.

## Edge Cases

### PerformanceMonitor warmup false alarm

1. Fresh load the page and watch the console
2. **Expected:** You may see `[perf] FPS critically low — fallback applied` within the first few seconds. This is the PerformanceMonitor's initial quality ramp-up (starts at factor 0.6, ramps to 1.0). **This is NOT a real performance issue.** Ignore it if FPS is actually 60.

### THREE.WebGLShadowMap deprecation warning

1. Check console for warnings
2. **Expected:** `THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated` warnings appear per frame. Cosmetic only — from drei's ContactShadows/Environment internals. No functional impact.

## Failure Signals

- **FPS below 30 at 20+ beads on mobile emulation** — indicates regression from T03 performance baseline
- **Canvas touch-action = auto (not none)** — indicates CSS !important override not working (R3F version change?)
- **OrbitControls rotate during bead drag** — indicates dragStore not connected or DragAwareOrbitControls not reactive
- **All beads look identical** — indicates BeadMaterial not receiving `type` prop from BeadChain
- **Build errors** — TypeScript or SSR gate failure
- **Test failures** — `npx vitest run` shows red

## Not Proven By This UAT

- **Real mobile device performance** — only Chrome DevTools mobile emulation tested. Real phones with thermal throttling, weaker GPUs, and touch latency not verified until S07.
- **PNG texture loading** — materials use procedural noise, not real user-provided PNG textures. Texture integration deferred to S03/S06.
- **High-speed gesture stability** — drag behavior during fast swipes on real touch hardware not tested.
- **Battery impact** — adaptive rendering impact on battery life not measured.

## Notes for Tester

- The `!important` on `.canvas-container canvas { touch-action: none !important; }` is intentional — R3F sets inline `touch-action: auto` that would override the CSS cascade without it.
- PerformanceMonitor's initial ramp-up triggers `onFallback` — this is expected behavior, not a bug.
- The Stats FPS counter (top-left) is dev-only and won't appear in production builds.
- Sphere segments reduced to 24 (from 32) and thread curve points to 20 (from 32) for mobile performance — this is intentional quality/performance trade-off.
