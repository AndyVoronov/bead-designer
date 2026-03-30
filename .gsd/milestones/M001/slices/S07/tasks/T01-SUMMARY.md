---
id: T01
parent: S07
milestone: M001
provides:
  - PostgreSQL adapter in prisma.ts and seed.ts
  - Standalone output mode for production deployment
  - .env.production and .env.example templates
  - Removed SQLite adapter dependencies and migrations
key_files:
  - prisma/schema.prisma
  - src/lib/prisma.ts
  - prisma/seed.ts
  - next.config.ts
  - package.json
  - .env.production
  - .env.example
key_decisions:
  - Used pg.Pool with DATABASE_URL for PrismaPg adapter, pool created outside singleton guard
  - Uninstalled @prisma/adapter-libsql and @libsql/client to avoid dead dependencies
  - Deleted all SQLite migrations — VPS provisioning script (T02) will apply schema fresh
patterns_established:
  - DATABASE_URL must be a PostgreSQL connection string for all prisma commands (generate, db push, seed, runtime)
  - Prisma generate must be run with a valid PostgreSQL URL format (not SQLite) after schema changes
observability_surfaces:
  - PrismaClient initialization will fail at startup with clear error if DATABASE_URL is invalid or unreachable
  - Build-time error if generated client schema doesn't match runtime adapter type
duration: 12m
verification_result: passed
completed_at: 2026-03-30T09:46:00+09:00
blocker_discovered: false
---

# T01: Migrate to PostgreSQL + standalone output

**Migrated database adapter from SQLite (libsql) to PostgreSQL (PrismaPg) and enabled Next.js standalone output for VPS deployment.**

## What Happened

Swapped the Prisma adapter from `@prisma/adapter-libsql` to `@prisma/adapter-pg` with a `pg.Pool` connection. Updated `prisma/schema.prisma` provider from `"sqlite"` to `"postgresql"`. Regenerated the Prisma client with a PostgreSQL-format DATABASE_URL. Removed old SQLite migrations (incompatible with PostgreSQL). Added `output: 'standalone'` to Next.js config. Created `.env.production` and `.env.example` templates with PostgreSQL connection placeholders. Uninstalled `@prisma/adapter-libsql` and `@libsql/client` from dependencies.

Build initially failed because the generated Prisma client still had SQLite provider baked in. Fixed by running `prisma generate` with a PostgreSQL-format DATABASE_URL override. After regeneration, build succeeded with all 16 routes and standalone output.

## Verification

- TypeScript: zero errors with `npx tsc --noEmit`
- Tests: all 64 tests pass with `npx vitest run` (tests don't connect to DB, unaffected by adapter change)
- Build: succeeds with `npm run build`, produces `.next/standalone/` directory with all 16 routes
- No remaining libsql references: `grep -r "adapter-libsql" src/ prisma/` returns nothing

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | ~5s |
| 2 | `npx vitest run` | 0 | ✅ pass (64/64) | ~5s |
| 3 | `npm run build` | 0 | ✅ pass (16 routes, standalone) | ~15s |
| 4 | `grep -r "adapter-libsql" src/ prisma/` | 1 | ✅ pass (no matches) | <1s |

## Diagnostics

- **PrismaClient startup**: Will throw `PrismaClientInitializationError` if DATABASE_URL is not a valid PostgreSQL connection string or the database is unreachable
- **Build failure signal**: If generated client schema doesn't match adapter type, Next.js build fails with `PrismaClientInitializationError` during page data collection
- **prisma generate**: Must be run with `DATABASE_URL=postgresql://...` format — SQLite format causes client/schema mismatch

## Deviations

- Uninstalled `@prisma/adapter-libsql` and `@libsql/client` from package.json (plan mentioned removing references but not explicitly uninstalling the packages)
- Had to regenerate Prisma client after schema change — not mentioned in plan steps but necessary for build to succeed

## Known Issues

- The `.env` file still contains `DATABASE_URL=file:./dev.db` (SQLite format). Running `npx prisma generate` without a DATABASE_URL override will produce a client mismatched with the PostgreSQL schema. The VPS deploy script (T02) must ensure DATABASE_URL is set to PostgreSQL format before any prisma commands.

## Files Created/Modified

- `prisma/schema.prisma` — Changed `provider = "sqlite"` to `provider = "postgresql"`
- `src/lib/prisma.ts` — Replaced PrismaLibSql with PrismaPg + pg.Pool adapter
- `prisma/seed.ts` — Replaced PrismaLibSql with PrismaPg + pg.Pool adapter
- `next.config.ts` — Added `output: 'standalone'`
- `package.json` — Added `@prisma/adapter-pg`, `pg`; added `@types/pg` to devDeps; removed `@prisma/adapter-libsql`, `@libsql/client`
- `.env.production` — Created with PostgreSQL connection template
- `.env.example` — Created with PostgreSQL connection template
- `prisma/migrations/` — Deleted (old SQLite migrations)
- `.gsd/milestones/M001/slices/S07/tasks/T01-PLAN.md` — Added `## Observability Impact` section
