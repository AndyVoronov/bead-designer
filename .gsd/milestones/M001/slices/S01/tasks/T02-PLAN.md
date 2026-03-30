---
estimated_steps: 8
estimated_files: 4
---

# T02: Build physics bead chain with rope joints and MeshLine thread

**Slice:** S01 — 3D-физика цепочки бусин
**Milestone:** M001

## Description

Build the core physics bead chain — the heart of R001. Creates BeadRigidBody (individual physics bead), BeadChain (fixed anchor + array of beads connected by rope joints), and ThreadLine (MeshLine visualization of the thread connecting beads). Uses the proven Vercel 3D badge architecture.

## Steps

1. Create `src/components/scene/BeadRigidBody.tsx`:
   - `"use client"` component
   - Props: `{ id, radius, color, damping, position, onRef }` where `onRef` is a callback to register the RigidBody ref
   - Render `<RigidBody ref={onRef} colliders={false} angularDamping={damping} linearDamping={damping} position={position}>`
   - Inside: `<BallCollider args={[radius]} />` + `<mesh castShadow>><sphereGeometry args={[radius, 32, 32]} /><meshStandardMaterial color={color} roughness={0.3} metalness={0.1} /></mesh>`
   - Use `forwardRef` or callback ref pattern so the parent can collect body refs

2. Create `src/components/scene/BeadChain.tsx`:
   - `"use client"` component
   - Props: `{ beads: BeadState[], anchorPosition: [number, number, number] }`
   - Render a fixed anchor: `<RigidBody type="fixed" position={anchorPosition}><BallCollider args={[0.15]} /><mesh><sphereGeometry args={[0.15]} /><meshStandardMaterial color="#333" /></mesh></RigidBody>` (small dark anchor ball)
   - Maintain a `bodyRefs` useRef<Map<number, RapierRigidBody>> to store refs for each bead by index
   - Maintain a `anchorRef` for the fixed body
   - Render `beads.map((bead, i) => <BeadRigidBody key={bead.id} ... onRef={(ref) => { if (ref) bodyRefs.current.set(i, ref) }} />)`
   - Create sub-component `RopeJointSegment` for each pair: anchor→bead0, bead0→bead1, bead1→bead2, etc.
   - Each `RopeJointSegment` uses `useRopeJoint(bodyA, bodyB, { length: ropeLength })` where ropeLength = `distance between beads * 0.9` (slightly shorter than distance to create tension). For anchor→bead0: `useRopeJoint(anchorRef, bodyRefs[0], { length: 0.8 })`. For bead[i]→bead[i+1]: `useRopeJoint(bodyRefs[i], bodyRefs[i+1], { length: 0.6 })`
   - **Important**: `useRopeJoint` must be called from a child component (not in a loop in the parent) because React hooks can't be called conditionally. Create a `JointLink` component that takes bodyA and bodyB refs and renders the joint.
   - Position beads in a vertical column: `bead0` at `[0, anchorY - 0.8, 0]`, `bead1` at `[0, anchorY - 1.6, 0]`, etc. (spacing ~0.8 units)
   - Expose bodyRefs via context or prop callback so ThreadLine can read positions

3. Create `src/components/scene/ThreadLine.tsx`:
   - `"use client"` component
   - Import `meshline` types: `import { MeshLineGeometry, MeshLineMaterial } from 'meshline'`
   - Call `extend({ MeshLineGeometry, MeshLineMaterial })` at module level (outside component)
   - Props: `{ bodyRefs: Map<number, RapierRigidBody>, anchorRef: RefObject<RapierRigidBody>, anchorPosition: [number, number, number], color: string }`
   - Create a ref for the meshline geometry: `const geoRef = useRef<MeshLineGeometry>(null)`
   - In `useFrame`: iterate all bodyRefs, read `ref.translation()` for each, build array of `Vector3` points (anchor position first, then each bead position), create `CatmullRomCurve3` from points, call `geoRef.current.setPoints(curve.getPoints(32))` to update the meshline
   - Render: `<mesh><meshLineGeometry ref={geoRef} /><meshLineMaterial color={color} lineWidth={0.03} /></mesh>`
   - **Critical**: check `bodyRefs.current.size === beads.length` before reading — skip frame if refs not yet mounted

4. Update `src/components/scene/Scene.tsx`:
   - Replace the test mesh with `<BeadChain beads={defaultBeads} anchorPosition={[0, 3, 0]} />`
   - Add `<ThreadLine>` connected to the same body refs
   - Pass body refs from BeadChain to ThreadLine (use a shared ref or context)
   - Keep OrbitControls and Environment
   - Add `<ContactShadows position={[0, -2, 0]} opacity={0.4} scale={10} blur={2} />`

5. Define default beads for the demo — 7 beads with alternating colors:
   ```typescript
   const defaultBeads: BeadState[] = [
     { id: 'bead-1', type: 'wood', radius: 0.2, color: '#D4A574' },
     { id: 'bead-2', type: 'silicone', radius: 0.18, color: '#FF6B9D' },
     { id: 'bead-3', type: 'wood', radius: 0.22, color: '#C4956A' },
     // ... etc for 7 beads
   ];
   ```

6. Verify the chain works: run `npm run dev`, open browser. The chain should hang under gravity. Click/drag on a bead (even without the full drag implementation) to disturb it and see it swing.

7. Run `npm run build` to confirm no build errors.

## Must-Haves

- [ ] BeadRigidBody renders a physics sphere with BallCollider and configurable radius/color
- [ ] BeadChain creates a fixed anchor + N dynamic beads connected by rope joints
- [ ] Chain hangs under gravity and swings when disturbed
- [ ] ThreadLine renders a smooth MeshLine curve through all bead positions
- [ ] ThreadLine updates every frame from body translation positions
- [ ] `npm run build` succeeds

## Verification

- `npm run build` exits 0
- Browser: 7 beads hang from anchor, chain curves naturally under gravity
- Browser: disturbing a bead (click/touch) causes the chain to swing
- Browser: MeshLine thread is visible connecting all beads with a smooth curve

## Observability Impact

- Signals added: Physics debug overlay can be enabled via `<Physics debug>` prop in Scene.tsx (comment out by default, useful for debugging joint stability)
- How to inspect: Add `debug` prop to `<Physics>` component — renders collider wireframes and joint connections
- Failure state: Chain "explodes" (bodies fly apart) indicates solver instability — mitigated by damping and fixed timestep

## Inputs

- `src/types/bead.ts` — BeadState, BeadType, ChainConfig types (from T01)
- `src/components/scene/Scene.tsx` — existing Canvas + Physics setup (from T01)
- `package.json` — @react-three/rapier, @react-three/drei, meshline, three (from T01)
- `.gsd/milestones/M001/slices/S01/S01-RESEARCH.md` — Vercel badge architecture details, rope joint patterns, common pitfalls

## Expected Output

- `src/components/scene/BeadRigidBody.tsx` — physics bead component (RigidBody + BallCollider + mesh)
- `src/components/scene/BeadChain.tsx` — full chain (anchor + beads + rope joints)
- `src/components/scene/ThreadLine.tsx` — MeshLine thread visualization
- `src/components/scene/Scene.tsx` — updated with BeadChain + ThreadLine replacing test mesh
