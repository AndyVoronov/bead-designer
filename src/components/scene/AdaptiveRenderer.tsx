"use client";

import { useEffect } from "react";
import { AdaptiveDpr, AdaptiveEvents, PerformanceMonitor } from "@react-three/drei";

/**
 * Adaptive rendering controls that live inside <Canvas>.
 *
 * - **AdaptiveDpr**: lowers pixel ratio when FPS drops, raises when stable.
 * - **AdaptiveEvents**: reduces pointer-move resolution on mobile for perf.
 * - **PerformanceMonitor**: watches frame rate and calls incline/decline/fallback
 *   callbacks when the refresh-rate ratio shifts.
 *
 * Bounds use a factor of the display refresh rate:
 *  - lower = 67% of refresh (e.g. 40 FPS at 60 Hz) → triggers decline
 *  - upper = 92% of refresh (e.g. 55 FPS at 60 Hz) → triggers incline
 * This leaves headroom above the 30 FPS minimum target.
 */
export default function AdaptiveRenderer() {
  useEffect(() => {
    console.log("[perf] AdaptiveRenderer initialized — monitoring FPS");
  }, []);

  return (
    <>
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />
      <PerformanceMonitor
        flipflops={5}
        bounds={(refreshRate) => [refreshRate * 0.67, refreshRate * 0.92]}
        onIncline={(factor) =>
          console.log("[perf] FPS improving — increasing quality, factor:", factor)
        }
        onDecline={(factor) =>
          console.log("[perf] FPS dropping — reducing quality, factor:", factor)
        }
        onFallback={() =>
          console.warn("[perf] FPS critically low — fallback applied")
        }
      />
    </>
  );
}
