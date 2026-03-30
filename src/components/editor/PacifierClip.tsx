"use client";

/**
 * 3D pacifier clip holder rendered from Three.js primitives.
 * A torus ring as the main clip loop and a cylinder arm as the attachment.
 * Metallic silver appearance (roughness 0.3, metalness 0.8).
 */
export function PacifierClip() {
  return (
    <group position={[0, -0.1, 0]}>
      {/* Main clip ring (torus) */}
      <mesh>
        <torusGeometry args={[0.15, 0.03, 16, 32]} />
        <meshStandardMaterial
          color="#C0C0C0"
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>

      {/* Clip arm (cylinder at an angle) */}
      <mesh position={[0.12, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
        <cylinderGeometry args={[0.025, 0.025, 0.2, 16]} />
        <meshStandardMaterial
          color="#C0C0C0"
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>
    </group>
  );
}
