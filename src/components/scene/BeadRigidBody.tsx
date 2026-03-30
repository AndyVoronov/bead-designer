"use client";

import { forwardRef } from "react";
import { RigidBody, BallCollider } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";

export interface BeadRigidBodyProps {
  radius: number;
  color: string;
  /** Linear and angular damping (default: 2 — stabilizes chain swing). */
  damping?: number;
  position: [number, number, number];
}

/**
 * A single physics-driven bead: RigidBody + BallCollider + visual sphere.
 * Uses forwardRef so the parent can collect the RapierRigidBody ref for joints.
 */
export const BeadRigidBody = forwardRef<RapierRigidBody, BeadRigidBodyProps>(
  ({ radius, color, damping = 2, position }, ref) => {
    return (
      <RigidBody
        ref={ref}
        colliders={false}
        angularDamping={damping}
        linearDamping={damping}
        position={position}
        ccd={false}
      >
        <BallCollider args={[radius]} />
        <mesh castShadow>
          <sphereGeometry args={[radius, 32, 32]} />
          <meshStandardMaterial
            color={color}
            roughness={0.3}
            metalness={0.1}
          />
        </mesh>
      </RigidBody>
    );
  }
);

BeadRigidBody.displayName = "BeadRigidBody";
