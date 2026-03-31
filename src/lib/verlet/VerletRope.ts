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
 * Constraints use adjacent particle radii for rest lengths,
 * so beads naturally touch when the solver converges.
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
  /** Target distance between particles at rest (= sum of radii for touching). */
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
   * Constraint rest length is the sum of adjacent radii (beads touch).
   */
  addParticle(
    position: THREE.Vector3,
    radius: number,
    beadId: string,
    pinned = false,
    linkToPrevious = true,
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

    // Create constraint to previous particle using radii (touching distance)
    if (linkToPrevious && index > 0) {
      const touchingLength = this.particles[index - 1].radius + radius;
      this.addConstraint(index - 1, index, touchingLength, stiffness);
    }

    return index;
  }

  /**
   * Insert a particle at a specific index, shifting everything after it.
   * Rebuilds constraints from scratch using radii.
   */
  insertParticle(
    index: number,
    position: THREE.Vector3,
    radius: number,
    beadId: string,
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
    this.rebuildConstraints();
  }

  /**
   * Remove a particle by index.
   * Constraints are rebuilt with gap closing so adjacent beads slide together.
   * Anchors (__anchor_left__, __anchor_right__) cannot be removed.
   */
  removeParticle(index: number): void {
    if (index < 0 || index >= this.particles.length) return;
    const p = this.particles[index];
    if (p.beadId === "__anchor_left__" || p.beadId === "__anchor_right__") return;

    this.particles.splice(index, 1);

    this.rebuildConstraints(true); // always close gaps on removal
  }

  /**
   * Remove a particle by beadId.
   * Returns true if found and removed.
   */
  removeParticleByBeadId(beadId: string): boolean {
    const index = this.particles.findIndex((p) => p.beadId === beadId);
    if (index < 0) return false;
    const p = this.particles[index];
    if (p.beadId === "__anchor_left__" || p.beadId === "__anchor_right__") return false;
    this.removeParticle(index);
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
   * Rest lengths are computed from adjacent particle radii (touching distance).
   *
   * `closeGaps`: when true, restLength = sum of radii regardless of current
   * positions, so the solver pulls separated particles together. When false,
   * restLength = max(currentDistance, sumOfRadii) to avoid teleporting beads.
   */
  rebuildConstraints(closeGaps = false): void {
    this.constraints = [];
    for (let i = 0; i < this.particles.length - 1; i++) {
      const a = this.particles[i];
      const b = this.particles[i + 1];
      const touchingLength = a.radius + b.radius;
      const restLength = closeGaps
        ? touchingLength
        : Math.max(a.position.distanceTo(b.position), touchingLength);
      this.constraints.push({
        a: i,
        b: i + 1,
        restLength,
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

    // Don't unpin anchors
    if (p.beadId === "__anchor_left__" || p.beadId === "__anchor_right__") return;

    p.pinned = false;

    // Apply throw velocity by offsetting previousPosition
    if (velocity && velocity.lengthSq() > 0) {
      const dt = 1 / 60;
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
    const safeDt = Math.min(dt, 1 / 30);

    this._integrate(safeDt);
    this._solveConstraints();
    this._applyBounds();
  }

  private _integrate(dt: number): void {
    const dtSq = dt * dt;

    for (const p of this.particles) {
      if (p.pinned) continue;

      _delta
        .copy(p.position)
        .sub(p.previousPosition)
        .multiplyScalar(this.damping);

      p.previousPosition.copy(p.position);

      p.position.add(_delta);
      p.position.addScaledVector(this.gravity, dtSq);

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
    for (const p of this.particles) {
      if (p.pinned) continue;
      if (p.position.y < -5) {
        p.position.y = -5;
        p.previousPosition.y = -5 + 0.1;
      }
    }
  }

  // ── Utilities ─────────────────────────────────────────────────────────

  getPositions(): THREE.Vector3[] {
    return this.particles.map((p) => p.position.clone());
  }

  findParticleByBeadId(beadId: string): number {
    return this.particles.findIndex((p) => p.beadId === beadId);
  }

  isAnyPinned(): boolean {
    return this.particles.some((p, i) => p.pinned && i > 0);
  }

  get particleCount(): number {
    return this.particles.length;
  }

  dispose(): void {
    this.particles = [];
    this.constraints = [];
  }

  swapParticlesByBeadId(idA: string, idB: string): boolean {
    const idxA = this.particles.findIndex((p) => p.beadId === idA);
    const idxB = this.particles.findIndex((p) => p.beadId === idB);
    if (idxA < 0 || idxB < 0) return false;

    const a = this.particles[idxA];
    const b = this.particles[idxB];

    const tmpBeadId = a.beadId;
    const tmpRadius = a.radius;
    a.beadId = b.beadId;
    a.radius = b.radius;
    b.beadId = tmpBeadId;
    b.radius = tmpRadius;

    return true;
  }
}
