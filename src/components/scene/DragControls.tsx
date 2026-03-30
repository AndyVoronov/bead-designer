"use client";

import { useRef, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";

// ── Types ────────────────────────────────────────────────────────────────────

interface DragState {
  /** The Rapier rigid body currently being dragged. */
  body: RapierRigidBody;
  /** World-space position of the body at the start of drag. */
  startPos: { x: number; y: number; z: number };
  /** World-space position of the body in the previous frame (for velocity). */
  prevPos: { x: number; y: number; z: number };
  /** Timestamp of the previous frame (ms, for velocity calc). */
  prevTime: number;
  /** Mouse position (NDC) at pointer-down — used as reference offset. */
  pointerStart: { x: number; y: number };
}

// ── Constants ────────────────────────────────────────────────────────────────

/** Maximum number of position history entries kept for velocity smoothing. */
const HISTORY_SIZE = 3;

// ── Reusable objects (avoid GC in useFrame) ──────────────────────────────────

const _raycaster = new THREE.Raycaster();
const _plane = new THREE.Plane();
const _intersection = new THREE.Vector3();

/**
 * Hook that provides drag event handlers for a Rapier RigidBody.
 *
 * **Pattern (Vercel badge):**
 * 1. `onPointerDown` → switch body to `kinematicPosition`, start tracking
 * 2. `useFrame` → raycast from camera through pointer onto plane at body depth,
 *    call `setNextKinematicTranslation`
 * 3. `onPointerUp` → compute velocity from recent deltas, apply `setLinvel`,
 *    switch back to `dynamic`
 *
 * @param bodyRef — React ref holding the RapierRigidBody (typically from
 *                  `useForwardedRef` or `useRef`)
 * @returns Object with `onPointerDown`, `onPointerUp`, `onPointerOver`,
 *          `onPointerOut` handlers to spread onto a `<mesh>`
 */
export function useDrag(bodyRef: React.RefObject<RapierRigidBody | null>) {
  const { camera, pointer, gl } = useThree();

  // Mutable state that survives across frames without triggering re-renders
  const dragRef = useRef<DragState | null>(null);

  // Position history ring buffer for velocity smoothing
  const historyRef = useRef<
    { pos: THREE.Vector3; time: number }[]
  >([]);
  const historyIndexRef = useRef(0);

  // ── Pointer Down: start dragging ──────────────────────────────────────
  const onPointerDown = useCallback(
    (e: { stopPropagation: () => void }) => {
      const body = bodyRef.current;
      if (!body) return;

      e.stopPropagation();

      // Switch to kinematic — physics engine won't apply forces to this body
      body.setBodyType({ type: "kinematicPosition" } as never, true);
      body.wakeUp();

      const pos = body.translation();
      const now = performance.now();

      dragRef.current = {
        body,
        startPos: { x: pos.x, y: pos.y, z: pos.z },
        prevPos: { x: pos.x, y: pos.y, z: pos.z },
        prevTime: now,
        pointerStart: { x: pointer.x, y: pointer.y },
      };

      // Reset history
      historyRef.current = [];
      historyIndexRef.current = 0;

      // Change cursor
      gl.domElement.style.cursor = "grabbing";
    },
    [bodyRef, pointer, gl],
  );

  // ── Pointer Up: stop dragging, apply velocity ─────────────────────────
  const onPointerUp = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;

    const body = drag.body;
    const history = historyRef.current;

    // Compute average velocity from the last few frames
    if (history.length >= 2) {
      const recent = history.slice(-HISTORY_SIZE);
      const first = recent[0];
      const last = recent[recent.length - 1];
      const dt = (last.time - first.time) / 1000; // seconds

      if (dt > 0.001) {
        const vx = (last.pos.x - first.pos.x) / dt;
        const vy = (last.pos.y - first.pos.y) / dt;
        const vz = (last.pos.z - first.pos.z) / dt;

        // Clamp velocity to prevent crazy throws
        const maxVel = 30;
        const clamp = (v: number) => Math.max(-maxVel, Math.min(maxVel, v));

        body.setLinvel({ x: clamp(vx), y: clamp(vy), z: clamp(vz) }, true);
      }
    }

    // Give a small angular velocity for natural spin feel
    body.setAngvel({ x: 0.5, y: 0, z: 0.2 }, true);

    // Switch back to dynamic
    body.setBodyType({ type: "dynamic" } as never, true);
    body.wakeUp();

    dragRef.current = null;
    historyRef.current = [];
    historyIndexRef.current = 0;

    gl.domElement.style.cursor = "auto";
  }, [gl]);

  // ── Cursor handlers ───────────────────────────────────────────────────
  const onPointerOver = useCallback(() => {
    if (!dragRef.current) {
      gl.domElement.style.cursor = "grab";
    }
  }, [gl]);

  const onPointerOut = useCallback(() => {
    if (!dragRef.current) {
      gl.domElement.style.cursor = "auto";
    }
  }, [gl]);

  // ── Per-frame: move kinematic body to follow pointer ──────────────────
  useFrame(() => {
    const drag = dragRef.current;
    if (!drag || !bodyRef.current) return;

    // Construct a plane at the body's current depth, facing the camera
    const bodyPos = drag.body.translation();
    _plane.setFromNormalAndCoplanarPoint(
      camera.getWorldDirection(new THREE.Vector3()).negate(),
      new THREE.Vector3(bodyPos.x, bodyPos.y, bodyPos.z),
    );

    // Raycast from camera through NDC pointer position
    _raycaster.setFromCamera(new THREE.Vector2(pointer.x, pointer.y), camera);

    if (_raycaster.ray.intersectPlane(_plane, _intersection)) {
      const x = _intersection.x;
      const y = _intersection.y;
      const z = _intersection.z;

      drag.body.setNextKinematicTranslation({ x, y, z });

      // Record position for velocity computation
      const now = performance.now();
      const history = historyRef.current;
      history.push({
        pos: new THREE.Vector3(x, y, z),
        time: now,
      });

      // Keep only recent history to bound memory
      if (history.length > HISTORY_SIZE + 1) {
        history.shift();
      }
    }
  });

  return {
    onPointerDown,
    onPointerUp,
    onPointerOver,
    onPointerOut,
    isDragging: dragRef,
  };
}
