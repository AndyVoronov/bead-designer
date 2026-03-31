"use client";

import { useRef, useCallback, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { VerletRope } from "@/lib/verlet/VerletRope";
import type { BeadType } from "@/types/bead";
import { BeadMaterial } from "./BeadMaterial";
import { useDragStore } from "@/lib/dragStore";
import { useDesignStore } from "@/stores/useDesignStore";

// ── Constants ────────────────────────────────────────────────────────────────

const TAP_MAX_DURATION = 200;
const TAP_MAX_DISTANCE = 0.05;
const HISTORY_SIZE = 3;

// ── Reusable objects ─────────────────────────────────────────────────────────

const _raycaster = new THREE.Raycaster();
const _plane = new THREE.Plane();
const _intersection = new THREE.Vector3();
const _pointerVec = new THREE.Vector2();
const _velocity = new THREE.Vector3();

// ── BeadVisual ───────────────────────────────────────────────────────────────

export interface BeadVisualProps {
  beadId: string;
  beadType: BeadType;
  radius: number;
  color: string;
  highlighted: boolean;
  /** Index in the VerletRope particles array. */
  particleIndex: number;
  /** The rope simulation instance. */
  rope: VerletRope;
  /** Geometry segment count (default: 24). */
  segments?: number;
}

/**
 * Visual bead mesh positioned by the Verlet simulation each frame.
 * Handles pointer drag via kinematic pin pattern.
 *
 * No RigidBody, no BallCollider — pure Three.js mesh.
 * Drag works by pinning the Verlet particle at the pointer-projected position.
 */
export function BeadVisual({
  beadId,
  beadType,
  radius,
  color,
  highlighted,
  particleIndex,
  rope,
  segments = 24,
}: BeadVisualProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera, pointer, gl } = useThree();

  // Drag state (mutable, survives across frames)
  const dragRef = useRef<{
    startTime: number;
    startPointer: { x: number; y: number };
    history: { pos: THREE.Vector3; time: number }[];
  } | null>(null);

  // ── Pointer Down: start dragging (pin particle) ─────────────────────
  const onPointerDown = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      const particle = rope.particles[particleIndex];
      if (!particle) return;

      // Pin the particle at its current position
      rope.pinParticle(particleIndex, particle.position.clone());

      // Disable orbit controls while dragging
      useDragStore.getState().setDragging(true);

      dragRef.current = {
        startTime: performance.now(),
        startPointer: { x: pointer.x, y: pointer.y },
        history: [],
      };

      gl.domElement.style.cursor = "grabbing";
    },
    [rope, particleIndex, pointer, gl],
  );

  // ── Pointer Up: stop dragging (unpin particle) ──────────────────────
  const onPointerUp = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;

    const particle = rope.particles[particleIndex];
    if (!particle) return;

    const elapsed = performance.now() - drag.startTime;
    const dx = pointer.x - drag.startPointer.x;
    const dy = pointer.y - drag.startPointer.y;
    const ndcDistance = Math.sqrt(dx * dx + dy * dy);
    const isTap = elapsed < TAP_MAX_DURATION && ndcDistance < TAP_MAX_DISTANCE;

    if (isTap) {
      // Tap → select bead
      const { selectedBeadId } = useDesignStore.getState();
      useDesignStore.getState().selectBead(
        selectedBeadId === beadId ? null : beadId,
      );
      // Unpin without velocity
      rope.unpinParticle(particleIndex);
    } else {
      // Drag → compute throw velocity and unpin
      const history = drag.history;
      if (history.length >= 2) {
        const recent = history.slice(-HISTORY_SIZE);
        const first = recent[0];
        const last = recent[recent.length - 1];
        const dt = (last.time - first.time) / 1000;
        if (dt > 0.001) {
          _velocity.set(
            (last.pos.x - first.pos.x) / dt,
            (last.pos.y - first.pos.y) / dt,
            (last.pos.z - first.pos.z) / dt,
          );
          // Clamp velocity
          const maxVel = 25;
          _velocity.clampLength(0, maxVel);
          rope.unpinParticle(particleIndex, _velocity);
        } else {
          rope.unpinParticle(particleIndex);
        }
      } else {
        rope.unpinParticle(particleIndex);
      }

      // Deselect after drag
      useDesignStore.getState().selectBead(null);
    }

    dragRef.current = null;
    useDragStore.getState().setDragging(false);
    gl.domElement.style.cursor = "auto";
  }, [rope, particleIndex, pointer, gl, beadId]);

  // ── Cursor feedback ─────────────────────────────────────────────────
  const onPointerOver = useCallback(() => {
    if (!dragRef.current) gl.domElement.style.cursor = "grab";
  }, [gl]);

  const onPointerOut = useCallback(() => {
    if (!dragRef.current) gl.domElement.style.cursor = "auto";
  }, [gl]);

  // ── Per-frame: move mesh to Verlet position, handle drag ───────────
  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const particle = rope.particles[particleIndex];
    if (!particle) return;

    // If dragging, project pointer onto plane and pin
    if (dragRef.current && particle.pinned) {
      _plane.setFromNormalAndCoplanarPoint(
        camera.getWorldDirection(new THREE.Vector3()).negate(),
        particle.position,
      );

      _pointerVec.set(pointer.x, pointer.y);
      _raycaster.setFromCamera(_pointerVec, camera);

      if (_raycaster.ray.intersectPlane(_plane, _intersection)) {
        rope.pinParticle(particleIndex, _intersection);

        // Record history for velocity
        const now = performance.now();
        dragRef.current.history.push({
          pos: _intersection.clone(),
          time: now,
        });
        if (dragRef.current.history.length > HISTORY_SIZE + 1) {
          dragRef.current.history.shift();
        }
      }
    }

    // Position group at particle location
    group.position.copy(particle.position);
  });

  // ── Render ──────────────────────────────────────────────────────────
  const highlightScale = useMemo(
    () => [1.15, 1.15, 1.15] as [number, number, number],
    [],
  );

  return (
    <group ref={groupRef}>
      <mesh
        castShadow
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <sphereGeometry args={[radius, segments, segments]} />
        <BeadMaterial type={beadType} color={color} />
      </mesh>

      {highlighted && (
        <mesh scale={highlightScale}>
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
    </group>
  );
}
