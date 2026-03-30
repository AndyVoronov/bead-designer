---
id: T02
parent: S06
milestone: M001
provides:
  - Admin template API: GET all templates (including unapproved), POST create, PATCH update, DELETE
  - Admin order API: GET all orders, PATCH order status with validation
  - Templates management page: table with approve/unapprove toggle, create form, delete with confirmation
  - Orders management page: table with status badges, status dropdown, promote-to-template action
key_files:
  - src/app/api/admin/templates/route.ts
  - src/app/api/admin/templates/[id]/route.ts
  - src/app/api/admin/orders/route.ts
  - src/app/api/admin/orders/[id]/status/route.ts
  - src/app/admin/templates/page.tsx
  - src/app/admin/orders/page.tsx
key_decisions:
  - Admin template routes return ALL templates (no isApproved filter), unlike public endpoint
  - Promote-to-template creates approved template with beadCount: 0 from order's designCode
  - Order status validation against hardcoded array ["new", "processing", "completed"]
  - Dynamic route params use Next.js 16 Promise-based params pattern with await
patterns_established:
  - Admin CRUD pattern: try/catch + console.error for all API routes
  - Admin page pattern: useEffect + fetch on mount, refresh after every mutation
  - Collapsible create form pattern with state toggle
observability_surfaces:
  - GET /api/admin/templates shows all templates as JSON (including unapproved)
  - GET /api/admin/orders shows all orders as JSON with status/state
  - 400 JSON on invalid input (missing fields, invalid status)
  - 500 JSON + console.error on DB errors
  - Browser Network tab shows all mutation requests/responses
duration: ~20m
verification_result: passed
completed_at: 2026-03-30T09:20:00+09:00
blocker_discovered: false
---

# T02: Admin API routes + Templates + Orders pages

**Created all admin API routes (templates CRUD, orders list + status change) and two management UI pages with full CRUD operations, approve/unapprove toggle, status management, and promote-to-template workflow.**

## What Happened

All 6 files were created from scratch following existing codebase patterns. API routes use the `prisma` singleton from `@/lib/prisma`, `NextResponse.json` for responses, and try/catch with `console.error` for error handling. The proxy.ts from T01 already guards all `/api/admin/*` routes with httpOnly cookie auth, so no additional auth logic was needed in the API routes.

Key implementation details:
- **Admin template GET** returns ALL templates (no `isApproved` filter), unlike the public endpoint which only returns approved ones
- **Dynamic route params** use Next.js 16's `Promise<{ id: string }>` pattern with `await params`
- **Orders page** fetches template design codes to disable the "Сделать шаблоном" button when a template already exists for that order's design code
- **Status validation** uses a hardcoded `VALID_STATUSES` array for the order status endpoint
- **Promote-to-template** creates an approved template with `beadCount: 0` — the bead count isn't available from the Order's designCode alone

Browser verification confirmed all features:
- 8 seeded templates displayed with correct approve badges
- Approve/unapprove toggle flips status instantly (verified by toggling template #8)
- Create form adds new template to list (tested "Тестовый шаблон")
- Delete with confirmation removes template from list (verified count 8→9→8)
- Orders page shows order with colored status badges
- Status dropdown changes order status and persists (new → processing)
- "Сделать шаблоном" creates "Заказ #1" template visible on templates page
- Button changes to "✓ Шаблон" (disabled) after promotion

## Verification

All verification checks passed:
- `npx tsc --noEmit` — zero TypeScript errors
- `npx vitest run` — all 64 tests pass (no regressions)
- `npm run build` — production build succeeds with all admin routes
- Browser: `/admin/templates` shows 8 seeded templates ✅
- Browser: toggle approve → "На модерации" → "Одобрен" ✅
- Browser: create new template → appears in list ✅
- Browser: delete template → removed from list ✅
- Browser: `/admin/orders` shows order with status badge ✅
- Browser: status change persists (new → processing) ✅
- Browser: "Сделать шаблоном" → template "Заказ #1" created ✅

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | ~5s |
| 2 | `npx vitest run` (64 tests) | 0 | ✅ pass | 4.3s |
| 3 | `npm run build` | 0 | ✅ pass | 15.7s |
| 4 | Browser: `/admin/templates` → 8 seeded templates | 0 | ✅ pass | 1s |
| 5 | Browser: toggle approve/unapprove on template #8 | 0 | ✅ pass | 2s |
| 6 | Browser: create "Тестовый шаблон" → in list | 0 | ✅ pass | 2s |
| 7 | Browser: delete template → removed (count 9→8) | 0 | ✅ pass | 2s |
| 8 | Browser: `/admin/orders` → order with status badge | 0 | ✅ pass | 1s |
| 9 | Browser: status change new→processing persists | 0 | ✅ pass | 2s |
| 10 | Browser: promote-to-template → "Заказ #1" in templates | 0 | ✅ pass | 2s |

## Diagnostics

- **Admin template state**: GET `/api/admin/templates` returns JSON array of all templates with `id`, `name`, `designCode`, `beadCount`, `isApproved`, `createdAt`
- **Admin order state**: GET `/api/admin/orders` returns JSON array of all orders with `id`, `designCode`, `status`, `beadCount`, `createdAt`
- **API auth**: All routes return 401 without `admin_token` cookie (enforced by proxy.ts)
- **Input validation**: 400 JSON on missing fields (template create) or invalid status (order update)
- **DB errors**: 500 JSON + `console.error` on database failures

## Deviations

None. All steps executed as planned.

## Known Issues

None.

## Files Created/Modified

- `src/app/api/admin/templates/route.ts` — GET all templates (no filter), POST create with name + designCode
- `src/app/api/admin/templates/[id]/route.ts` — GET single, PATCH update (name/isApproved), DELETE
- `src/app/api/admin/orders/route.ts` — GET all orders
- `src/app/api/admin/orders/[id]/status/route.ts` — PATCH order status with validation
- `src/app/admin/templates/page.tsx` — Template management page with table, create form, approve toggle, delete
- `src/app/admin/orders/page.tsx` — Order management page with table, status badges, status dropdown, promote-to-template
