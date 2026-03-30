"use client";

import { useMemo } from "react";
import { RigidBody, BallCollider, useRopeJoint } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import type { BeadState } from "@/types/bead";
import { BeadRigidBody } from "./BeadRigidBody";
import { ThreadLine } from "./ThreadLine";
import { PacifierClip } from "@/components/editor/PacifierClip";

// ── Constants ────────────────────────────────────────────────────────────────

/** Vertical distance between consecutive bead centres (world units). */
const BEAD_SPACING = 0.8;

/**
 * Rope max-length factor relative to BEAD_SPACING.
 * < 1.0 keeps the rope slightly taut (tension).
 */
const ROPE_TAUT_FACTOR = 0.92;

/** Radius of the fixed anchor ball. */
const ANCHOR_RADIUS = 0.12;

// ── JointLink ────────────────────────────────────────────────────────────────

/**
 * Thin wrapper that calls `useRopeJoint` for a single pair of bodies.
 * MUST be a separate component because React hooks cannot be called in loops.
 */
function JointLink({
  bodyA,
  bodyB,
  length,
}: {
  bodyA: React.RefObject<RapierRigidBody | null>;
  bodyB: React.RefObject<RapierRigidBody | null>;
  length: number;
}) {
  useRopeJoint(
    bodyA as React.RefObject<RapierRigidBody>,
    bodyB as React.RefObject<RapierRigidBody>,
    [[0, 0, 0], [0, 0, 0], length],
  );
  return null;
}

// ── BeadChain ────────────────────────────────────────────────────────────────

export interface BeadChainProps {
  /** Array of bead descriptors (position is computed from index). */
  beads: BeadState[];
  /** World-space position of the fixed anchor point. */
  anchorPosition: [number, number, number];
  /** Thread colour (default: "#8B4513" — saddle brown). */
  threadColor?: string;
  /** Currently selected bead ID for highlight rendering. */
  selectedBeadId?: string | null;
}

/**
 * Full physics bead chain: fixed anchor → N dynamic beads connected by rope
 * joints → MeshLine thread that follows bead positions every frame.
 */
export function BeadChain({
  beads,
  anchorPosition,
  threadColor = "#8B4513",
  selectedBeadId,
}: BeadChainProps) {
  const [ax, ay, az] = anchorPosition;

  // ── Stable ref for the fixed anchor ───────────────────────────────────
  const anchorRef = useMemo(
    () => ({ current: null as RapierRigidBody | null }),
    [],
  );

  // ── Pre-create a stable ref object for every bead ─────────────────────
  // useMemo keyed on array length: new refs only when count changes.
  const beadRefs = useMemo(
    () =>
      beads.map(
        () => ({ current: null as RapierRigidBody | null }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [beads.length],
  );

  // ── Compute initial bead positions (vertical column) ──────────────────
  const beadPositions = useMemo(
    () =>
      beads.map(
        (_, i) =>
          [ax, ay - (i + 1) * BEAD_SPACING, az] as [number, number, number],
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [beads.length, ax, ay, az],
  );

  const ropeLength = BEAD_SPACING * ROPE_TAUT_FACTOR;

  return (
    <group>
      {/* ── Fixed anchor with pacifier clip ────────────────────────── */}
      <RigidBody ref={anchorRef} type="fixed" position={anchorPosition}>
        <BallCollider args={[ANCHOR_RADIUS]} />
        <PacifierClip />
      </RigidBody>

      {/* ── Dynamic beads ───────────────────────────────────────────── */}
      {beads.map((bead, i) => (
        <BeadRigidBody
          key={bead.id}
          ref={beadRefs[i]}
          radius={bead.radius}
          color={bead.color}
          type={bead.type}
          damping={2}
          position={beadPositions[i]}
          beadId={bead.id}
          highlighted={bead.id === selectedBeadId}
        />
      ))}

      {/* ── Rope joints ─────────────────────────────────────────────── */}
      {/* anchor → bead[0] */}
      {beads.length > 0 && (
        <JointLink
          bodyA={anchorRef}
          bodyB={beadRefs[0]}
          length={ropeLength}
        />
      )}
      {/* bead[i] → bead[i+1] */}
      {beads.slice(1).map((bead, i) => (
        <JointLink
          key={`joint-${bead.id}`}
          bodyA={beadRefs[i]}
          bodyB={beadRefs[i + 1]}
          length={ropeLength}
        />
      ))}

      {/* ── Thread line visualisation ───────────────────────────────── */}
      <ThreadLine
        anchorPosition={anchorPosition}
        anchorRef={anchorRef}
        beadRefs={beadRefs}
        beadCount={beads.length}
        color={threadColor}
      />
    </group>
  );
}
