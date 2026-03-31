"use client";

import * as THREE from "three";
import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { VerletRope } from "@/lib/verlet/VerletRope";
import type { BeadState } from "@/types/bead";
import { BeadVisual } from "./BeadVisual";
import { ThreadLine } from "./ThreadLine";
import { PacifierClip } from "@/components/editor/PacifierClip";
import { useDragStore } from "@/lib/dragStore";

// ── Constants ────────────────────────────────────────────────────────────────

const ANCHOR_RADIUS = 0.12;
const DEFAULT_GRAVITY: [number, number, number] = [0, -30, 0];

/** Stable key for bead visuals — particle index never changes during reorder. */
const particleIndexKey = (particleIndex: number) => `bead-p${particleIndex}`;

// ── Layout helper ────────────────────────────────────────────────────────────

/**
 * Compute ideal horizontal positions for [leftClip, bead0..beadN, rightClip]
 * centered around (cx, cy, cz). Beads touch (gap = sum of adjacent radii).
 */
function computeChainLayout(
  beads: BeadState[],
  cx: number,
  cy: number,
  cz: number,
) {
  const radii = beads.map((b) => b.radius);

  if (radii.length === 0) {
    const gap = ANCHOR_RADIUS * 2;
    return {
      leftPos: [cx - gap / 2, cy, cz] as [number, number, number],
      rightPos: [cx + gap / 2, cy, cz] as [number, number, number],
      beadPositions: [] as [number, number, number][],
    };
  }

  // Total width = 2*clipRadius + 2*sum(beadRadii)
  const totalWidth =
    2 * ANCHOR_RADIUS + 2 * radii.reduce((s, r) => s + r, 0);
  let x = cx - totalWidth / 2;

  // Left clip center
  const leftPos: [number, number, number] = [x, cy, cz];

  // Bead centers
  const beadPositions: [number, number, number][] = [];
  for (let i = 0; i < radii.length; i++) {
    x +=
      i === 0
        ? ANCHOR_RADIUS + radii[0]
        : radii[i - 1] + radii[i];
    beadPositions.push([x, cy, cz]);
  }

  // Right clip center
  x += radii[radii.length - 1] + ANCHOR_RADIUS;
  const rightPos: [number, number, number] = [x, cy, cz];

  return { leftPos, rightPos, beadPositions };
}

// ── BeadChain ────────────────────────────────────────────────────────────────

export interface BeadChainProps {
  beads: BeadState[];
  anchorPosition: [number, number, number];
  threadColor?: string;
  selectedBeadId?: string | null;
  /** Exposed for DragControls — allows pinning/unpinning particles. */
  ropeRef?: React.RefObject<VerletRope | null>;
}

/**
 * Horizontal bead chain: [LeftClip] ─ beads ─ [RightClip]
 *
 * Particle layout:
 *   [0] __anchor_left__   (pinned — left clip)
 *   [1] bead 0
 *   [2] bead 1
 *   ...
 *   [N] bead N-1
 *   [N+1] __anchor_right__ (pinned — right clip)
 *
 * Constraint rest lengths = sum of adjacent radii → beads touch.
 * Both clips are pinned; beads drape under gravity between them.
 */
