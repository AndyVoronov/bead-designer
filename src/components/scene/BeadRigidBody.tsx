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
  position: [number, number, number];
}

/**
 * A single physics-driven bead: RigidBody + BallCollider + visual sphere.
 * Uses forwardRef so the parent can collect the RapierRigidBody ref for joints.
 * Supports pointer-drag via the useDrag hook (kinematic position pattern).
 */
export const BeadRigidBody = forwardRef<RapierRigidBody, BeadRigidBodyProps>(
  ({ radius, color, type, damping = 2, position }, fwdRef) => {
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
      useDrag(bodyRef);

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
        <mesh
          castShadow
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
        >
          <sphereGeometry args={[radius, 32, 32]} />
          <BeadMaterial type={type} color={color} />
        </mesh>
      </RigidBody>
    );
  }
);

BeadRigidBody.displayName = "BeadRigidBody";
