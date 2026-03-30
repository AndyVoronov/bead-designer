---
id: S04
parent: M001
milestone: M001
provides:
  - encodeDesign / decodeDesign pure serialization functions (JSON → LZ-String → base64url)
  - SerializableDesign wire format with versioning
  - loadFromCatalogIds and clearDesign store actions
  - Template model (Prisma) + 8 seeded pre-made templates
  - GET /api/templates (list approved) + GET /api/templates/[code] (lookup)
  - /design/[code] share page — deserializes URL code, loads beads into editor
  - /editor blank editor page — clears store on mount
  - "Поделиться" share button in toolbar — copies share URL to clipboard
  - Home page template gallery with horizontal-scroll cards + "Начать с нуля"
  - TemplateCard with colored-dot bead preview, Russian names, bead counts
requires:
  - slice: S03
    provides: useDesignStore, CATALOG_BEADS / getCatalogBead, EditorCanvas, EditorToolbar, catalogBeadToBeadState, BeadState type
affects:
  - S05 (consumes DesignSerializer, template API, share URL format)
  - S06 (consumes Template API for admin CRUD, uses serialization for design approval)
key_files:
  - src/lib/serialization.ts
  - src/lib/__tests__/serialization.test.ts
  - src/types/bead.ts
  - src/stores/useDesignStore.ts
  - prisma/schema.prisma
  - src/lib/prisma.ts
  - prisma/seed.ts
  - src/app/api/templates/route.ts
  - src/app/api/templates/[code]/route.ts
  - src/app/design/[code]/page.tsx
  - src/components/editor/DesignLoader.tsx
  - src/app/editor/page.tsx
  - src/components/editor/EditorToolbar.tsx
  - src/components/templates/TemplateBrowser.tsx
  - src/components/templates/TemplateCard.tsx
  - src/app/page.tsx
key_decisions:
  - D007: JSON → LZ-String → base64url for design serialization (compact, URL-safe)
  - D024: SQLite via LibSql adapter for local dev (zero external deps, no Docker needed)
patterns_established:
  - Serialization round-trip with versioned wire format and strict validation
  - Server Component + client boundary pattern for dynamic routes (page.tsx awaits params, DesignLoader handles side effects)
  - Idempotent seed pattern (deleteMany before insert)
  - Prisma singleton with LibSql adapter + HMR protection for Next.js
  - Horizontal-scroll gallery with snap-x for mobile template cards
  - Clipboard share pattern: encode → construct URL → navigator.clipboard → confirmation state with timeout revert
observability_surfaces:
  - GET /api/templates — returns full template list with design codes
  - GET /api/templates/[code] — returns single template or 404 JSON
  - useDesignStore.getState().beads — verify loaded design after navigation
  - encodeDesign(beads) / decodeDesign(code) — callable from browser console
  - npx prisma db seed — re-seed database (idempotent)
  - Browser console for clipboard copy errors (console.error in handleShare)
  - DesignLoader error state visible in browser for invalid design codes
drill_down_paths:
  - .gsd/milestones/M001/slices/S04/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S04/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S04/tasks/T03-SUMMARY.md
  - .gsd/milestones/M001/slices/S04/tasks/T04-SUMMARY.md
duration: 40m
verification_result: passed
completed_at: 2026-03-30T13:37:00Z
---

# S04: Шаблоны + шеринг

**Complete template gallery with shareable design URLs: 8 seeded templates browseable on home page, /design/[code] restores exact bead designs, "Поделиться" button copies share URLs to clipboard.**

## What Happened

This slice closed the template browsing and sharing loops in four sequential tasks:

**T01 (DesignSerializer + store extensions)** established the serialization foundation first — `encodeDesign` and `decodeDesign` pure functions that round-trip bead arrays through JSON → LZ-String → base64url. Added `SerializableDesign` wire format with versioning (`{ v: 1, p: "pacifier-holder", b: string[] }`). Extended `useDesignStore` with `loadFromCatalogIds` (resolves catalog IDs to bead states) and `clearDesign`. 13 tests cover round-trips at 1/7/40 beads, invalid inputs, and edge cases. All 57 tests pass.

**T02 (Prisma + Template model + seed + API)** activated the database layer. The project was already configured with SQLite via LibSql adapter (D024) — no changes needed to schema, Prisma client, or API routes, which were pre-created by a prior agent run. Created the seed script with 8 templates using `encodeDesign` from T01 to generate valid design codes. Fixed idempotent re-seeding with `deleteMany()` before insert. Both API endpoints verified: `GET /api/templates` returns 8 sorted templates, `GET /api/templates/[code]` returns single or 404.

**T03 (Share page + share button + /editor route)** completed the sharing loop. All four files were pre-created and verified correct: `/design/[code]` Server Component delegates to `DesignLoader` client boundary (loading/error/loaded states), `/editor` clears store on mount, and `EditorToolbar` has the "Поделиться" button with `encodeDesign` → clipboard copy → "Скопировано!" confirmation. Invalid codes show graceful error state with "Неверная ссылка" and return link.

**T04 (Template browser + home page redesign)** completed the template browsing loop. `TemplateCard` decodes design codes to show colored-dot bead previews (8px circles from catalog color lookup), Russian names, and bead counts with proper pluralization. `TemplateBrowser` fetches `/api/templates` on mount with skeleton loading and error+retry states. Home page is a Server Component with gradient background, hero section, and horizontal-scroll gallery — no 3D canvas, lightweight entry point.

## Verification

