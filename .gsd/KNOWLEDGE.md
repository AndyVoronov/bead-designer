# Knowledge Base

<!-- Append-only. Non-obvious rules, recurring gotchas, useful patterns. -->

## Vitest on Windows NTFS Junctions (GSD Worktrees)

- **Vite `/@fs/` protocol fails across junction boundaries**: `setupFiles` paths are resolved through the junction (`D:\...`) but Vite's internal `fs.allow` uses the real path (`C:\...`). Fix: use `fs.realpathSync(__dirname)` in `vitest.config.ts` and pass the resolved path to both `setupFiles` and `server.fs.allow`.
- **React 19 state batching in tests**: Multiple `setState` calls inside a single `act()` are batched — `while` loops calling state-updating functions read stale state. Fix: use separate `act()` calls per state update.

## Next.js 16 + GSD Worktree

- **Windows junction path bug**: `npm run dev` from the junction path (`D:\ProjectsOnCursor\ToyDesigner\.gsd\worktrees\M001`) causes Next.js to double-concatenate paths with the real path (`C:\Users\Andy\.gsd\projects\...`), producing ENOENT on `.next/dev/routes-manifest.json`. **Fix**: always start the dev server from the real path, or use `--port N` to force a specific port.

- **ssr:false forbidden in Server Components**: Next.js 16 raises a build error if `next/dynamic({ ssr: false })` is used in a Server Component. **Fix**: create a thin `"use client"` wrapper (e.g., `SceneLoader.tsx`) that uses dynamic import, then import the wrapper from the Server Component page.

- **Turbopack default in Next.js 16**: `webpack` config is ignored/rejected unless `--webpack` flag or `turbopack: {}` is explicitly set. WASM files are handled natively by Turbopack — no need for `config.experiments.asyncWebAssembly`.

## React Three Rapier

- **useRopeJoint requires separate component per joint**: React hooks can't be called conditionally or in loops. Each `useRopeJoint(bodyA, bodyB, params)` must be in its own component (e.g., `JointLink`). React effect ordering guarantees parent/sibling body refs are populated before child joint effects run — no race condition.
- **useRopeJoint params format**: Pass as `[[x,y,z], [x,y,z], length]` — the library destructures as `[body1Anchor, body2Anchor, maxDist]` and converts via `vector3ToRapierVector` which handles arrays, numbers, and THREE.Vector3.
- **RigidBody ref assignment timing**: RigidBody sets `ref.current` inside `useImperativeInstance`'s `createFn`, called during `useEffect`. Sibling JointLink effects run after all RigidBody effects (React left-to-right ordering), so refs are always populated when joints are created.
- **RigidBody is React.memo, not forwardRef**: In @react-three/rapier v2, `RigidBody` takes `ref` as a regular prop (React 19 pattern). `useForwardedRef` returns the same ref object, so `ref.current` is set directly on the caller's ref.

## MeshLine

- **TypeScript type augmentation for R3F**: Use plain object types for `meshLineMaterial` in `ThreeElements` — never use `React.DetailedHTMLProps` as a base (brings incompatible HTML ref types). Include `attach`, `args` (ConstructorParameters), and all shader-specific props (`color`, `lineWidth`, `resolution`, `sizeAttenuation`).
