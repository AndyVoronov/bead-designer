# S04: Шаблоны + шеринг

**Goal:** Templates browse in a gallery on the home page and load into the editor. Every design has a unique URL — pasting it restores an exact copy of the design. A "Поделиться" button copies the share URL to clipboard.
**Demo:** Open home page → see template gallery with bead-preview cards → click template → editor loads with those exact beads → click "Поделиться" → URL copied → paste in new tab → identical design loads.

## Must-Haves

- `encodeDesign()` / `decodeDesign()` pure functions that round-trip an array of `catalogBeadId` strings through JSON → LZ-String → base64url (D007)
- Template model in PostgreSQL via Prisma, seeded with 5–8 pre-made templates
- `GET /api/templates` returns approved templates; `GET /api/templates/[code]` returns single template by design code
- `/design/[code]` page deserializes the URL code, loads beads into `useDesignStore`, and renders the full editor
- Template browser on home page (`/`) with horizontal-scroll gallery of template cards showing bead color previews
- "Начать с нуля" button navigates to blank editor (`/editor`)
- "Поделиться" button in editor toolbar serializes current design, copies `${origin}/design/${code}` to clipboard

## Proof Level

- This slice proves: integration
- Real runtime required: yes (PostgreSQL, Next.js dev server, browser)
- Human/UAT required: yes (visual verification of template browser, share URL round-trip)

## Verification

- `npx vitest run` — all existing 44 tests pass + new serialization tests pass
- `tsc --noEmit` — zero TypeScript errors
- `npm run build` — production build succeeds with zero errors
- Manual browser: home page shows template gallery → click template → `/design/[code]` loads correct beads → "Поделиться" copies URL → paste in new tab → identical design
- Manual browser: `/editor` shows blank editor (default beads)
- Manual browser: `/api/templates` returns JSON array of templates
- Manual browser: invalid `/design/invalid-code` shows graceful error state

## Observability / Diagnostics

- Runtime signals: API response status codes (200/404/500), serialization success/failure, clipboard copy success/failure toast
- Inspection surfaces: `GET /api/templates` in browser, `useDesignStore.getState()` in console, browser DevTools Network tab for API calls
- Failure visibility: 404 for invalid template codes, console error for malformed design codes, toast notification for clipboard failure
- Redaction constraints: none (no PII or secrets in design codes — only catalog bead IDs)

## Integration Closure

- Upstream surfaces consumed: `useDesignStore` (S03), `CATALOG_BEADS` / `getCatalogBead` (S03), `EditorCanvas` (S03), `EditorToolbar` (S03), `catalogBeadToBeadState` (S03)
- New wiring introduced in this slice: `serialization.ts` ↔ `useDesignStore` (loadFromCatalogIds), Prisma client ↔ API routes (`/api/templates`), share URL ↔ `/design/[code]/page.tsx` ↔ `DesignLoader` ↔ `useDesignStore`, template browser ↔ `GET /api/templates`, home page ↔ template browser + "Начать с нуля" → `/editor`, EditorToolbar ↔ share button → clipboard
- What remains before the milestone is truly usable end-to-end: S05 (order + Telegram flow), S06 (admin CRUD for templates + catalog), S07 (deploy + real device testing)

## Tasks

- [x] **T01: DesignSerializer + store extensions** `est:30m`
  - Why: Serialization is the risk-free foundation that both sharing (T03) and template seeding (T02) depend on. Getting it right first with comprehensive tests prevents cascading bugs.
  - Files: `src/lib/serialization.ts`, `src/lib/__tests__/serialization.test.ts`, `src/types/bead.ts`, `src/stores/useDesignStore.ts`
  - Do: Install `lz-string`. Add `SerializableDesign` interface to `src/types/bead.ts` with `{ v: 1, p: "pacifier-holder", b: string[] }`. Create `encodeDesign(beads: BeadState[]): string` and `decodeDesign(code: string): SerializableDesign | null` in `src/lib/serialization.ts`. `encodeDesign` extracts `catalogBeadId` from each bead (skip beads without it), builds the serializable object, JSON.stringify, lz-string `compressToEncodedURIComponent`. `decodeDesign` reverses: decompress, JSON.parse, validate structure (version check), return null on any error. Add `loadFromCatalogIds(ids: string[])` and `clearDesign()` actions to `useDesignStore` — `loadFromCatalogIds` resets store then calls `catalogBeadToBeadState` for each ID and appends. Write tests: round-trip 1/7/40 beads, invalid code returns null, version mismatch handling, beads without catalogBeadId are skipped.
  - Verify: `npx vitest run src/lib/__tests__/serialization.test.ts` passes
  - Done when: encodeDesign + decodeDesign round-trip correctly for all test cases, store has loadFromCatalogIds/clearDesign actions, all tests pass