All slice-level verification passes:
- `npx vitest run` — 57/57 tests pass (44 existing + 13 new serialization tests)
- `npx tsc --noEmit` — zero TypeScript errors
- `npm run build` — production build succeeds, 6 routes generated (/, /editor, /design/[code], /api/templates, /api/templates/[code], /_not-found)
- Browser: home page shows 8 template cards + "Начать с нуля" card
- Browser: template click → `/design/[code]` loads correct 12 beads in editor
- Browser: "Начать с нуля" → `/editor` shows blank editor (0 beads)
- Browser: invalid `/design/invalid-code` → graceful error state with return link
- Browser: `/api/templates` returns JSON array of 8 templates
- Browser: "Поделиться" button visible and enabled (clipboard not testable in Playwright sandbox)

## New Requirements Surfaced

None.

## Deviations

- **SQLite instead of PostgreSQL**: Task plan specified PostgreSQL, but the project was already configured with SQLite via LibSql adapter. All functionality works identically — avoids Docker/PostgreSQL prerequisite. Decision D024 already documented this.
- **Pre-created files**: T02, T03, and T04 files were all pre-created by a prior agent run. No code changes were needed for T03 and T04 — only verification. T02 only needed idempotent re-seeding fix.

## Known Limitations

- **Clipboard API not testable in Playwright**: The `navigator.clipboard.writeText` call in the share button cannot be verified end-to-end in automated browser context. Code logic verified through review and unit-level testing.
- **Bead reorder not supported**: R005's "менять порядок перетаскиванием" is still deferred. Designs serialize beads in their current order but there's no UI to reorder.
- **No user-submitted template flow**: R006's "Подтверждённые админом пользовательские изделия попадают в каталог шаблонов" is S06 territory.
- **WebGL context loss on HDR load failure**: Pre-existing infrastructure issue where environment map proxy failures crash the 3D scene. Unrelated to S04.
- **Template IDs start at 9**: Auto-increment doesn't reset after `deleteMany()` in seed script. Cosmetic only.

## Follow-ups

- S05 needs `encodeDesign` for order serialization and template context for the order flow
- S06 needs Template API for admin CRUD and will implement user-submitted design approval
- Production deployment (S07) may need PostgreSQL switch — D024 documents the adapter swap path

## Files Created/Modified

- `src/lib/serialization.ts` — encodeDesign and decodeDesign pure functions
- `src/lib/__tests__/serialization.test.ts` — 13 serialization tests (round-trips, error handling, edge cases)
- `src/types/bead.ts` — SerializableDesign interface
- `src/stores/useDesignStore.ts` — loadFromCatalogIds and clearDesign actions
- `prisma/seed.ts` — 8 pre-made templates with Russian names, idempotent deleteMany+insert
- `src/lib/prisma.ts` — Prisma client singleton with LibSql adapter (pre-existing, verified)
- `prisma/schema.prisma` — Template model (pre-existing, verified)
- `src/app/api/templates/route.ts` — GET approved templates endpoint
- `src/app/api/templates/[code]/route.ts` — GET template by designCode endpoint
- `src/app/design/[code]/page.tsx` — Server Component for share page route
- `src/components/editor/DesignLoader.tsx` — Client boundary: loading/error/loaded states
- `src/app/editor/page.tsx` — Blank editor page with clearDesign on mount
- `src/components/editor/EditorToolbar.tsx` — Added "Поделиться" share button
- `src/components/templates/TemplateCard.tsx` — Template card with colored-dot preview
- `src/components/templates/TemplateBrowser.tsx` — Horizontal-scroll gallery with loading/error states
- `src/app/page.tsx` — Redesigned home page with hero + template browser
- `package.json` — Added lz-string + @types/lz-string dependencies

## Forward Intelligence

### What the next slice should know
- `encodeDesign(beads)` extracts `catalogBeadId` from each bead — beads without catalog IDs are silently skipped. This means only catalog-sourced beads survive serialization. If S05 needs to serialize designs with non-catalog beads (e.g., custom colors), the wire format supports extension via version bump.
- The `SerializableDesign` format is `{ v: 1, p: "pacifier-holder", b: string[] }`. The `p` field enables future product types (R012). The `v` field enables format migration.
- `loadFromCatalogIds` in the store clears existing beads then appends — it's a destructive load, not a merge. S05 order creation should call `encodeDesign` on current store state before any navigation.
- Template design codes contain `+` characters from lz-string that must be URL-encoded (`%2B`) in path segments. The `decodeDesign` function handles this with `decodeURIComponent()` before decompression.

### What's fragile
- **Clipboard API availability**: `navigator.clipboard.writeText` requires HTTPS or localhost. On HTTP or in iframe contexts, it will fail silently. The share button catches errors and logs to console, but the UI only shows "Скопировано!" on success — no visible error toast.
- **Seed script idempotency**: The `deleteMany` + insert pattern works but means template IDs increment on every re-seed. If any other code references template by ID (not designCode), it could break after re-seeding.

### Authoritative diagnostics
- `useDesignStore.getState().beads` in browser console — verify loaded design after any navigation
- `encodeDesign(useDesignStore.getState().beads)` — generate a design code from current state
- `decodeDesign(code)` — test any design code manually
- `GET /api/templates` — verify database state and template list
- `npx prisma db seed` — reset and re-seed templates

### What assumptions changed
- **Database provider**: Original plan assumed PostgreSQL (D004), but S02 established SQLite with LibSql adapter as the local dev database (D024). PostgreSQL is still planned for production — the Prisma schema is provider-agnostic and the adapter swap is documented.
