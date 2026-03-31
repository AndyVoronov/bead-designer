/**
 * Verlet Rope Simulation for the bead chain.
 *
 * Each bead is a "particle" with position, previousPosition, and mass.
 * Particles are connected by distance constraints that mimic a rope/thread.
 *
 * Key properties:
 * - Adding/removing beads preserves all other particle positions
 * - Dragging = pinning a particle at a pointer position
 * - The thread curve uses the same particle positions as beads
 * - No external physics engine needed — runs in useFrame
 *
 * Constraints are solved iteratively each frame (Gauss-Seidel relaxation).
 * More iterations = stiffer rope, fewer = stretchier.
 */

import * as THREE from "three";

// ── Types ────────────────────────────────────────────────────────────────────

export interface Particle {
  /** Current position. */
  position: THREE.Vector3;
  /** Position in the previous frame (used by Verlet integration). */
  previousPosition: THREE.Vector3;
  /** Accumulated force this frame (gravity, external). */
  acceleration: THREE.Vector3;
  /** If true, the particle does not move (anchor / drag pin). */
  pinned: boolean;
  /** Mass of the particle (affects constraint solving). */
  mass: number;
  /** Visual radius for bead rendering. */
  radius: number;
  /** User-defined ID (bead.id from BeadState). */
  beadId: string;
}

export interface Constraint {
  /** Index of the first particle. */
  a: number;
  /** Index of the second particle. */
  b: number;
  /** Target distance between particles at rest. */
  restLength: number;
  /** How strictly the constraint is enforced (0–1). 1 = rigid. */
  stiffness: number;
}

export interface VerletRopeConfig {
  /** Gravity vector (default: [0, -30, 0]). */
  gravity?: [number, number, number];
  /** Global velocity damping per frame (0–1, default: 0.98). */
  damping?: number;
  /** Number of constraint solver iterations per frame (default: 8). */
  constraintIterations?: number;
  /** Default spacing between consecutive beads (default: 0.8). */
  beadSpacing?: number;
  /** Rope taut factor < 1.0 keeps thread slightly taut (default: 0.95). */
  tautFactor?: number;
}

// ── Reusable temp vectors (avoid GC) ─────────────────────────────────────────

const _delta = new THREE.Vector3();
const _diff = new THREE.Vector3();
const _correction = new THREE.Vector3();

// ── VerletRope ───────────────────────────────────────────────────────────────

export class VerletRope {
  particles: Particle[] = [];
  constraints: Constraint[] = [];
  gravity: THREE.Vector3;
  damping: number;
  constraintIterations: number;

  constructor(config: VerletRopeConfig = {}) {
    this.gravity = new THREE.Vector3(...(config.gravity ?? [0, -30, 0]));
    this.damping = config.damping ?? 0.98;
    this.constraintIterations = config.constraintIterations ?? 8;
  }

  // ── Particle management ───────────────────────────────────────────────

  /**
   * Add a new particle to the end of the rope.
   * Optionally link it to the previous particle with a constraint.
   */
  addParticle(
    position: THREE.Vector3,
    radius: number,
    beadId: string,
    pinned = false,
    linkToPrevious = true,
    spacing = 0.8,
    stiffness = 1.0,
  ): number {
    const index = this.particles.length;

    const particle: Particle = {
      position: position.clone(),
      previousPosition: position.clone(),
      acceleration: new THREE.Vector3(),
      pinned,
      mass: 1,
      radius,
      beadId,
    };

    this.particles.push(particle);

    // Create constraint to previous particle
    if (linkToPrevious && index > 0) {
      this.addConstraint(index - 1, index, spacing * (spacing > 0 ? 1 : 0.8), stiffness);
    }

    return index;
  }

  /**
   * Insert a particle at a specific index, shifting everything after it.
   * Rebuilds constraints from scratch to maintain consistency.
   */
  insertParticle(
    index: number,
    position: THREE.Vector3,
    radius: number,
    beadId: string,
    spacing: number,
  ): void {
    const particle: Particle = {
      position: position.clone(),
      previousPosition: position.clone(),
      acceleration: new THREE.Vector3(),
      pinned: false,
      mass: 1,
      radius,
      beadId,
    };

    this.particles.splice(index, 0, particle);
    this.rebuildConstraints(spacing);
  }

  /**
   * Remove a particle by index.
   * Constraints are rebuilt to maintain connectivity.
   * All other particle positions are preserved.
   */
  removeParticle(index: number, spacing: number): void {
    if (index < 0 || index >= this.particles.length) return;

    this.particles.splice(index, 1);

    // Don't let the anchor be removed
    if (this.particles.length > 0) {
      this.particles[0].pinned = true;
    }

    this.rebuildConstraints(spacing);
  }

  /**
   * Remove a particle by beadId.
   * Returns true if found and removed.
   */
  removeParticleByBeadId(beadId: string, spacing: number): boolean {
    const index = this.particles.findIndex((p) => p.beadId === beadId);
    if (index <= 0) return false; // Can't remove anchor or non-existent
    this.removeParticle(index, spacing);
    return true;
  }

  // ── Constraint management ─────────────────────────────────────────────

  addConstraint(
    a: number,
    b: number,
    restLength: number,
    stiffness = 1.0,
  ): void {
    this.constraints.push({ a, b, restLength, stiffness });
  }

