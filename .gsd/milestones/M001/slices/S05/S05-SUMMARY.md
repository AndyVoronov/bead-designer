---
id: S05
parent: M001
milestone: M001
provides:
  - Order model in Prisma schema with migration (id, designCode, designState, status, beadCount, createdAt)
  - POST /api/orders endpoint — creates order with validation and error handling, returns 201
  - GET /api/orders endpoint — lists all orders ordered by createdAt desc
  - generateTelegramLink(designCode, beadCount) pure function — Telegram deep link with encoded Russian message
  - 7 unit tests for Telegram link generator
  - "Заказать" CTA button in EditorToolbar with full order flow (encode → POST → Telegram redirect)
  - Double-submit protection (isOrdering disabled state) and error feedback (3s auto-clear)
requires:
  - slice: S04
    provides: encodeDesign from src/lib/serialization.ts, useDesignStore from src/stores/useDesignStore.ts, EditorToolbar component from src/components/editor/EditorToolbar.tsx
affects:
  - S06 (Order API endpoints consumed by admin panel for viewing/managing orders)
key_files:
  - prisma/schema.prisma
  - prisma/migrations/20260330135818_add_order_model/migration.sql
  - src/app/api/orders/route.ts
  - src/lib/telegram.ts
  - src/lib/__tests__/telegram.test.ts
  - src/components/editor/EditorToolbar.tsx
key_decisions:
  - Stored designState as String (JSON.stringify) not Json type for SQLite compatibility
  - designState in POST payload is JSON.stringify({ designCode, beadCount }) — minimal, sufficient for S06 admin view
  - Full-width green CTA above action row in flex-col toolbar layout to avoid 5-button mobile overflow
  - Error feedback shown as button text for 3 seconds (consistent with "Скопировано!" share pattern)
patterns_established:
  - API route pattern: POST creates resource with 201 + validation (400) + try/catch (500), GET returns array with orderBy desc
  - Async action pattern in UI: useCallback with dependency on store state, isOrdering disabled state, orderError auto-clear via useEffect timeout
  - Full-width CTA pattern: primary action button above utility buttons in flex-col toolbar
observability_surfaces:
  - GET /api/orders returns all orders as JSON array for inspection
  - console.error in catch blocks on both client and server
  - 400 JSON on missing fields, 500 JSON on DB errors
  - Button text changes to error message for 3s on failure
  - npx prisma studio for visual DB inspection of Order table
drill_down_paths:
  - .gsd/milestones/M001/slices/S05/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S05/tasks/T02-SUMMARY.md
duration: ~25m
verification_result: passed
completed_at: 2026-03-30T05:53:00Z
---

# S05: Заказ + Telegram

**Full order cycle: "Заказать" button encodes design, persists to SQLite via POST /api/orders, and opens Telegram with pre-filled Russian message — zero friction, one-tap conversion.**

## What Happened

T01 established the backend foundation: added the `Order` model to Prisma schema with fields id (autoincrement), designCode (unique), designState (String for SQLite compat), status (default "new"), beadCount (Int), and createdAt. Ran `npx prisma migrate dev --name add_order_model`. Created `src/lib/telegram.ts` with `generateTelegramLink(designCode, beadCount)` — a pure function producing `https://t.me/VoronovAndrey?text=...` with encodeURIComponent-encoded Russian text per D008. Built POST/GET handlers in `src/app/api/orders/route.ts` following the existing templates route pattern: POST validates designCode+beadCount (400 on missing), creates order (201), GET returns all orders desc by createdAt. Wrote 7 unit tests covering URL format, Russian encoding, special characters, zero count, and newlines.

T02 closed the loop on the client side. Added a full-width green (#10b981) "Заказать" CTA button to EditorToolbar above the existing action row (flex-col layout restructure to avoid 5-button overflow on mobile). Button is disabled (opacity-30) when `beads.length === 0`. On click: `encodeDesign(beads)` → POST `/api/orders` → `window.open(generateTelegramLink(...))`. Double-submit protection via `isOrdering` boolean that disables the button during fetch. Error feedback shown as button text for 3 seconds (matching the existing "Скопировано!" pattern). Verified end-to-end in browser: add 3 catalog beads → click "Заказать" → order appears in DB with status "new" → Telegram opens with correct pre-filled message.

Had to clear `.next` cache after `prisma generate` due to Turbopack caching stale Prisma client types.

## Verification

All slice-level verification checks pass:

| # | Check | Result |
|---|-------|--------|
| 1 | `npx vitest run` — 64 tests pass (6 files) | ✅ |
| 2 | `npx tsc --noEmit` — zero errors | ✅ |
| 3 | `npm run build` — production build succeeds | ✅ |
| 4 | Browser: GET /api/orders returns `[]` initially | ✅ |
| 5 | Browser: POST /api/orders creates order (201, status "new") | ✅ |
| 6 | Browser: GET /api/orders returns created order | ✅ |
| 7 | Browser: "Заказать" disabled when 0 beads (opacity 0.3) | ✅ |
| 8 | Browser: "Заказать" enabled after adding 3+ beads | ✅ |
| 9 | Browser: click → order in DB → Telegram link correct format | ✅ |
| 10 | Browser: mobile viewport (390×844) toolbar no overflow | ✅ |

## New Requirements Surfaced

None.

## Deviations

None — implementation matched the task plan exactly.

## Known Limitations

- designState in POST payload is a minimal `{ designCode, beadCount }` JSON, not the full bead array. S06 admin panel may need richer state for order detail view.
- No user identification on orders — orders are anonymous (no PII per plan). S06 admin panel will show orders without customer info.
- No rate limiting on POST /api/orders — a malicious client could spam orders. Acceptable for MVP.

## Follow-ups

None — S05 deliverables are complete and ready for S06 consumption.

## Files Created/Modified

- `prisma/schema.prisma` — Added Order model (id, designCode, designState, status, beadCount, createdAt)
- `prisma/migrations/20260330135818_add_order_model/migration.sql` — Migration creating Order table with unique index on designCode
- `src/app/api/orders/route.ts` — POST + GET handlers for order creation and listing
- `src/lib/telegram.ts` — generateTelegramLink pure function for Telegram deep links
- `src/lib/__tests__/telegram.test.ts` — 7 unit tests (URL format, encoding, edge cases)
- `src/components/editor/EditorToolbar.tsx` — Added "Заказать" CTA with full order flow, flex-col layout restructure

## Forward Intelligence

### What the next slice should know
- Order API is ready for S06 admin consumption: GET /api/orders returns all orders (for order list page), PATCH will need to be added for status changes (new → processing → completed).
- The Order model uses `status` as a plain String with default "new". S06 admin panel should define valid statuses and add PATCH /api/orders/[id]/status.
- designState is currently `JSON.stringify({ designCode, beadCount })` — minimal. If S06 needs to show the actual bead arrangement in the order detail view, the order creation should store the full design state (the encoded bead array from `encodeDesign`).

### What's fragile
- `.next` cache can become stale after `prisma generate` — Turbopack caches Prisma client types. Clear `.next` if you see type errors after schema changes.

### Authoritative diagnostics
- GET /api/orders — returns all orders as JSON, newest first. Trustworthy signal: directly reads from SQLite.
- npx prisma studio — visual DB browser for Order table inspection.
- console.error in both client (EditorToolbar catch) and server (API route catch) for failure visibility.

### What assumptions changed
- None. S05 matched its plan exactly.
