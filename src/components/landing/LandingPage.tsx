"use client";

import { Suspense, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { ScrollControls, Scroll, Loader } from "@react-three/drei";
import { BeadStringScene } from "./BeadStringScene";
import { LandingOverlay } from "./LandingOverlay";

export default function LandingPage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const pages = isMobile ? 9 : 6;

  return (
    <>
      <Canvas
        shadows
        camera={{
          position: [0, 0, 9],
          fov: isMobile ? 55 : 45,
        }}
        style={{ width: "100vw", height: "100vh" }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <ScrollControls pages={pages} damping={0.25}>
            <BeadStringScene isMobile={isMobile} />
            <Scroll html style={{ width: "100%" }}>
              <LandingOverlay />
            </Scroll>
          </ScrollControls>
        </Suspense>
      </Canvas>
      <Loader
        containerStyles={{ backgroundColor: "#fbf8f6" }}
        barStyles={{ backgroundColor: "#f43f5e" }}
        dataStyles={{ color: "#be123c", fontWeight: "bold" }}
      />
    </>
  );
}