  /**
   * Rebuild all constraints as a simple chain: 0→1→2→...→N.
   * Called after insert/remove to maintain connectivity.
   */
  rebuildConstraints(spacing: number): void {
    this.constraints = [];
    for (let i = 0; i < this.particles.length - 1; i++) {
      const a = this.particles[i];
      const b = this.particles[i + 1];
      // Use current distance as rest length so we don't teleport beads
      const dist = a.position.distanceTo(b.position);
      this.constraints.push({
        a: i,
        b: i + 1,
        restLength: Math.max(dist, spacing * 0.3), // Don't let rest length collapse
        stiffness: 1.0,
      });
    }
  }

  // ── Pin / Unpin (for drag) ────────────────────────────────────────────

  /**
   * Pin a particle at a specific position (used during drag).
   * While pinned, the particle's position is set to `pos` each frame.
   */
  pinParticle(index: number, pos: THREE.Vector3): void {
    if (index < 0 || index >= this.particles.length) return;
    const p = this.particles[index];
    p.pinned = true;
    p.position.copy(pos);
    p.previousPosition.copy(pos);
  }

  /**
   * Unpin a particle that was being dragged.
   * Optionally give it an initial velocity (from the drag motion).
   */
  unpinParticle(index: number, velocity?: THREE.Vector3): void {
    if (index < 0 || index >= this.particles.length) return;
    const p = this.particles[index];

    // Don't unpin the anchor (index 0)
    if (index === 0) return;

    p.pinned = false;

    // Apply throw velocity by offsetting previousPosition
    if (velocity && velocity.lengthSq() > 0) {
      // Verlet velocity is implicit: pos - prevPos
      // To set velocity v, we set prevPos = pos - v * dt
      const dt = 1 / 60; // Approximate frame time
      p.previousPosition.set(
        p.position.x - velocity.x * dt,
        p.position.y - velocity.y * dt,
        p.position.z - velocity.z * dt,
      );
    }
  }

  // ── Simulation step ───────────────────────────────────────────────────

  /**
   * Advance the simulation by one frame.
   * @param dt — Delta time in seconds (clamped to prevent explosion).
   */
  update(dt: number): void {
    // Clamp dt to prevent physics explosion on tab-switch / frame drops
    const safeDt = Math.min(dt, 1 / 30);

    // 1. Verlet integration: apply gravity and damping
    this._integrate(safeDt);

    // 2. Solve constraints iteratively
    this._solveConstraints();

    // 3. Apply bounds (prevent falling through floor, etc.)
    this._applyBounds();
  }

  private _integrate(dt: number): void {
    const dtSq = dt * dt;

    for (const p of this.particles) {
      if (p.pinned) continue;

      // Verlet integration:
      // newPos = pos + (pos - prevPos) * damping + acceleration * dt^2
      _delta
        .copy(p.position)
        .sub(p.previousPosition)
        .multiplyScalar(this.damping);

      p.previousPosition.copy(p.position);

      p.position.add(_delta);
      p.position.addScaledVector(this.gravity, dtSq);

      // Reset acceleration (it's re-applied each frame from gravity)
      p.acceleration.set(0, 0, 0);
    }
  }

  private _solveConstraints(): void {
    for (let iter = 0; iter < this.constraintIterations; iter++) {
      for (const c of this.constraints) {
        const pa = this.particles[c.a];
        const pb = this.particles[c.b];

        _diff.copy(pb.position).sub(pa.position);
        const dist = Math.max(_diff.length(), 0.0001);
        const error = (dist - c.restLength) / dist;

        _correction.copy(_diff).multiplyScalar(error * c.stiffness);

        // Distribute correction based on mass (inverse mass weighting)
        const totalMass = pa.mass + pb.mass;
        const ratioA = pa.pinned ? 0 : pb.pinned ? 1 : pb.mass / totalMass;
        const ratioB = pb.pinned ? 0 : pa.pinned ? 1 : pa.mass / totalMass;

        if (!pa.pinned) {
          pa.position.addScaledVector(_correction, ratioA);
        }
        if (!pb.pinned) {
          pb.position.addScaledVector(_correction, -ratioB);
        }
      }
    }
  }

  private _applyBounds(): void {
    // Floor at y = -5 to prevent beads falling forever
    for (const p of this.particles) {
      if (p.pinned) continue;
      if (p.position.y < -5) {
        p.position.y = -5;
        p.previousPosition.y = -5 + 0.1; // Kill vertical velocity
      }
    }
  }

  // ── Utilities ─────────────────────────────────────────────────────────

  /** Get all particle positions as an array of Vector3 (for ThreadLine). */
  getPositions(): THREE.Vector3[] {
    return this.particles.map((p) => p.position.clone());
  }

  /** Find particle index by beadId. Returns -1 if not found. */
  findParticleByBeadId(beadId: string): number {
    return this.particles.findIndex((p) => p.beadId === beadId);
  }

  /** Check if any particle is currently pinned (being dragged). */
  isAnyPinned(): boolean {
    return this.particles.some((p, i) => p.pinned && i > 0);
  }

  /** Get particle count (including anchor). */
  get particleCount(): number {
    return this.particles.length;
  }

  /** Clear all particles and constraints. */
  dispose(): void {
    this.particles = [];
    this.constraints = [];
  }
}