export function BeadChain({
  beads,
  anchorPosition,
  threadColor = "#8B4513",
  selectedBeadId,
  ropeRef,
}: BeadChainProps) {
  const [ax, ay, az] = anchorPosition;

  // ── Stable VerletRope instance ────────────────────────────────────────
  const ropeRefInternal = useRef<VerletRope | null>(null);
  const rope = ropeRef ?? ropeRefInternal;
  const prevBeadIdsRef = useRef<string[]>([]);

  // ── Initialize rope with left anchor only ─────────────────────────────
  useEffect(() => {
    const r = new VerletRope({
      gravity: DEFAULT_GRAVITY,
      damping: 0.97,
      constraintIterations: 10,
    });

    // Left anchor at anchorPosition (will be repositioned on first sync)
    r.addParticle(
      new THREE.Vector3(ax, ay, az),
      ANCHOR_RADIUS,
      "__anchor_left__",
      true, // pinned
      false, // no link to previous (first particle)
    );

    rope.current = r;

    return () => {
      r.dispose();
      if (rope.current === r) rope.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ax, ay, az]);

  // ── Sync beads + right anchor ──────────────────────────────────────
  useEffect(() => {
    const r = rope.current;
    if (!r) return;

    const prevIds = prevBeadIdsRef.current;
    const nextIds = beads.map((b) => b.id);

    // Detect first sync (rope has only the left anchor)
    const isFirstSync = r.particles.length <= 1;

    if (isFirstSync) {
      // ── First sync: lay out everything at ideal positions ────────
      const layout = computeChainLayout(beads, ax, ay, az);

      // Reposition left anchor to ideal spot
      r.particles[0].position.set(...layout.leftPos);
      r.particles[0].previousPosition.set(...layout.leftPos);

      // Add all beads
      for (let i = 0; i < beads.length; i++) {
        r.addParticle(
          new THREE.Vector3(...layout.beadPositions[i]),
          beads[i].radius,
          beads[i].id,
          false,
          true,
        );
      }

      // Add right anchor
      r.addParticle(
        new THREE.Vector3(...layout.rightPos),
        ANCHOR_RADIUS,
        "__anchor_right__",
        true, // pinned
        true, // link to last bead
      );

      prevBeadIdsRef.current = nextIds;
      return;
    }

    // ── Subsequent syncs ───────────────────────────────────────────

    // 1. Remove right anchor — will re-add after bead sync
    const rightIdx = r.particles.findIndex(
      (p) => p.beadId === "__anchor_right__",
    );
    if (rightIdx >= 0) {
      r.particles.splice(rightIdx, 1);
    }

    // 2. Detect what changed
    const nextSet = new Set(nextIds);
    const sameSet =
      prevIds.length === nextIds.length &&
      prevIds.every((id) => nextSet.has(id));
    const reordered =
      sameSet && prevIds.some((id, i) => id !== nextIds[i]);
    const removed = prevIds.filter((id) => !nextIds.includes(id));
    const added = nextIds.filter((id) => !prevIds.includes(id));

    if (reordered) {
      // Swap bead data in-place (particles[1..N])
      for (let i = 1; i < r.particles.length && i - 1 < nextIds.length; i++) {
        r.particles[i].beadId = nextIds[i - 1];
        const bead = beads[i - 1];
        if (bead) {
          r.particles[i].radius = bead.radius;
        }
      }
      // Rebuild constraints with touching lengths after reorder
      // (radii changed between adjacent pairs)
      r.rebuildConstraints(true);
    } else {
      // Remove beads (removeParticleByBeadId rebuilds constraints with closeGaps)
      for (const id of removed) {
        r.removeParticleByBeadId(id);
      }

      // Add new beads before right anchor position
      for (const id of added) {
        const bead = beads.find((b) => b.id === id);
        if (!bead) continue;

        const lastParticle = r.particles[r.particles.length - 1];
        const prevRadius = lastParticle.radius;
        const newPos = new THREE.Vector3(
          lastParticle.position.x + prevRadius + bead.radius,
          lastParticle.position.y,
          lastParticle.position.z,
        );

        r.addParticle(newPos, bead.radius, bead.id, false, true);
      }

      // Rebuild constraints from radii.
      // closeGaps=true when beads were removed → solver pulls neighbors together.
      // closeGaps=false otherwise → uses current distances to avoid teleporting.
      r.rebuildConstraints(removed.length > 0);
    }

    // 4. Recompute ideal right anchor position and add it
    const totalBeadWidth = beads.reduce((s, b) => s + 2 * b.radius, 0);
    const totalWidth = 2 * ANCHOR_RADIUS + totalBeadWidth;
    const idealRightX = ax + totalWidth / 2;

    r.particles.push({
      position: new THREE.Vector3(idealRightX, ay, az),
      previousPosition: new THREE.Vector3(idealRightX, ay, az),
      acceleration: new THREE.Vector3(),
      pinned: true,
      mass: 1,
      radius: ANCHOR_RADIUS,
      beadId: "__anchor_right__",
    });

    // Constraint: last bead → right anchor
    const lastBead = r.particles[r.particles.length - 2];
    r.addConstraint(
      r.particles.length - 2,
      r.particles.length - 1,
      lastBead.radius + ANCHOR_RADIUS,
      1.0,
    );

    prevBeadIdsRef.current = nextIds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beads, rope, ax, ay, az]);

  // ── Run simulation every frame ───────────────────────────────────────
  useFrame((_, delta) => {
    const r = rope.current;
    if (!r) return;
    r.update(delta);
  });

  // ── Render ───────────────────────────────────────────────────────────
  const r = rope.current;

  // Drop indicator position (ref updated each frame for smooth tracking)
  const dropIndicatorRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const mesh = dropIndicatorRef.current;
    if (!mesh || !r) return;

    const { dropTargetIndex, draggedBeadId } = useDragStore.getState();
    if (draggedBeadId == null || dropTargetIndex < 0 || beads.length === 0) {
      mesh.visible = false;
      return;
    }

    // Compute X position of the insertion gap.
    // Bead particles are [1..N], anchors at [0] and [N+1].
    // dropTargetIndex i means: insert before beads[i].
    if (dropTargetIndex === 0) {
      // Before first bead — after left anchor
      const leftAnchor = r.particles[0];
      const firstBead = r.particles[1];
      const x = (leftAnchor.position.x + firstBead.position.x) / 2;
      const y = (leftAnchor.position.y + firstBead.position.y) / 2;
      mesh.position.set(x, y, leftAnchor.position.z);
    } else if (dropTargetIndex >= beads.length) {
      // After last bead — before right anchor
      const lastBead = r.particles[r.particles.length - 2];
      const rightAnchor = r.particles[r.particles.length - 1];
      const x = (lastBead.position.x + rightAnchor.position.x) / 2;
      const y = (lastBead.position.y + rightAnchor.position.y) / 2;
      mesh.position.set(x, y, lastBead.position.z);
    } else {
      // Between beads[dropTargetIndex-1] and beads[dropTargetIndex]
      const a = r.particles[dropTargetIndex]; // particle index = store index + 1
      const b = r.particles[dropTargetIndex + 1];
      const x = (a.position.x + b.position.x) / 2;
      const y = (a.position.y + b.position.y) / 2;
      mesh.position.set(x, y, a.position.z);
    }

    mesh.visible = true;
  });

  return (
    <group>
      {/* Left clip — pinned particle[0] */}
      {r && (() => {
        const lp = r.particles[0];
        return (
          <group position={[lp.position.x, lp.position.y, lp.position.z]}>
            <PacifierClip />
          </group>
        );
      })()}

      {/* Bead visuals — particles[1..N-1] (skip left & right anchor) */}
      {r &&
        r.particles.slice(1, -1).map((particle, i) => {
          const bead = beads[i];
          if (!bead) return null;
          const isHighlighted = bead.id === selectedBeadId;
          return (
            <BeadVisual
              key={particleIndexKey(i + 1)}
              beadId={bead.id}
              beadType={bead.type}
              radius={bead.radius}
              color={bead.color}
              highlighted={isHighlighted}
              particleIndex={i + 1}
              rope={r}
            />
          );
        })}

      {/* Right clip — pinned last particle */}
      {r &&
        r.particles.length > 1 &&
        (() => {
          const rp = r.particles[r.particles.length - 1];
          return (
            <group position={[rp.position.x, rp.position.y, rp.position.z]}>
              <PacifierClip />
            </group>
          );
        })()}

      {/* Drop indicator — vertical line at insertion point */}
      <mesh ref={dropIndicatorRef} visible={false}>
        <cylinderGeometry args={[0.015, 0.015, 0.8, 8]} />
        <meshStandardMaterial
          color="#4FC3F7"
          emissive="#4FC3F7"
          emissiveIntensity={0.6}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Thread line through both clips and all beads */}
      {r && (
        <ThreadLine
          rope={r}
          color={threadColor}
          beadCount={beads.length}
        />
      )}
    </group>
  );
}
