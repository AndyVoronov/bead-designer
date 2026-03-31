# Knowledge Base

<!-- Append-only. Non-obvious rules, recurring gotchas, useful patterns. -->

## Vitest on Windows NTFS Junctions (GSD Worktrees)

- **Vite `/@fs/` protocol fails across junction boundaries**: `setupFiles` paths are resolved through the junction (`D:\...`) but Vite's internal `fs.allow` uses the real path (`C:\...`). Fix: use `fs.realpathSync(__dirname)` in `vitest.config.ts` and pass the resolved path to both `setupFiles` and `server.fs.allow`.
- **React 19 state batching in tests**: Multiple `setState` calls inside a single `act()` are batched — `while` loops calling state-updating functions read stale state. Fix: use separate `act()` calls per state update.

## Next.js 16 + GSD Worktree

- **Windows junction path bug**: `npm run dev` / `next start` from the junction path (`D:\ProjectsOnCursor\ToyDesigner\.gsd\worktrees\M001`) causes Next.js to double-concatenate paths with the real path (`C:\Users\Andy\.gsd\projects\...`), producing ENOENT on `.next/routes-manifest.json`. The build succeeds but `required-server-files.json` contains the real path in `outputFileTracingRoot` and `appDir`. At runtime, Next.js joins CWD (junction path) with these absolute real paths, creating a corrupted path. **Fix**: always start `next start`/`next dev` from the real path (`C:\Users\Andy\.gsd\projects\...\worktrees\M001`), not the junction path. The build can run from either path since it only writes paths to config files.

- **ssr:false forbidden in Server Components**: Next.js 16 raises a build error if `next/dynamic({ ssr: false })` is used in a Server Component. **Fix**: create a thin `"use client"` wrapper (e.g., `SceneLoader.tsx`) that uses dynamic import, then import the wrapper from the Server Component page.

- **Turbopack default in Next.js 16**: `webpack` config is ignored/rejected unless `--webpack` flag or `turbopack: {}` is explicitly set. WASM files are handled natively by Turbopack — no need for `config.experiments.asyncWebAssembly`.

## React Three Rapier

- **useRopeJoint requires separate component per joint**: React hooks can't be called conditionally or in loops. Each `useRopeJoint(bodyA, bodyB, params)` must be in its own component (e.g., `JointLink`). React effect ordering guarantees parent/sibling body refs are populated before child joint effects run — no race condition.
- **useRopeJoint params format**: Pass as `[[x,y,z], [x,y,z], length]` — the library destructures as `[body1Anchor, body2Anchor, maxDist]` and converts via `vector3ToRapierVector` which handles arrays, numbers, and THREE.Vector3.
- **RigidBody ref assignment timing**: RigidBody sets `ref.current` inside `useImperativeInstance`'s `createFn`, called during `useEffect`. Sibling JointLink effects run after all RigidBody effects (React left-to-right ordering), so refs are always populated when joints are created.
- **RigidBody is React.memo, not forwardRef**: In @react-three/rapier v2, `RigidBody` takes `ref` as a regular prop (React 19 pattern). `useForwardedRef` returns the same ref object, so `ref.current` is set directly on the caller's ref.

## MeshLine

- **TypeScript type augmentation for R3F**: Use plain object types for `meshLineMaterial` in `ThreeElements` — never use `React.DetailedHTMLProps` as a base (brings incompatible HTML ref types). Include `attach`, `args` (ConstructorParameters), and all shader-specific props (`color`, `lineWidth`, `resolution`, `sizeAttenuation`).

## R3F Canvas Touch-Action on Mobile

- **R3F sets inline touch-action: auto**: The Three.js renderer (via R3F) applies `touch-action: auto` as an inline style on the `<canvas>` element. This overrides CSS cascade rules, causing the browser to intercept touch gestures for scroll/zoom. **Fix**: use `.canvas-container canvas { touch-action: none !important; }` in CSS. The `!important` is required because inline styles have higher specificity than regular CSS rules.

## Zustand in R3F Event Callbacks

- **getState() vs hook in R3F contexts**: R3F pointer event callbacks (`onPointerDown`, `onPointerUp`, etc.) are imperative callbacks attached to Three.js objects. Using Zustand hook subscriptions (`useStore(s => s.value)`) in these contexts creates stale closures and unnecessary re-renders. **Fix**: use `useStore.getState()` in imperative callbacks. Use hook subscriptions only in React components that need reactive re-rendering (e.g., components that set `enabled` prop based on store state).

## drei PerformanceMonitor

- **Warmup triggers onFallback**: PerformanceMonitor starts at a lower quality factor (e.g., 0.6) and ramps up. During this ramp-up, rapid quality changes count as "flipflops". After `flipflops` threshold (default 5), `onFallback` fires even when FPS is actually fine. This is expected behavior — don't treat it as a real performance warning.
- **CPU throttling unavailable in Playwright**: Chrome DevTools CPU throttling (2×/4×/6× slowdown) is a DevTools-only feature not available via Playwright's device emulation. Emulated devices run at native clock speed.

## Zustand Store Testing

- **Direct getState() calls, no renderHook**: Zustand stores don't need `@testing-library/react`'s `renderHook`. Import the store and call `store.getState()` directly for state reads, and `store.getState().action()` for mutations. Call `useDesignStore.setState({ beads: [] })` or the action-based reset in `beforeEach` for test isolation.

## Touch Isolation in Mixed Canvas/DOM Layouts

- **Global touch-action: none breaks DOM scroll**: When the CSS sets `touch-action: none` on html/body to prevent browser gestures on a WebGL canvas, ALL child scroll containers break. **Fix**: explicitly set `touch-action: pan-y` on specific scroll containers that need vertical scroll (e.g., `.catalog-scroll { touch-action: pan-y; }`). This must be combined with `stopPropagation` on `onTouchStart`/`onTouchMove` events on the panel container to prevent events from reaching the canvas.
- **Belt-and-suspenders approach**: Use all three: CSS class with !important + inline style on the element + JS stopPropagation. R3F's inline style override makes a single-layer fix unreliable.

