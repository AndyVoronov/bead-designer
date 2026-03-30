"use client";

import dynamic from "next/dynamic";

const Scene = dynamic(() => import("@/components/scene/Scene"), {
  ssr: false,
});

export default function SceneLoader() {
  return (
    <div className="w-screen h-screen">
      <Scene />
    </div>
  );
}
