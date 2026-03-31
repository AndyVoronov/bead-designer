"use client";

import { useRef, useEffect, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { VerletRope } from "@/lib/verlet/VerletRope";
import type { BeadState } from "@/types/bead";
import { BeadVisual } from "./BeadVisual";
import { ThreadLine } from "./ThreadLine";
import { PacifierClip } from "@/components/editor/PacifierClip";

// ── Constants ────────────────────────────────────────────────────────────────

const BEAD_SPACING = 0.8;
const ANCHOR_RADIUS = 0.12;
const DEFAULT_GRAVITY: [number, number, number] = [0, -30, 0];

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
 * Full bead chain: Verlet rope simulation → bead visuals → thread line.
 *
 * Architecture:
 * - Owns a VerletRope instance (particle[0] = anchor, particles[1..N] = beads)
 * - Syncs with the `beads` prop: adds/removes particles when the array changes
 * - Runs simulation in useFrame
 * - Exposes the rope via `ropeRef` for DragControls to pin/unpin particles
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

  // Use the external ref if provided, otherwise use internal
  const rope = ropeRef ?? ropeRefInternal;

  // Track previous bead IDs to detect additions/removals
  const prevBeadIdsRef = useRef<string[]>([]);

  // ── Initialize rope ──────────────────────────────────────────────────
  useEffect(() => {
    const r = new VerletRope({
      gravity: DEFAULT_GRAVITY,
      damping: 0.97,
      constraintIterations: 10,
    });

    // Add anchor (index 0, pinned)
    r.addParticle(
      new THREE.Vector3(ax, ay, az),
      ANCHOR_RADIUS,
      "__anchor__",
      true, // pinned
      false, // don't link to previous (first particle)
    );

    rope.current = r;

    return () => {
      r.dispose();
      if (rope.current === r) rope.current = null;
    };
    // Only re-create on anchor position change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ax, ay, az]);

  // ── Sync beads with rope particles ───────────────────────────────────
  useEffect(() => {
    const r = rope.current;
    if (!r) return;

    const prevIds = prevBeadIdsRef.current;
    const nextIds = beads.map((b) => b.id);

    // Determine what changed
    const removed = prevIds.filter((id) => !nextIds.includes(id));
    const added = nextIds.filter((id) => !prevIds.includes(id));

    // Remove particles (process in reverse to maintain indices)
    // Skip anchor removal
    for (const id of removed) {
      r.removeParticleByBeadId(id, BEAD_SPACING);
    }

    // Add new particles at the end
    for (const id of added) {
      const bead = beads.find((b) => b.id === id);
      if (!bead) continue;

      // Position below the last particle
      const lastPos =
        r.particles.length > 0
          ? r.particles[r.particles.length - 1].position
          : new THREE.Vector3(ax, ay, az);

      const newPos = new THREE.Vector3(
        lastPos.x,
        lastPos.y - BEAD_SPACING,
        lastPos.z,
      );

      r.addParticle(newPos, bead.radius, bead.id, false, true, BEAD_SPACING);
    }

    prevBeadIdsRef.current = nextIds;
  }, [beads, rope, ax, ay, az]);

  // ── Run simulation every frame ───────────────────────────────────────
  useFrame((_, delta) => {
    const r = rope.current;
    if (!r) return;
    r.update(delta);
  });

  // ── Expose a pin/unpin API via a callback ref pattern ────────────────
  // (Consumed by useBeadDrag hook, not via React ref)

  // ── Render ───────────────────────────────────────────────────────────
  const r = rope.current;

  return (
    <group>
      {/* Anchor visual (not a physics body anymore) */}
      <group position={anchorPosition}>
        <PacifierClip />
      </group>

      {/* Bead visuals — positioned by Verlet each frame */}
      {r &&
        r.particles.slice(1).map((particle, i) => {
          const bead = beads[i];
          if (!bead) return null;
          const isHighlighted = bead.id === selectedBeadId;
          return (
            <BeadVisual
              key={particle.beadId}
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

      {/* Thread line */}
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

// Need THREE available in this scope
import * as THREE from "three";