## Tap vs Drag Detection in Pointer Events

- **Track both time and distance**: A simple time threshold isn't enough — a long press with no movement should still be a tap (e.g., user thinks carefully before tapping). Conversely, a very fast flick should be a drag, not a tap. **Fix**: require BOTH elapsed time < threshold AND pointer distance < threshold (in NDC coordinates, not pixels, for viewport-independence).
- **Auto-deselect after drag**: After completing a drag gesture, always call `selectBead(null)` to clear any accidental selection state. This prevents the confusing UX where a bead stays highlighted after the user finishes repositioning it.

## Prisma 7 Configuration

- **No `url` in schema.prisma**: Prisma 7 removed the `url` property from datasource blocks. The connection URL is now in `prisma.config.ts` using `defineConfig()` from `prisma/config`.
- **dotenv required in prisma.config.ts**: The `env()` helper from `prisma/config` reads from `process.env`, NOT from `.env` files. You must `import "dotenv/config"` at the top of `prisma.config.ts` to load the `.env` file.
- **Driver adapters required**: PrismaClient constructor needs a driver adapter in v7. For SQLite: `@prisma/adapter-libsql` + `@libsql/client`. For PostgreSQL: `@prisma/adapter-pg`. Import name is `PrismaLibSql` (lowercase 'ql'), NOT `PrismaLibSQL`.
- **SQLite URLs resolve from config location**: In Prisma 7, relative SQLite URLs (`file:./dev.db`) resolve relative to `prisma.config.ts`, not `schema.prisma`.

## lz-string URL Encoding in Next.js Path Segments

- **`+` in lz-string output gets encoded as `%2B`**: lz-string's `compressToEncodedURIComponent` uses `+` as a valid output character. When this output is placed in a URL path segment, browsers encode `+` to `%2B`. Next.js does NOT decode `%2B` back to `+` in dynamic route `params`, so the client receives literal `%2B` instead of `+`. **Fix**: call `decodeURIComponent(code)` in `decodeDesign()` before passing to `LZString.decompressFromEncodedURIComponent()`. This is safe because `decodeURIComponent` is a no-op for strings without encoded characters.

## Turbopack + Prisma Generate Cache

- **`.next` cache goes stale after `prisma generate`**: Turbopack caches Prisma client types. After running `prisma generate` (e.g., after adding a new model), the `.next` cache may still reference old types, causing TypeScript errors or runtime type mismatches. **Fix**: delete the `.next` folder and restart the dev server after any Prisma schema change that triggers `prisma generate`.

## Next.js 16 proxy.ts (not middleware.ts)

- **Next.js 16 replaced middleware.ts with proxy.ts**: The file `src/proxy.ts` handles what `src/middleware.ts` did in Next.js 14/15 — request interception, redirects, and response modification. If you create `middleware.ts`, it will be ignored or conflict with `proxy.ts`.
- **Auth pattern in proxy.ts**: Check for a cookie on specific path prefixes. Return `NextResponse.redirect()` for page routes and `NextResponse.json({ error: "Unauthorized" }, { status: 401 })` for API routes. Whitelist auth endpoints (e.g., `/api/admin/auth`) so login attempts work without a cookie.

## Next.js 16 Turbopack Standalone + External Modules

- **Turbopack hashes external module names in server chunks**: When building with `output: 'standalone'`, Turbopack creates hashed references to external packages (e.g., `@prisma/client-2c3a283f134fdcb6`, `pg-587764f78a6c7a9c`) inside `.next/server/chunks/*.js`. These hashed names are NOT the actual package names in node_modules. **Fix**: create symlinks from hashed names to actual packages on the deployment target. Find the hashes with `grep -o 'prisma/client-[a-z0-9]*' .next/server/chunks/*.js | sort -u`. The hashes change on every rebuild, so this must be automated in the deploy script.
- **Standalone output doesn't include hashed module entries**: The `.next/standalone/node_modules/` directory contains the actual packages (`@prisma/client`, `pg`) but NOT the hashed aliases that the server chunks reference. The `node_modules` from `npm install` also lacks these. Symlinks are the only solution.
- **Deploy script must create symlinks**: After extracting the standalone output on the VPS, the deploy script must scan for hashed module references and create corresponding symlinks. Example: `cd node_modules/@prisma && ln -sf client client-2c3a283f134fdcb6`.

## VPS Deployment from Windows

- **rsync unavailable in Git Bash on Windows**: The deploy.sh script uses rsync for file transfer, but rsync is not bundled with Git Bash on Windows. **Fix**: use `tar czf | scp | tar xzf` instead. This is also faster for small projects since it avoids rsync's file-by-file comparison overhead.
- **PostgreSQL port may not be 5432**: If another service (e.g., Docker) occupies port 5432 during PostgreSQL installation, the auto-installer selects a different port (e.g., 5433). Always verify with `pg_lsclusters` and `SELECT inet_server_port()` from psql.
- **PM2 startup persistence**: After deploying, run `pm2 save` and `pm2 startup` to ensure the process survives VPS reboots. Without this, PM2 forgets the process list on restart.
- **prisma.config.ts must be deployed**: Prisma 7 uses prisma.config.ts (not schema.prisma) for the datasource URL. Deploying schema.prisma alone causes "must start with postgresql://" errors on `prisma db push`.
- **Seed script may need src/ directory**: If `prisma/seed.ts` imports from project source files (e.g., `src/data/catalogBeads.ts`), those source files must also be deployed to the VPS.
