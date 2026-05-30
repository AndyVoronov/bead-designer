"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Loader } from "@react-three/drei";
import { BeadStringScene } from "./BeadStringScene";
import { LandingOverlay } from "./LandingOverlay";

/* ── Shared scroll ref for 3D scene (without R3F ScrollControls) ──── */
export const scrollOffsetRef = { current: 0 };

export default function LandingPage() {
  const [isMobile, setIsMobile] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const max = container.scrollHeight - container.clientHeight;
      scrollOffsetRef.current = max > 0 ? container.scrollTop / max : 0;
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Fixed 3D background — no pointer events */}
      <div className="fixed inset-0 z-0" style={{ pointerEvents: "none" }}>
        <Canvas
          shadows
          camera={{
            position: [0, 0, 9],
            fov: isMobile ? 55 : 45,
          }}
          gl={{ antialias: true }}
        >
          <Suspense fallback={null}>
            <BeadStringScene isMobile={isMobile} />
          </Suspense>
        </Canvas>
      </div>

      {/* Normal scrolling content on top */}
      <div ref={scrollContainerRef} className="relative z-10" style={{ height: "100vh", overflow: "auto", touchAction: "auto", WebkitOverflowScrolling: "touch" }}>
        <LandingOverlay />
      </div>

      <Loader
        containerStyles={{ backgroundColor: "#fbf8f6" }}
        barStyles={{ backgroundColor: "#f43f5e" }}
        dataStyles={{ color: "#be123c", fontWeight: "bold" }}
      />
    </>
  );
}
