---
id: T01
parent: S05
milestone: M001
provides:
  - Order model in Prisma schema with migration
  - POST /api/orders endpoint for creating orders
  - GET /api/orders endpoint for listing orders
  - generateTelegramLink pure function for Telegram deep links
  - Unit tests for Telegram link generator
key_files:
  - prisma/schema.prisma
  - prisma/migrations/20260330135818_add_order_model/migration.sql
  - src/app/api/orders/route.ts
  - src/lib/telegram.ts
  - src/lib/__tests__/telegram.test.ts
key_decisions:
  - Stored designState as String (not Json type) for SQLite compatibility per plan
  - Added input validation (400) and error handling (500) with console.error in API route
patterns_established:
  - API route pattern: POST creates resource with 201, GET returns array with orderBy desc
  - Error handling: try/catch with console.error + JSON error response
observability_surfaces:
  - GET /api/orders returns all orders for inspection
  - console.error in catch blocks for server-side diagnostics
  - 400 JSON on missing fields, 500 JSON on DB errors
duration: ~15m
verification_result: passed
completed_at: 2026-03-30T05:01:00Z
blocker_discovered: false
---

# T01: Order model, API endpoints, and Telegram link generator

**Added Order model to Prisma schema, applied migration, created POST/GET /api/orders endpoints and Telegram deep link generator with 7 unit tests.**

## What Happened

Added the `Order` model to `prisma/schema.prisma` with fields: id (autoincrement), designCode (unique), designState (String for SQLite compat), status (default "new"), beadCount (Int), createdAt. Ran `npx prisma migrate dev --name add-order-model` which created the migration `20260330135818_add_order_model` and applied it to SQLite.

Created `src/lib/telegram.ts` with `generateTelegramLink(designCode, beadCount)` — a pure function producing `https://t.me/VoronovAndrey?text=...` with encodeURIComponent-encoded Russian message text (per D008).

Created `src/app/api/orders/route.ts` following the templates route pattern: POST validates designCode+beadCount, creates order with status "new" via Prisma, returns 201. GET returns all orders ordered by createdAt desc. Both have try/catch with console.error and JSON error responses.

Wrote 7 unit tests in `src/lib/__tests__/telegram.test.ts` covering: URL format, Russian text encoding, design code presence, bead count presence, special character handling, zero bead count, and newline encoding.

Build required clearing `.next` cache after `prisma generate` because Turbopack cached stale Prisma client types. Dev server required running from real path `C:\Users\Andy\.gsd\projects\...` (D015 — Windows junction path corruption).

## Verification

- All 64 tests pass (7 new telegram + 57 existing)
- TypeScript clean (tsc --noEmit: 0 errors)
- Production build succeeds
- Browser: GET /api/orders returns `[]` initially
- Browser: POST /api/orders with `{"designCode":"test-order-001","beadCount":3}` returns order object with id=1, status="new", createdAt
- Browser: GET /api/orders after POST returns array containing the created order

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run` | 0 | ✅ pass | 4.1s |
| 2 | `npx tsc --noEmit` | 0 | ✅ pass | 4.6s |
| 3 | `npm run build` | 0 | ✅ pass | 6.5s |
| 4 | Browser GET /api/orders → `[]` | 200 | ✅ pass | <1s |
| 5 | Browser POST /api/orders → order object | 201 | ✅ pass | <1s |
| 6 | Browser GET /api/orders → array with order | 200 | ✅ pass | <1s |

## Diagnostics

- `GET /api/orders` — returns all orders as JSON array, newest first
- `npx prisma studio` — visual DB browser for inspecting Order table
- console.error in catch blocks — server-side error logging for 500 responses
- 400 response with `{ error: "designCode and beadCount are required" }` on validation failure

## Deviations

None — implemented exactly as planned.

## Known Issues

None.

## Files Created/Modified

- `prisma/schema.prisma` — Added Order model with id, designCode, designState, status, beadCount, createdAt
- `prisma/migrations/20260330135818_add_order_model/migration.sql` — Migration creating Order table with unique index on designCode
- `src/app/api/orders/route.ts` — POST + GET handlers for order creation and listing
- `src/lib/telegram.ts` — generateTelegramLink pure function for Telegram deep links
- `src/lib/__tests__/telegram.test.ts` — 7 unit tests covering URL format, encoding, and edge cases
- `.gsd/milestones/M001/slices/S05/tasks/T01-PLAN.md` — Added Observability Impact section (pre-flight fix)
