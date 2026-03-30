# S04 — Research: Шаблоны + шеринг

**Date:** 2026-03-30

## Summary

S04 adds two capabilities: **template browsing/loading** and **design sharing via unique URLs**. The design serialization format (JSON → LZ-String → base64url) is decided in D007 and uses a well-known library. The Prisma schema exists but has never been migrated — this slice activates the database layer for the first time. Template data is small and straightforward (name, design code, bead count, approval flags). The main complexity is wiring together: (1) Prisma DB activation, (2) API routes (first in the project), (3) client-side serialization/deserialization, (4) a new `/design/[code]` page route, and (5) a template browser UI on the home page.

The risk is moderate. The serialization and URL routing are standard patterns. The DB activation is new territory but Prisma + PostgreSQL is well-trodden. The biggest unknown is whether we need a running PostgreSQL for local development — the answer is yes, and SQLite is not viable since the schema declares `provider = "postgresql"`. We should use a local PostgreSQL or the one that will exist on the VPS (S07).

**Recommendation:** Start with DesignSerializer (pure logic, testable immediately), then Prisma setup + Template model, then API routes, then the `/design/[code]` page, then the template browser UI on the home page.

## Recommendation

### Architecture approach

1. **DesignSerializer as pure functions** in `src/lib/serialization.ts` — serialize `BeadState[]` (catalogBeadId references only, no runtime IDs) → JSON → LZ-String compress → base64url. Reverse for deserialization. This is the risk-free foundation.

2. **Prisma + PostgreSQL activation** — install `prisma` + `@prisma/client`, add Template model to schema, run `prisma migrate dev`. Create `src/lib/prisma.ts` singleton. This requires a running PostgreSQL (Docker or local).

3. **API routes** — `src/app/api/templates/route.ts` (GET list, POST create) and `src/app/api/templates/[code]/route.ts` (GET by code). Standard Next.js App Router route handlers. No auth yet (S06 adds admin auth).

4. **Template seed data** — 5-10 hardcoded templates as SQL seed or Prisma seed script. Each template has a name, design code (pre-serialized), and approval flags.

5. **Share page** — `src/app/design/[code]/page.tsx` deserializes the code from URL, loads it into `useDesignStore`, and renders `EditorCanvas`. This is the sharing entry point.

6. **Home page redesign** — current `page.tsx` shows `EditorCanvas` directly. After S04, the home page shows a template browser (horizontal scroll or grid) with a "Начать с нуля" (start from scratch) button. Clicking a template navigates to `/design/[code]`. The "start from scratch" navigates to a generic editor route or renders `EditorCanvas` directly.

7. **"Share" button** — a new button in `EditorToolbar` that serializes the current design, copies the URL to clipboard, and shows a brief confirmation toast.

### What to serialize

The `BeadState` currently has runtime-generated IDs (timestamp+random). For sharing, we must serialize **only the `catalogBeadId` references** — the deserializer reconstructs full `BeadState` objects by looking up each `catalogBeadId` in `CATALOG_BEADS`. This means:

```ts
// Serialized format (before compression):
interface SerializableDesign {
  v: 1;                    // version for future format changes
  p: "pacifier-holder";    // productType
  b: string[];             // array of catalogBeadId strings, e.g. ["cb-003", "cb-027", ...]
}
```

For a 40-bead design, this is ~40 × 7 chars + overhead = ~400 bytes. LZ-String compresses typical JSON ~60%, then base64url encoding adds ~33%. Final URL: ~250-300 chars for 40 beads. Well within URL limits.

## Implementation Landscape

### Key Files

**Existing (read, may modify):**
- `src/types/bead.ts` — add `SerializableDesign` interface
- `src/stores/useDesignStore.ts` — add `loadDesign(beads: BeadState[])` action for deserialization, add `loadFromCatalogIds(ids: string[])` convenience method
- `src/components/editor/EditorToolbar.tsx` — add "Поделиться" (Share) button
- `src/app/page.tsx` — redesign from bare `<EditorCanvas />` to template browser home page
- `prisma/schema.prisma` — add Template model
- `src/lib/catalogUtils.ts` — add `catalogBeadIdsToBeadStates(ids: string[])` utility

**New files:**
- `src/lib/serialization.ts` — `encodeDesign(beads)` and `decodeDesign(code)` pure functions
- `src/lib/prisma.ts` — Prisma client singleton
- `src/app/api/templates/route.ts` — GET (list approved templates), POST (create template)
- `src/app/api/templates/[code]/route.ts` — GET (load template by design code)
- `src/app/design/[code]/page.tsx` — share page that deserializes + loads design + renders EditorCanvas
- `src/components/templates/TemplateBrowser.tsx` — home page template gallery component
- `src/components/templates/TemplateCard.tsx` — individual template card with bead preview
- `prisma/seed.ts` — seed script for initial templates (or seed in `prisma/seed.sql`)
- `src/lib/__tests__/serialization.test.ts` — tests for encode/decode round-trip

### Build Order

1. **DesignSerializer (pure logic)** — `src/lib/serialization.ts` + tests. No dependencies, proves the encoding/decoding works. Unblockable without DB.

