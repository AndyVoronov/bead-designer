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

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Find which gap the dragged bead should be inserted into.
 *
 * For a rope with particles [anchor_left, bead0, bead1, ..., beadN, anchor_right],
 * bead indices are [1 .. N]. We compute midpoints between consecutive beads
 * and find which midpoint the drag position is closest to.
 *
 * Returns a store-index (0-based) indicating the new position in the beads array,
 * or -1 if the bead hasn't moved far enough to warrant a reorder.
 */
function computeDropTargetIndex(
  dragPos: THREE.Vector3,
  dragBeadId: string,
  rope: VerletRope,
  dragStartX: number,
): number {
  // Collect bead particles (skip anchors)
  const beadEntries: { index: number; x: number }[] = [];
  for (let i = 1; i < rope.particles.length; i++) {
    const p = rope.particles[i];
    if (p.beadId === "__anchor_left__" || p.beadId === "__anchor_right__") continue;
    beadEntries.push({ index: i, x: p.position.x });
  }

  if (beadEntries.length <= 1) return -1;

  // Find the current index of the dragged bead
  const dragStoreIdx = beadEntries.findIndex(
    (e) => rope.particles[e.index].beadId === dragBeadId,
  );
  if (dragStoreIdx < 0) return -1;

  // Not enough horizontal movement to reorder
  const dx = Math.abs(dragPos.x - dragStartX);
  if (dx < 0.15) return -1;

  // Find which gap the dragged bead's X is closest to.
  // Gap i is between beadEntries[i] and beadEntries[i+1].
  // If dragX < gap0, target = 0 (before first).
  // If dragX > lastGap, target = count (after last).
  const gaps: { storeIndex: number; midX: number }[] = [];

  // Gap before first bead
  gaps.push({ storeIndex: 0, midX: beadEntries[0].x - rope.particles[beadEntries[0].index].radius });

  // Gaps between consecutive beads
  for (let i = 0; i < beadEntries.length - 1; i++) {
    const a = beadEntries[i];
    const b = beadEntries[i + 1];
    const midX = (a.x + b.x) / 2;
    gaps.push({ storeIndex: i + 1, midX });
  }

  // Gap after last bead
  const last = beadEntries[beadEntries.length - 1];
  gaps.push({
    storeIndex: beadEntries.length,
    midX: last.x + rope.particles[last.index].radius,
  });

  // Find closest gap
  let bestGap = -1;
  let bestDist = Infinity;
  for (const gap of gaps) {
    const dist = Math.abs(dragPos.x - gap.midX);
    if (dist < bestDist) {
      bestDist = dist;
      bestGap = gap.storeIndex;
    }
  }

  // No meaningful change
  if (bestGap === dragStoreIdx) return -1;

  return bestGap;
}

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
  /** Shape of the bead (default: "sphere"). */
  shape?: string;
}

/**
 * Visual bead mesh positioned by the Verlet simulation each frame.
 * Handles pointer drag → pin → reorder.
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
  shape = "sphere",
}: BeadVisualProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera, pointer, gl } = useThree();

  const dragRef = useRef<{
    startTime: number;
    startPointer: { x: number; y: number };
    startX: number; // X position of the bead at drag start
    history: { pos: THREE.Vector3; time: number }[];
  } | null>(null);

  // ── Pointer Down: start dragging ─────────────────────────────────────
  const onPointerDown = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      const particle = rope.particles[particleIndex];
      if (!particle) return;

      rope.pinParticle(particleIndex, particle.position.clone());
      useDragStore.getState().setDragging(true);
      useDragStore.getState().setDraggedBeadId(beadId);
      useDragStore.getState().setDropTargetIndex(-1);

      dragRef.current = {
        startTime: performance.now(),
        startPointer: { x: pointer.x, y: pointer.y },
        startX: particle.position.x,
        history: [],
      };

      gl.domElement.style.cursor = "grabbing";
    },
    [rope, particleIndex, pointer, gl, beadId],
  );

  // ── Pointer Up: drop bead ────────────────────────────────────────────
  const onPointerUp = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      const drag = dragRef.current;
      if (!drag) return;

      const particle = rope.particles[particleIndex];
      if (!particle) return;

      const elapsed = performance.now() - drag.startTime;
      const dx = pointer.x - drag.startPointer.x;
      const dy = pointer.y - drag.startPointer.y;
      const ndcDistance = Math.sqrt(dx * dx + dy * dy);
      const isTap = elapsed < TAP_MAX_DURATION && ndcDistance < TAP_MAX_DISTANCE;

      const store = useDragStore.getState();
      const design = useDesignStore.getState();

      if (isTap) {
        // Tap → select bead
        design.selectBead(
          design.selectedBeadId === beadId ? null : beadId,
        );
        rope.unpinParticle(particleIndex);
      } else {
        const targetIdx = store.dropTargetIndex;
        if (targetIdx >= 0) {
          // Move bead to target position
          design.moveBead(beadId, targetIdx);
          rope.unpinParticle(particleIndex);
        } else {
          // Just release — no reorder happened
          rope.unpinParticle(particleIndex);
        }
        design.selectBead(null);
      }

      dragRef.current = null;
      useDragStore.getState().setDragging(false);
      useDragStore.getState().setDraggedBeadId(null);
      useDragStore.getState().setDropTargetIndex(-1);
      gl.domElement.style.cursor = "auto";
    },
    [rope, particleIndex, pointer, gl, beadId],
  );

  // ── Cursor feedback ─────────────────────────────────────────────────
  const onPointerOver = useCallback(() => {
    if (!dragRef.current) gl.domElement.style.cursor = "grab";
  }, [gl]);

  const onPointerOut = useCallback(() => {
    if (!dragRef.current) gl.domElement.style.cursor = "auto";
  }, [gl]);

  // ── Per-frame: drag tracking + drop target computation ──────────────
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

        // Compute drop target index
        const targetIdx = computeDropTargetIndex(
          _intersection,
          beadId,
          rope,
          dragRef.current.startX,
        );
        useDragStore.getState().setDropTargetIndex(targetIdx);

        // Record history for velocity (in case of cancel/no reorder)
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

  const isOblate = shape === "oblate";
  const isBuckyball = shape === "buckyball";

  return (
    <group ref={groupRef}>
      <mesh
        castShadow
        scale={isOblate ? [1, 0.6, 1] : undefined}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        {isBuckyball ? (
          <dodecahedronGeometry args={[radius, 0]} />
        ) : (
          <sphereGeometry args={[radius, segments, segments]} />
        )}
        <BeadMaterial
          type={beadType}
          color={color}
          roughness={isBuckyball ? 0.15 : undefined}
          metalness={isBuckyball ? 0.35 : undefined}
        />
      </mesh>

      {highlighted && (
        <mesh
          scale={isOblate ? [1.15, 1.15 * 0.6, 1.15] : highlightScale}
        >
          {isBuckyball ? (
            <dodecahedronGeometry args={[radius, 0]} />
          ) : (
            <sphereGeometry args={[radius, segments, segments]} />
          )}
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
