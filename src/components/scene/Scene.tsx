"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { OrbitControls, Environment } from "@react-three/drei";

export default function Scene() {
  return (
    <Canvas camera={{ position: [0, 2, 8], fov: 50 }}>
      <color attach="background" args={["#87ceeb"]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />

      <Suspense fallback={null}>
        <Environment preset="city" />
        <Physics gravity={[0, -40, 0]}>
          {/* Test mesh — pink box */}
          <RigidBody>
            <mesh position={[0, 1, 0]} castShadow>
              <boxGeometry args={[0.5, 0.5, 0.5]} />
              <meshStandardMaterial color="hotpink" />
            </mesh>
          </RigidBody>

          {/* Ground plane */}
          <RigidBody type="fixed">
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, -2, 0]}
              receiveShadow
            >
              <planeGeometry args={[20, 20]} />
              <meshStandardMaterial color="#f0f0f0" />
            </mesh>
          </RigidBody>
        </Physics>
      </Suspense>

      <OrbitControls />
    </Canvas>
  );
}