2. **Prisma setup + Template model** — install prisma + @prisma/client, add Template model to schema, `prisma migrate dev`, create `src/lib/prisma.ts`, seed templates. Requires PostgreSQL running locally.

3. **API routes** — `src/app/api/templates/route.ts` + `[code]/route.ts`. Depends on Prisma client and seed data.

4. **Share page** — `src/app/design/[code]/page.tsx`. Depends on serializer (step 1). No DB dependency — the code is fully self-contained in the URL.

5. **Template browser UI** — `TemplateBrowser` + `TemplateCard` + home page redesign. Depends on API routes (step 3) for fetching template list.

6. **Share button in toolbar** — small addition to `EditorToolbar`. Depends on serializer (step 1).

### Verification Approach

- **Unit tests:** serialization round-trip (encode 40-bead design → decode → same catalogBeadIds), version parsing, invalid code handling. Run with `npx vitest run`.
- **Build:** `npm run build` — must pass with zero errors.
- **Manual browser checks:**
  - Home page shows template gallery with cards
  - Clicking a template navigates to `/design/[code]` and loads the correct beads
  - "Начать с нуля" opens blank editor
  - "Поделиться" button copies URL to clipboard
  - Pasting shared URL in new tab loads exact same design
  - API endpoints return correct data (fetch `/api/templates`)
- **TypeScript:** `tsc --noEmit` zero errors

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| String compression for URLs | `lz-string` (npm: `lz-string`, ~5KB) | D007 already decided. `compressToEncodedURIComponent()` and `decompressFromEncodedURIComponent()` do exactly what we need — compress JSON to URL-safe string. Battle-tested, tiny, no deps. |
| Prisma client singleton | `src/lib/prisma.ts` with global singleton pattern | Standard Next.js + Prisma pattern to avoid multiple instances in dev (HMR creates new connections). |
| Copy to clipboard | `navigator.clipboard.writeText()` | Native browser API, no library needed. Fallback to `document.execCommand('copy')` for older browsers if needed (not required — target is modern mobile browsers). |

## Constraints

- **Prisma provider is `postgresql`** — SQLite not an option without schema changes. Local development requires a running PostgreSQL instance (Docker, WSL, or local install).
- **No auth yet** — S06 adds admin auth. S04 API routes should be public (read) and open (create) for now. Template creation can be restricted to seed data until S06.
- **`params` is a Promise in Next.js 16** — dynamic route `[code]` pages must `await params` to extract the code value.
- **`ssr: false` forbidden in Server Components** — `/design/[code]/page.tsx` is a Server Component. If it needs to load a Three.js client component, use the `SceneLoader` wrapper pattern (client boundary component with dynamic import).
- **URL length limits** — base64url-encoded design should stay under ~2000 chars for IE compatibility, but modern browsers support much longer URLs. For 40 beads, expect ~250-300 chars — well under any limit.
- **Touch isolation** — template browser UI on home page must not interfere with existing 3D canvas touch handling. The home page doesn't have a 3D canvas, so this is only a concern if the template browser appears inside the editor.

## Common Pitfalls

- **Serializing runtime IDs instead of catalog IDs** — `BeadState.id` is timestamp+random, meaningless for sharing. Must serialize only `catalogBeadId` and reconstruct on load. Test round-trip carefully.
- **Prisma client in dev mode creating multiple connections** — use the standard `globalThis.prisma` singleton pattern to prevent connection pool exhaustion during HMR.
- **Forgetting to `prisma generate`** — after schema changes, the client needs regeneration. Add `"postinstall": "prisma generate"` to package.json.
- **Next.js route handler `params` typing** — in Next.js 16, `params` is `Promise<{ code: string }>` not `{ code: string }`. Must await it.
- **Template seed data out of sync** — design codes in seed data must be valid (serializable catalog bead IDs). Test by decoding each seed template's code.

## Open Risks

- **Local PostgreSQL availability** — the developer may not have PostgreSQL running locally. Docker is the easiest solution (`docker run -d -p 5432:5432 -e POSTGRES_DB=beaddesigner -e POSTGRES_PASSWORD=dev postgres`). S07 deployment will use the VPS PostgreSQL.
- **Template thumbnails** — the boundary map mentions `thumbnailUrl` on Template model but there's no mechanism to generate thumbnails from 3D designs. For S04, templates can show a simple bead color preview (colored dots) instead of actual 3D screenshots. Real thumbnail generation is deferred.
- **Home page vs editor navigation** — currently `page.tsx` renders `EditorCanvas` directly. Redesigning the home page to show templates first means the editor is now at a different route. Need to decide: does `/` show templates, and clicking opens editor? Or does `/` remain the editor with a template picker overlay? The former is cleaner for S04.

## Sources

- Next.js App Router route handlers pattern (source: [Next.js Route Handlers docs](https://nextjs.org/docs/app/api-reference/file-conventions/route))
- Next.js dynamic routes `params` as Promise (source: [Next.js Dynamic Routes docs](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes))
- LZ-String library (source: [lz-string GitHub](https://github.com/pieroxy/lz-string/))
- Prisma Next.js singleton pattern (source: [Prisma docs — Next.js](https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices))