- [ ] **T02: Prisma + Template model + seed + API routes** `est:1.5h`
  - Why: Activates the database layer for the first time (Prisma schema exists but never migrated). Template model and API routes are prerequisites for the template browser (T04). Seed data validates that serialization works end-to-end with the DB.
  - Files: `prisma/schema.prisma`, `src/lib/prisma.ts`, `prisma/seed.ts`, `src/app/api/templates/route.ts`, `src/app/api/templates/[code]/route.ts`, `package.json`, `.env`
  - Do: Install `prisma` and `@prisma/client`. Ensure `DATABASE_URL` is set in `.env` (PostgreSQL connection string). Add `Template` model to schema: id (Int, autoincrement), name (String), designCode (String, unique), beadCount (Int), isApproved (Boolean, default true), isUserSubmitted (Boolean, default false), createdAt (DateTime). Run `npx prisma migrate dev --name init-templates`. Create `src/lib/prisma.ts` with standard Next.js singleton pattern (globalThis check to prevent HMR connection leaks). Create `prisma/seed.ts` with 5–8 templates using `encodeDesign` from T01 to generate design codes from predefined catalog bead ID arrays. Add `"prisma": { "seed": "npx ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts" }` to package.json and `@types/node` to devDeps if needed (already present). Run `npx prisma db seed`. Create `GET /api/templates` route handler: query templates where isApproved=true, return JSON array sorted by createdAt desc. Create `GET /api/templates/[code]/route.ts`: query by designCode, return 404 if not found.
  - Verify: `curl http://localhost:3000/api/templates` returns JSON array; `curl http://localhost:3000/api/templates/<first-template-code>` returns single template
  - Done when: Prisma migrate succeeds, seed populates templates table, both API endpoints return correct data

- [ ] **T03: Share page + share button + /editor route** `est:45m`
  - Why: Closes the sharing loop — designs can be loaded from URLs and shared via clipboard. This is the primary R006 deliverable for the sharing half.
  - Files: `src/app/design/[code]/page.tsx`, `src/components/editor/DesignLoader.tsx`, `src/app/editor/page.tsx`, `src/components/editor/EditorToolbar.tsx`
  - Do: Create `src/components/editor/DesignLoader.tsx` ("use client"): accepts `code: string` prop, on mount calls `decodeDesign(code)`, if valid calls `useDesignStore.getState().loadFromCatalogIds(design.b)`, shows loading spinner while decoding, shows error state if decode fails, renders `<EditorCanvas />` once loaded. Create `src/app/design/[code]/page.tsx` as Server Component: `export default async function DesignSharePage({ params }: { params: Promise<{ code: string }> })` — await params (Next.js 16 requirement), render `<DesignLoader code={code} />`. Create `src/app/editor/page.tsx` ("use client"): calls `useDesignStore.getState().clearDesign()` on mount, renders `<EditorCanvas />`. Add "Поделиться" button to `EditorToolbar.tsx`: calls `encodeDesign(useDesignStore.getState().beads)`, constructs URL `${window.location.origin}/design/${code}`, copies to clipboard via `navigator.clipboard.writeText()`, shows brief confirmation state (button text changes to "Скопировано!" for 2 seconds). Use inline SVG share icon (arrow-right-from-square or link). Position button between "Удалить" and "Сброс" in the toolbar. The share button should be disabled if beads array has fewer than 1 bead or all beads lack catalogBeadId.
  - Verify: Navigate to `/design/<valid-code>` → editor loads with correct beads; navigate to `/design/invalid` → error state shown; click "Поделиться" in editor → URL copied to clipboard; navigate to `/editor` → blank editor shown
  - Done when: `/design/[code]` loads designs from URL codes, `/editor` shows blank editor, share button copies valid URLs

- [ ] **T04: Template browser + home page redesign** `est:1h`
  - Why: Closes the template browsing loop — R006's other half. The home page becomes the entry point with a gallery of pre-made templates. Clicking a template loads it in the editor.
  - Files: `src/app/page.tsx`, `src/components/templates/TemplateBrowser.tsx`, `src/components/templates/TemplateCard.tsx`
  - Do: Create `src/components/templates/TemplateCard.tsx` ("use client"): accepts template data (name, designCode, beadCount), shows a row of small colored circles representing the first ~8 bead colors (resolve catalog bead IDs to colors via `getCatalogBead`), template name in Russian, bead count label, entire card is a `<Link href={/design/${designCode}}>` for navigation. Card styling: rounded-xl, shadow, hover scale effect, mobile-friendly tap target. Create `src/components/templates/TemplateBrowser.tsx` ("use client"): fetches `GET /api/templates` on mount (use native fetch + useState, no React Query yet — keep it simple for S04), renders a horizontal-scroll container of `TemplateCard` components, includes a "Начать с нуля" button styled as a card (Link to `/editor`). Add subtle loading/error states. Redesign `src/app/page.tsx`: Server Component with a welcoming header ("Конструктор бусин" or similar), subtitle, the `<TemplateBrowser />` component below. Mobile-first layout, clean visual design consistent with S03's glass-morphism aesthetic. No 3D canvas on the home page — it's a pure HTML/CSS template gallery.
  - Verify: Home page renders template gallery with cards; clicking a template navigates to `/design/[code]` with correct beads; "Начать с нуля" navigates to `/editor`; horizontal scroll works on mobile viewport
  - Done when: Home page shows template gallery, all templates load correctly when clicked, navigation flows work end-to-end

## Files Likely Touched

- `src/lib/serialization.ts` (new)
- `src/lib/__tests__/serialization.test.ts` (new)
- `src/types/bead.ts` (SerializableDesign interface)
- `src/stores/useDesignStore.ts` (loadFromCatalogIds, clearDesign)
- `prisma/schema.prisma` (Template model)
- `src/lib/prisma.ts` (new)
- `prisma/seed.ts` (new)
- `src/app/api/templates/route.ts` (new)
- `src/app/api/templates/[code]/route.ts` (new)
- `src/app/design/[code]/page.tsx` (new)
- `src/components/editor/DesignLoader.tsx` (new)
- `src/app/editor/page.tsx` (new)
- `src/components/editor/EditorToolbar.tsx` (share button)
- `src/components/templates/TemplateBrowser.tsx` (new)
- `src/components/templates/TemplateCard.tsx` (new)
- `src/app/page.tsx` (redesign)
- `package.json` (lz-string, prisma deps)
- `.env` (DATABASE_URL)
