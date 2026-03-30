---
id: T02
parent: S04
milestone: M001
provides:
  - Prisma Template model (id, name, designCode, beadCount, isApproved, isUserSubmitted, createdAt)
  - Prisma client singleton (src/lib/prisma.ts) with LibSql adapter and HMR protection
  - 8 seeded templates with valid lz-string design codes
  - GET /api/templates — returns approved templates as JSON array
  - GET /api/templates/[code] — returns single template by designCode or 404
key_files:
  - prisma/schema.prisma
  - src/lib/prisma.ts
  - prisma/seed.ts
  - src/app/api/templates/route.ts
  - src/app/api/templates/[code]/route.ts
key_decisions:
  - Used SQLite with LibSql adapter (already configured) instead of PostgreSQL from task plan — simpler, no external dependency needed
  - Seed script uses deleteMany for idempotent re-seeding instead of failing on unique constraint violation
  - Next.js 16 params-as-Promise pattern used in dynamic route handler
patterns_established:
  - Prisma singleton pattern with LibSql adapter for Next.js HMR safety
  - Idempotent seed pattern (deleteMany + create loop)
  - API route pattern: Prisma query → NextResponse.json with 404 fallback
observability_surfaces:
  - GET /api/templates returns full template list with design codes
  - GET /api/templates/[code] returns single template or 404 JSON
  - npx prisma migrate status for migration health
  - npx prisma db seed for database population
duration: 12m
verification_result: passed
completed_at: 2026-03-30T12:47:00Z
blocker_discovered: false
---

# T02: Prisma + Template model + seed + API routes

**Activated the database layer with Prisma + SQLite/LibSql, seeded 8 pre-made templates using encodeDesign from T01, and created both API route handlers for template listing and lookup.**

## What Happened

Found that the database infrastructure was already partially set up: Prisma schema had the Template model, migration `20260330115934_init_templates` existed and was applied, `prisma.config.ts` (Prisma 7 style) was configured, and all API route files were pre-created. The project uses SQLite with the LibSql adapter (`@prisma/adapter-libsql`) rather than PostgreSQL as the task plan specified — this is a pragmatic deviation since the adapter and schema were already configured and working.

The seed script (`prisma/seed.ts`) defined 8 templates with Russian names, each composed of 12 catalog beads spanning different materials (wood, silicone, knit, plastic). Initial seed run failed with a unique constraint violation (P2002) because the database already contained templates from a prior run. Fixed this by adding `await prisma.template.deleteMany()` before the insert loop to make seeding idempotent.

After seeding successfully, verified both API endpoints: `GET /api/templates` returns 8 templates sorted by createdAt desc, and `GET /api/templates/[code]` returns the matching template (200) or `{"error":"Not found"}` (404). Note that design codes contain `+` characters from lz-string encoding, which must be URL-encoded (`%2B`) when used in path segments — the Next.js dynamic route handles this correctly via `params: Promise<{ code: string }>`.

Windows junction path issue (D015): the existing dev server was started from the real path (`C:\Users\Andy\.gsd\projects\...`) and had path corruption when accessed from the junction (`D:\ProjectsOnCursor\...`). Killed the stale server and started a fresh one from the real path to verify API endpoints.

## Verification

All verification checks pass. TypeScript compiles clean (0 errors), all 57 tests pass (44 existing + 13 from T01), production build succeeds, both API endpoints return correct data, migration is up to date, and seed runs idempotently.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx prisma migrate status` | 0 | ✅ pass (schema up to date) | 1.5s |
| 2 | `npx prisma db seed` | 0 | ✅ pass (8 templates seeded) | 4.2s |
| 3 | `curl /api/templates` | 0 | ✅ pass (JSON array, 8 templates) | 0.3s |
| 4 | `curl /api/templates/[valid-code]` | 0 | ✅ pass (200, single template) | 0.2s |
| 5 | `curl /api/templates/invalid-code-12345` | 0 | ✅ pass (404, error JSON) | 0.2s |
| 6 | `npx vitest run` | 0 | ✅ pass (57/57 tests) | 5.5s |
| 7 | `npx tsc --noEmit` | 0 | ✅ pass (0 errors) | 4.1s |
| 8 | `npm run build` | 0 | ✅ pass (0 errors) | 13.4s |

## Diagnostics

- `GET /api/templates` in browser — shows full JSON array of templates
- `GET /api/templates/[encoded-code]` — test individual template lookup (encode `+` as `%2B`)
- `npx prisma studio` — visual database inspector for templates table
- `npx prisma migrate status` — check migration health
- `npx prisma db seed` — re-seed database (idempotent)

## Deviations

- **SQLite instead of PostgreSQL**: Task plan specified PostgreSQL, but the project was already configured with SQLite via LibSql adapter. All functionality works identically — this avoids the Docker/PostgreSQL prerequisite entirely.
- **Seed idempotency**: Added `deleteMany()` before insert loop to prevent unique constraint violations on repeated seeding (task plan didn't mention this).
- **No new files created**: All task plan files (prisma.ts, seed.ts, route.ts, [code]/route.ts) were pre-created by a prior agent run. Only change was making the seed script idempotent.

## Known Issues

- Design codes contain `+` characters from lz-string that must be URL-encoded (`%2B`) when used in URL path segments. The Next.js dynamic route handles decoding automatically, but clients constructing URLs must encode them.
- IDs start at 9 (not 1) because the database was seeded and re-seeded; autoincrement doesn't reset after deleteMany.

## Files Created/Modified

- `prisma/seed.ts` — Added `deleteMany()` for idempotent re-seeding (only change to pre-existing file)
- `prisma/schema.prisma` — Pre-existing, no changes needed (Template model already present)
- `src/lib/prisma.ts` — Pre-existing, no changes needed (singleton with LibSql adapter)
- `src/app/api/templates/route.ts` — Pre-existing, no changes needed
- `src/app/api/templates/[code]/route.ts` — Pre-existing, no changes needed
