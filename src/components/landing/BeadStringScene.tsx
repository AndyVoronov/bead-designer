"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useScroll, Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";

/* ── Bead palette ────────────────────────────────────────────────────────── */

export type SceneBeadShape = "sphere" | "oblate" | "buckyball";

const SCENE_BEADS = [
  { color: "#FF6B6B", size: 0.30, shape: "sphere" as SceneBeadShape },
  { color: "#FFB6C1", size: 0.24, shape: "oblate" as SceneBeadShape },
  { color: "#87CEEB", size: 0.34, shape: "buckyball" as SceneBeadShape },
  { color: "#FFD700", size: 0.26, shape: "sphere" as SceneBeadShape },
  { color: "#98FF98", size: 0.28, shape: "oblate" as SceneBeadShape },
  { color: "#FF69B4", size: 0.22, shape: "sphere" as SceneBeadShape },
  { color: "#E6E6FA", size: 0.32, shape: "buckyball" as SceneBeadShape },
  { color: "#F5DEB3", size: 0.20, shape: "oblate" as SceneBeadShape },
  { color: "#FF7F7F", size: 0.30, shape: "sphere" as SceneBeadShape },
  { color: "#96D9C5", size: 0.26, shape: "oblate" as SceneBeadShape },
  { color: "#DDA0DD", size: 0.32, shape: "buckyball" as SceneBeadShape },
  { color: "#FA8072", size: 0.24, shape: "sphere" as SceneBeadShape },
  { color: "#7FDBFF", size: 0.28, shape: "oblate" as SceneBeadShape },
  { color: "#E2725B", size: 0.26, shape: "sphere" as SceneBeadShape },
  { color: "#C9A0DC", size: 0.30, shape: "buckyball" as SceneBeadShape },
  { color: "#FDF5E6", size: 0.22, shape: "oblate" as SceneBeadShape },
];

const TOTAL = SCENE_BEADS.length;

/* ── Desktop curve points (right side, text on left) ─────────────────────── */

const DESKTOP_POINTS = [
  [2.5, 4, 0],
  [3.2, 2.5, 0.4],
  [2, 1, -0.3],
  [2.8, -0.5, 0.2],
  [2.2, -2, -0.4],
  [3, -3.5, 0.1],
  [2.4, -4.5, -0.2],
];

/* ── Mobile curve points (tighter, fits narrow viewport) ────────────────── */

const MOBILE_POINTS = [
  [0.6, 3, 0],
  [1.0, 1.5, 0.2],
  [0.4, 0, -0.15],
  [0.9, -1.5, 0.1],
  [0.5, -3, -0.2],
  [0.8, -4, 0.05],
  [0.3, -4.8, -0.1],
];

/* ── Single bead with scroll-linked scale animation ──────────────────────── */

function Bead({
  position,
  color,
  size,
  shape,
  index,
}: {
  position: THREE.Vector3;
  color: string;
  size: number;
  shape: SceneBeadShape;
  index: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const currentScale = useRef(0);
  const scroll = useScroll();

  useFrame(() => {
    if (!meshRef.current) return;
    const progress = scroll.offset;
    const threshold = (index / TOTAL) * 0.82;
    const target = progress >= threshold ? 1 : 0;
    currentScale.current += (target - currentScale.current) * 0.06;
    meshRef.current.scale.setScalar(currentScale.current);
  });

  return (
    <mesh ref={meshRef} position={position} scale={shape === "oblate" ? [1, 0.6, 1] : undefined}>
      {shape === "buckyball" ? (
        <dodecahedronGeometry args={[size, 0]} />
      ) : (
        <sphereGeometry args={[size, 32, 32]} />
      )}
      <meshStandardMaterial
        color={color}
        roughness={shape === "buckyball" ? 0.2 : 0.3}
        metalness={shape === "buckyball" ? 0.3 : 0.1}
      />
    </mesh>
  );
}

/* ── Main 3D scene ──────────────────────────────────────────────────────── */

export function BeadStringScene({ isMobile }: { isMobile: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  const points = isMobile ? MOBILE_POINTS : DESKTOP_POINTS;

  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
        false,
        "catmullrom",
        0.5
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isMobile]
  );

  const beadPositions = useMemo(
    () => SCENE_BEADS.map((_, i) => curve.getPointAt(i / (TOTAL - 1))),
    [curve]
  );

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y =
        Math.sin(state.clock.getElapsedTime() * 0.12) * 0.04;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Lighting */}
      <ambientLight intensity={0.55} />
      <pointLight position={[8, 8, 8]} intensity={1.0} color="#FFF5EE" />
      <directionalLight
        position={[-5, 5, 5]}
        intensity={0.6}
        color="#FFE4E1"
      />

      {/* Background */}
      <color attach="background" args={["#FFF8F5"]} />

      {/* Sparkles */}
      <Sparkles
        count={isMobile ? 10 : 20}
        scale={isMobile ? 8 : 14}
        size={2.5}
        speed={0.3}
        opacity={0.3}
        color="#FFB6C1"
      />

      {/* Floating bead string */}
      {isMobile ? (
        <group>
          {/* Thread/rope */}
          <mesh>
            <tubeGeometry args={[curve, 200, 0.012, 8, false]} />
            <meshStandardMaterial
              color="#C4A882"
              roughness={0.8}
              transparent
              opacity={0.5}
            />
          </mesh>
          {/* Beads — scroll-linked scale animation on mobile too */}
          {SCENE_BEADS.map((bead, i) => (
            <Bead
              key={i}
              position={beadPositions[i]}
              color={bead.color}
              size={bead.size * 0.85}
              shape={bead.shape}
              index={i}
            />
          ))}
        </group>
      ) : (
        <Float
          speed={1.2}
          rotationIntensity={0.04}
          floatIntensity={0.12}
        >
          <group>
            {/* Thread/rope */}
            <mesh>
              <tubeGeometry args={[curve, 200, 0.012, 8, false]} />
              <meshStandardMaterial
                color="#C4A882"
                roughness={0.8}
                transparent
                opacity={0.5}
              />
            </mesh>

            {/* Beads */}
            {SCENE_BEADS.map((bead, i) => (
              <Bead
                key={i}
                position={beadPositions[i]}
                color={bead.color}
                size={bead.size}
                shape={bead.shape}
                index={i}
              />
            ))}
          </group>
        </Float>
      )}

      {/* Decorative floating elements — desktop only */}
      {!isMobile && (
        <>
          <Float position={[-3.5, 2.5, -2]} speed={1.8}>
            <mesh>
              <sphereGeometry args={[0.2, 32, 32]} />
              <meshStandardMaterial
                color="#FFB6C1"
                roughness={0.8}
                transparent
                opacity={0.45}
              />
            </mesh>
          </Float>
          <Float position={[3.5, -3.5, -2]} speed={1.3}>
            <mesh>
              <torusGeometry args={[0.2, 0.06, 16, 32]} />
              <meshStandardMaterial
                color="#F4A7BB"
                roughness={0.8}
                transparent
                opacity={0.45}
              />
            </mesh>
          </Float>
          <Float position={[-2.5, -1.5, -1.5]} speed={2}>
            <mesh>
              <octahedronGeometry args={[0.15]} />
              <meshStandardMaterial
                color="#87CEEB"
                roughness={0.8}
                transparent
                opacity={0.35}
              />
            </mesh>
          </Float>
        </>
      )}
    </group>
  );
}
