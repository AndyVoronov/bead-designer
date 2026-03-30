---
estimated_steps: 7
estimated_files: 7
---

# T01: Migrate to PostgreSQL + standalone output

**Slice:** S07 — Интеграция + деплой
**Milestone:** M001

## Description

Switch the application from SQLite (libsql adapter) to PostgreSQL (PrismaPg adapter) and configure Next.js for standalone output mode. This prepares the app for production deployment on a VPS with PostgreSQL.

The current setup uses `@prisma/adapter-libsql` with `provider = "sqlite"` in schema.prisma (D024). Production requires PostgreSQL (D004). Tests don't hit the database — they test serialization, stores, catalog data, and UI components — so the migration won't break the 64 existing tests.

**Important:** Do NOT run `prisma migrate dev` or `prisma db push` — there's no local PostgreSQL available (D024). The VPS provisioning script (T02) handles schema application. Just change the schema and adapter code.

## Steps

1. Install PostgreSQL adapter dependencies:
   ```
   npm install @prisma/adapter-pg pg
   npm install -D @types/pg
   ```

2. Update `prisma/schema.prisma`: Change `provider = "sqlite"` to `provider = "postgresql"`. Remove `@default(autoincrement())` if present (PostgreSQL uses `@default(autoincrement())` or `@id @default(sequence())` — actually `autoincrement()` works for both SQLite and PostgreSQL in Prisma, so keep it as-is). No other schema changes needed.

3. Delete existing SQLite migrations — they're incompatible with PostgreSQL:
   ```
   rm -rf prisma/migrations/
   ```

4. Update `src/lib/prisma.ts`:
   - Remove `PrismaLibSql` import from `@prisma/adapter-libsql`
   - Add `import { PrismaPg } from "@prisma/adapter-pg"` and `import { Pool } from "pg"`
   - Create a `pg.Pool` instance (lazy, with DATABASE_URL from env)
   - Pass `new PrismaPg(pool)` as the adapter to PrismaClient
   - Keep the global singleton pattern for hot reload in dev
   - Pool should be created outside the singleton guard (it's lightweight)

5. Update `prisma/seed.ts`:
   - Remove `PrismaLibSql` import from `@prisma/adapter-libsql`
   - Add `import { PrismaPg } from "@prisma/adapter-pg"` and `import { Pool } from "pg"`
   - Replace adapter creation with `new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL }))`

6. Add `output: 'standalone'` to `next.config.ts`:
   ```typescript
   const nextConfig: NextConfig = {
     transpilePackages: ["meshline"],
     turbopack: {},
     output: 'standalone',
   };
   ```
   Note: No need for `experimental.outputFileTracing` — Next.js 16 standalone handles this natively.

7. Create `.env.production` template with PostgreSQL connection placeholders:
   ```
   DATABASE_URL=postgresql://beaduser:CHANGE_ME@localhost:5432/beaddesigner
   ADMIN_PASSWORD=CHANGE_ME_TO_SECURE_PASSWORD
   NODE_ENV=production
   ```
   Also create `.env.example` with the same template (both are in .gitignore — .env.example is explicitly allowed via `!.env.example`).

## Must-Haves

- [ ] `prisma/schema.prisma` has `provider = "postgresql"`
- [ ] `src/lib/prisma.ts` uses `PrismaPg` from `@prisma/adapter-pg` (not PrismaLibSql)
- [ ] `prisma/seed.ts` uses `PrismaPg` adapter
- [ ] No references to `@prisma/adapter-libsql` remain in source files
- [ ] `next.config.ts` has `output: 'standalone'`
- [ ] `.env.production` and `.env.example` exist with PostgreSQL URL template
- [ ] `prisma/migrations/` directory is removed (old SQLite migrations gone)
- [ ] `npm run build` succeeds with standalone output

## Verification

- `npx tsc --noEmit` — zero TypeScript errors
- `npx vitest run` — all 64 tests pass (tests don't connect to DB)
- `npm run build` — succeeds; `.next/standalone/` directory exists
- `! grep -r "adapter-libsql" src/ prisma/ --include="*.ts"` — no remaining libsql references

## Inputs

- `prisma/schema.prisma` — current SQLite schema to migrate to PostgreSQL
- `src/lib/prisma.ts` — current PrismaLibSql adapter to swap to PrismaPg
- `prisma/seed.ts` — current seed script using PrismaLibSql adapter
- `prisma.config.ts` — Prisma 7 config (no changes needed — reads DATABASE_URL from env)
- `next.config.ts` — current Next.js config to add standalone output
- `package.json` — add @prisma/adapter-pg + pg dependencies
- `.env` — reference for current env vars (DATABASE_URL, ADMIN_PASSWORD)

## Expected Output

- `prisma/schema.prisma` — provider changed to "postgresql"
- `src/lib/prisma.ts` — PrismaPg adapter with pg Pool
- `prisma/seed.ts` — PrismaPg adapter for seeding
- `next.config.ts` — output: 'standalone' added
- `package.json` — @prisma/adapter-pg + pg + @types/pg added
- `.env.production` — PostgreSQL connection template for VPS
- `.env.example` — PostgreSQL connection template for documentation
