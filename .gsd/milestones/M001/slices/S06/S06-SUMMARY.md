---
id: S06
parent: M001
milestone: M001
provides:
  - Password-protected admin panel at /admin via proxy.ts cookie guard
  - Admin login/logout with httpOnly cookie (admin_token)
  - Admin layout with sidebar navigation (Шаблоны, Заказы, Бусины)
  - Template management: list all, create, approve/unapprove, delete
  - Order management: list all, status badges, status change, promote-to-template
  - Bead catalog viewer: 100 beads from static array with material filter + search
  - Admin API routes under /api/admin/* (separate from public /api/*)
requires:
  - slice: S04
    provides: Template model, public template API, design serialization
  - slice: S05
    provides: Order model, order API, generateTelegramLink
affects:
  - S07
key_files:
  - src/proxy.ts
  - src/app/api/admin/auth/route.ts
  - src/app/api/admin/templates/route.ts
  - src/app/api/admin/templates/[id]/route.ts
  - src/app/api/admin/orders/route.ts
  - src/app/api/admin/orders/[id]/status/route.ts
  - src/app/admin/login/page.tsx
  - src/app/admin/layout.tsx
  - src/app/admin/page.tsx
  - src/app/admin/templates/page.tsx
  - src/app/admin/orders/page.tsx
  - src/app/admin/beads/page.tsx
  - src/app/globals.css
key_decisions:
  - Next.js 16 proxy.ts instead of middleware.ts for auth guard
  - /api/admin/auth whitelisted in proxy for unauthenticated login attempts
  - Admin template GET returns ALL templates (no isApproved filter), unlike public endpoint
  - Promote-to-template creates approved template with beadCount: 0 from order's designCode
  - Order status validation against hardcoded array ["new", "processing", "completed"]
  - Dynamic route params use Next.js 16 Promise-based params pattern with await
  - Beads page reads from CATALOG_BEADS static array, not DB (no Bead table migration)
patterns_established:
  - Admin auth: proxy.ts cookie check → 302 redirect for pages, 401 JSON for API
  - Admin API: try/catch + console.error, separate /api/admin/* namespace
  - Admin page: useEffect + fetch on mount, refresh after every mutation
  - Client-side filtering with useMemo for static data admin views
observability_surfaces:
  - GET /api/admin/templates returns all templates as JSON (including unapproved)
  - GET /api/admin/orders returns all orders as JSON with status
  - 401 JSON on unauthenticated /api/admin/* calls
  - 302 redirect to /admin/login on unauthenticated /admin/* page access
  - httpOnly admin_token cookie visible in browser DevTools
  - 400 JSON on invalid input, 500 JSON + console.error on DB errors
drill_down_paths:
  - .gsd/milestones/M001/slices/S06/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S06/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S06/tasks/T03-SUMMARY.md
duration: ~55m
verification_result: passed
completed_at: 2026-03-30T09:35:00+09:00
---

# S06: Админка

**Password-protected admin web panel with template CRUD, order management with promote-to-template, and bead catalog viewer — all verified end-to-end in browser.**

## What Happened

S06 built the complete admin panel in three tasks (T01→T02→T03), each building on the previous:

**T01** established the auth foundation. Next.js 16 uses `proxy.ts` instead of `middleware.ts` — the task plan referenced middleware.ts but the project already had proxy.ts with correct auth logic. The only fix needed was whitelisting `/api/admin/auth` so login attempts work without a cookie. Login page, admin layout with sidebar, auth API (cookie set/clear), and CSS overrides for the admin root class were all pre-created by a prior session. Auth guard redirects unauthenticated page access to `/admin/login` (302) and returns 401 JSON for API calls.

**T02** built the two core admin surfaces: Templates and Orders pages with their API routes. Admin template API differs from the public endpoint — it returns ALL templates (no `isApproved` filter) so the admin sees both approved and unapproved. Dynamic route params use Next.js 16's `Promise<{ id: string }>` pattern with `await params`. The promote-to-template feature on the Orders page creates an approved template from an order's designCode with `beadCount: 0` (the count isn't derivable from the designCode alone). Orders page fetches template design codes to disable the promote button when a template already exists.

**T03** completed the admin panel with the Beads catalog viewer. Reads from `CATALOG_BEADS` static array (not DB) since the Bead table has no migration. Table shows 100 beads with 7 columns, material filter dropdown, and name search — all client-side via `useMemo`. Material and shape names are displayed in Russian.

All three tasks verified cleanly: 64 tests pass, zero TypeScript errors, production build succeeds with all 16 routes including 6 admin routes and 5 admin API routes. Browser verification confirmed the complete flow: login redirect, wrong password error, correct password → templates page, all CRUD operations, logout, and auth guard re-engagement.

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ Zero errors |
| `npx vitest run` (64 tests) | ✅ All pass |
| `npm run build` | ✅ 16 routes (6 admin pages + 5 admin API + 5 public) |
| Browser: `/admin` → redirect to `/admin/login` | ✅ |
| Browser: wrong password → error, stays on login | ✅ |
| Browser: correct password → cookie + `/admin/templates` | ✅ |
| Browser: template approve/unapprove toggle | ✅ |
| Browser: create template → appears in list | ✅ |
| Browser: delete template → removed | ✅ |
| Browser: order status change persists | ✅ |
| Browser: promote-to-template → template created | ✅ |
| Browser: 100 beads on /admin/beads | ✅ |
| Browser: material filter → 25 wood beads | ✅ |
| Browser: search "Дуб" → 1 result | ✅ |
| Browser: logout → redirect to login | ✅ |
| Browser: unauthenticated access → redirect | ✅ |

## New Requirements Surfaced

- None.

## Deviations

1. **proxy.ts instead of middleware.ts**: The task plan specified `src/middleware.ts` but Next.js 16 uses `src/proxy.ts`. The proxy file already existed with correct auth logic — only needed to whitelist `/api/admin/auth`.

2. **All admin files pre-created**: 6 of 12 files were pre-created by a prior session, reducing implementation to API routes + 2 page components + proxy fix.

## Known Limitations

- **Bead catalog is read-only from static array**: No admin CRUD for beads — the Bead Prisma model exists but has no migration. Beads page shows data from `CATALOG_BEADS` TypeScript array.
- **No thumbnail management**: Templates have `thumbnailUrl` field but no upload flow in admin.
- **No rate limiting on login**: Simple password check without brute-force protection.
- **Promote-to-template sets beadCount: 0**: The order's designCode doesn't encode bead count in a way the admin API can read without deserializing.
- **No concurrent admin session handling**: Multiple admins could edit the same template simultaneously without conflict detection.

## Follow-ups

- **Bead table migration + admin bead CRUD**: Could activate the existing Prisma Bead model for dynamic catalog management. Currently deferred — static array works for the number of beads in the catalog.
- **Template thumbnail upload**: Add image upload to template create/edit form, store path in `thumbnailUrl`.
- **Login rate limiting**: Add attempt counting or CAPTCHA if admin panel is exposed to the public internet.
- **beadCount on promoted templates**: Could decode the designCode to count beads when promoting, or add beadCount to the promote request.

## Files Created/Modified

- `src/proxy.ts` — Modified: whitelisted `/api/admin/auth` in auth guard matcher
- `src/app/api/admin/auth/route.ts` — Pre-existing: POST login (sets httpOnly cookie) + POST logout (clears cookie)
- `src/app/api/admin/templates/route.ts` — Created: GET all templates (no isApproved filter), POST create with name + designCode
- `src/app/api/admin/templates/[id]/route.ts` — Created: GET single, PATCH update (name/isApproved), DELETE
- `src/app/api/admin/orders/route.ts` — Created: GET all orders
- `src/app/api/admin/orders/[id]/status/route.ts` — Created: PATCH order status with validation against VALID_STATUSES
- `src/app/admin/login/page.tsx` — Pre-existing: centered card with password input + "Войти" button
- `src/app/admin/layout.tsx` — Pre-existing: conditional sidebar layout (Шаблоны, Заказы, Бусины, Выйти)
- `src/app/admin/page.tsx` — Pre-existing: server component redirect to `/admin/templates`
- `src/app/admin/templates/page.tsx` — Created: template management with table, create form, approve toggle, delete
- `src/app/admin/orders/page.tsx` — Created: order management with table, status badges, status dropdown, promote-to-template
- `src/app/admin/beads/page.tsx` — Created: 100-bead catalog viewer with material filter + name search
- `src/app/globals.css` — Pre-existing: `.admin-root` CSS override for normal scrolling behavior
- `.env` — Pre-existing: `ADMIN_PASSWORD=admin123`

## Forward Intelligence

### What the next slice should know
- The admin panel is complete and self-contained at `/admin/*` with `/api/admin/*` API routes. S07 (deploy) just needs to ensure the admin panel works on the production URL.
- ADMIN_PASSWORD env var must be set on the production VPS — it's not optional. Currently `admin123` (dev default).
- The proxy.ts auth guard uses a simple cookie check with no crypto — the cookie value is a static string match, not a signed token. Adequate for single-admin use behind HTTPS.
- All admin API routes follow the same pattern: `try/catch` with `console.error`, `NextResponse.json`, Prisma `prisma` singleton import from `@/lib/prisma`.

### What's fragile
- **Promote-to-template with beadCount: 0** — promoted templates show 0 beads in the admin UI because the designCode can't be decoded without the serialization library. If the front-end template gallery relies on beadCount for display, promoted templates will look empty.
- **No template uniqueness on designCode** — creating two templates with the same design code is possible. The public `/design/[code]` endpoint returns the first match, so duplicates could confuse users.

### Authoritative diagnostics
- `GET /api/admin/templates` — full template state including isApproved flag
- `GET /api/admin/orders` — full order state including status
- Browser DevTools → Application → Cookies → `admin_token` — verify auth state
- Server console — `console.error` output on DB failures in admin API routes

### What assumptions changed
- **Next.js middleware → proxy**: The original plan assumed `middleware.ts` but Next.js 16 replaced it with `proxy.ts`. This is a one-time migration — all future auth logic should go in proxy.ts.
- **Bead catalog stays static for now**: D021 assumed S06 would "migrate to API-backed catalog with admin CRUD." In practice, the Bead table has no migration and the admin beads page reads from the static array. This is fine for the current catalog size but means adding beads requires a code change, not an admin action.

### Output Template: Slice Summary
Source: `templates/slice-summary.md`
