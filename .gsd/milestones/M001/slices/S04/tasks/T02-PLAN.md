---
estimated_steps: 9
estimated_files: 7
---

# T02: Prisma + Template model + seed + API routes

**Slice:** S04 — Шаблоны + шеринг
**Milestone:** M001

## Description

Activate the database layer for the first time. Install Prisma, add the Template model to the existing schema, run the first migration, seed 5–8 pre-made templates (using the serializer from T01 to generate design codes), and create the API routes that serve template data to the frontend. This is the heaviest task — it requires a running PostgreSQL instance.

**IMPORTANT — PostgreSQL prerequisite:** This task needs a running PostgreSQL database. Before starting:
1. Check if PostgreSQL is accessible: `psql -U postgres -c "SELECT 1"` or check if Docker is available: `docker --version`
2. If Docker is available: `docker run -d --name bead-pg -p 5432:5432 -e POSTGRES_DB=beaddesigner -e POSTGRES_PASSWORD=devpassword postgres:16-alpine`
3. If neither is available, ask the user to provide a DATABASE_URL string for an accessible PostgreSQL instance
4. Set `DATABASE_URL=postgresql://postgres:devpassword@localhost:5432/beaddesigner` in `.env`

**Windows note:** Run `npm run dev` and `npx prisma` commands from the real filesystem path, NOT the junction path (D015). Use `pwd` to check and `cd` to the real path if needed. The executor should detect this automatically.

## Steps

1. Install dependencies: `npm install prisma @prisma/client && npm install -D @types/node ts-node`
2. Ensure `DATABASE_URL` is set in `.env` (see prerequisite above)
3. Update `prisma/schema.prisma` — add Template model:
   ```prisma
   model Template {
     id              Int       @id @default(autoincrement())
     name            String
     designCode      String    @unique
     beadCount       Int
     isApproved      Boolean   @default(true)
     isUserSubmitted Boolean   @default(false)
     createdAt       DateTime  @default(now())
   }
   ```
   Remove the TODO comment. Keep the existing Bead model (used by S06).
4. Run `npx prisma migrate dev --name init-templates` to create the migration and generate the client
5. Create `src/lib/prisma.ts` — standard Next.js singleton pattern:
   ```ts
   import { PrismaClient } from "@prisma/client";
   const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
   export const prisma = globalForPrisma.prisma || new PrismaClient();
   if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
   ```
6. Create `prisma/seed.ts` — seed 5–8 templates using `encodeDesign` from T01:
   - Import `CATALOG_BEADS` from `@/data/catalogBeads` (may need path adjustment for seed script — use relative paths)
   - Import `encodeDesign` from serialization (same path consideration)
   - Define 5–8 template designs as arrays of `catalogBeadId` strings (use real IDs from CATALOG_BEADS like "cb-001", "cb-025", etc.)
   - For each, create a `BeadState[]` via `catalogBeadToBeadState`, then `encodeDesign()` to get the design code
   - Use `prisma.template.create()` for each template
   - Add `"prisma": { "seed": "npx tsx prisma/seed.ts" }` to package.json (tsx is simpler than ts-node for ESM)
   - Install tsx: `npm install -D tsx`
   - Run `npx prisma db seed`
7. Create `src/app/api/templates/route.ts` — GET handler:
   ```ts
   import { NextResponse } from "next/server";
   import { prisma } from "@/lib/prisma";
   export async function GET() {
     const templates = await prisma.template.findMany({
       where: { isApproved: true },
       orderBy: { createdAt: "desc" },
     });
     return NextResponse.json(templates);
   }
   ```
8. Create `src/app/api/templates/[code]/route.ts` — GET handler:
   ```ts
   import { NextResponse } from "next/server";
   import { prisma } from "@/lib/prisma";
   export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
     const { code } = await params;
     const template = await prisma.template.findUnique({ where: { designCode: code } });
     if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
     return NextResponse.json(template);
   }
   ```
9. Test API endpoints: start dev server, verify `GET /api/templates` returns JSON array, verify `GET /api/templates/<code>` returns single template

**Relevant skills:** `test` skill for test patterns if adding API route tests.

## Must-Haves

- [ ] Prisma migration runs successfully against PostgreSQL
- [ ] Template model created with all required fields (name, designCode, beadCount, isApproved, isUserSubmitted, createdAt)
- [ ] 5–8 templates seeded in the database with valid design codes
- [ ] `src/lib/prisma.ts` singleton prevents HMR connection leaks
- [ ] `GET /api/templates` returns approved templates as JSON array
- [ ] `GET /api/templates/[code]` returns template by designCode or 404
- [ ] Next.js 16 `params` as Promise pattern used correctly in dynamic route

## Verification

- `npx prisma migrate status` — migration applied, no drift
- `npx prisma db seed` — seeds without errors
- `curl http://localhost:3000/api/templates` — returns JSON array with 5–8 templates
- `curl http://localhost:3000/api/templates/<any-code-from-list>` — returns single template JSON
- `npm run build` — no build errors from new API routes

## Observability Impact

- Signals added/changed: API route responses (200 with template data, 404 for not found), Prisma query logging (default to console in dev)
- How a future agent inspects this: `GET /api/templates` in browser, `npx prisma studio` for visual DB inspection, `useDesignStore.getState()` in console for loaded design state
- Failure state exposed: 500 errors from Prisma connection failures (DATABASE_URL misconfigured), 404 for unknown design codes, seed script errors printed to stderr

## Inputs

- `prisma/schema.prisma` — existing schema with Bead model, add Template model
- `src/lib/serialization.ts` — encodeDesign used by seed script to generate design codes
- `src/data/catalogBeads.ts` — CATALOG_BEADS used by seed script to pick bead IDs
- `src/lib/catalogUtils.ts` — catalogBeadToBeadState used by seed script
- `.env` — DATABASE_URL must be set
- `package.json` — add prisma deps and seed config

## Expected Output

- `prisma/schema.prisma` — updated with Template model
- `src/lib/prisma.ts` — Prisma client singleton
- `prisma/seed.ts` — seed script with 5–8 templates
- `src/app/api/templates/route.ts` — GET /api/templates handler
- `src/app/api/templates/[code]/route.ts` — GET /api/templates/[code] handler
- `prisma/migrations/` — initial template migration
- `package.json` — prisma deps, tsx devDep, seed config
