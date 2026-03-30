"use client";

import { forwardRef, useRef, useCallback } from "react";
import { RigidBody, BallCollider } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import type { BeadType } from "@/types/bead";
import { useDrag } from "./DragControls";
import { BeadMaterial } from "./BeadMaterial";

export interface BeadRigidBodyProps {
  radius: number;
  color: string;
  type: BeadType;
  /** Linear and angular damping (default: 2 — stabilizes chain swing). */
  damping?: number;
  /** Sphere geometry segment count (default: 24). Lower = fewer vertices, better perf. */
  segments?: number;
  position: [number, number, number];
  /** Unique bead identifier — forwarded to useDrag for tap-to-select. */
  beadId?: string;
  /** Whether this bead is currently selected — renders golden wireframe glow. */
  highlighted?: boolean;
}

/**
 * A single physics-driven bead: RigidBody + BallCollider + visual sphere.
 * Uses forwardRef so the parent can collect the RapierRigidBody ref for joints.
 * Supports pointer-drag via the useDrag hook (kinematic position pattern).
 */
export const BeadRigidBody = forwardRef<RapierRigidBody, BeadRigidBodyProps>(
  (
    {
      radius,
      color,
      type,
      damping = 2,
      segments = 24,
      position,
      beadId,
      highlighted = false,
    },
    fwdRef,
  ) => {
    // Stable local ref for useDrag (reads .current in useFrame — needs RefObject,
    // not the polymorphic ForwardedRef which can be a callback).
    const bodyRef = useRef<RapierRigidBody>(null);

    // Merge: assign to local ref AND forwarded ref (object or callback).
    const setRefs = useCallback(
      (node: RapierRigidBody | null) => {
        bodyRef.current = node;
        if (typeof fwdRef === "function") fwdRef(node);
        else if (fwdRef) fwdRef.current = node;
      },
      [fwdRef],
    );

    const { onPointerDown, onPointerUp, onPointerOver, onPointerOut } =
      useDrag(bodyRef, beadId);

    return (
      <RigidBody
        ref={setRefs}
        colliders={false}
        angularDamping={damping}
        linearDamping={damping}
        position={position}
        ccd={false}
      >
        <BallCollider args={[radius]} />

        {/* Main bead mesh */}
        <mesh
          castShadow
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
        >
          <sphereGeometry args={[radius, segments, segments]} />
          <BeadMaterial type={type} color={color} />
        </mesh>

        {/* Selection highlight — golden wireframe glow */}
        {highlighted && (
          <mesh scale={[1.15, 1.15, 1.15]}>
            <sphereGeometry args={[radius, segments, segments]} />
            <meshStandardMaterial
              color="#FFD700"
              emissive="#FFD700"
              emissiveIntensity={0.8}
              wireframe
              transparent
              opacity={0.7}
            />
          </mesh>
        )}
      </RigidBody>
    );
  }
);

BeadRigidBody.displayName = "BeadRigidBody";
