# Knowledge Base

<!-- Append-only. Non-obvious rules, recurring gotchas, useful patterns. -->

## Next.js 16 + GSD Worktree

- **Windows junction path bug**: `npm run dev` from the junction path (`D:\ProjectsOnCursor\ToyDesigner\.gsd\worktrees\M001`) causes Next.js to double-concatenate paths with the real path (`C:\Users\Andy\.gsd\projects\...`), producing ENOENT on `.next/dev/routes-manifest.json`. **Fix**: always start the dev server from the real path, or use `--port N` to force a specific port.

- **ssr:false forbidden in Server Components**: Next.js 16 raises a build error if `next/dynamic({ ssr: false })` is used in a Server Component. **Fix**: create a thin `"use client"` wrapper (e.g., `SceneLoader.tsx`) that uses dynamic import, then import the wrapper from the Server Component page.

- **Turbopack default in Next.js 16**: `webpack` config is ignored/rejected unless `--webpack` flag or `turbopack: {}` is explicitly set. WASM files are handled natively by Turbopack — no need for `config.experiments.asyncWebAssembly`.
