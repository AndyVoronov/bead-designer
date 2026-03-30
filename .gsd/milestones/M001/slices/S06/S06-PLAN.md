# S06: Админка

**Goal:** Admin can log in via password, manage templates (CRUD + approve), view/change order status, browse the bead catalog, and promote user designs to templates — all from a desktop web panel at /admin.

**Demo:** Open /admin → redirected to /admin/login → enter password → admin panel loads with sidebar nav → Templates page shows all 8 seeded templates with approve/unapprove toggles → create a new template → Orders page shows orders with status dropdown → change order status → Beads page shows 100 beads with material filter → logout returns to login.

## Must-Haves

- Password-protected /admin routes via middleware cookie check
- Login page at /admin/login with password form
- Admin layout with sidebar navigation (Шаблоны, Заказы, Бусины) and logout
- Template management: list all (approved + unapproved), create, approve/unapprove, delete
- Order management: list all orders, change status (new → processing → completed)
- Bead catalog viewer: display all 100 beads from static array with material filtering
- User design approval: promote an order's design to a template (R006)

## Proof Level

- This slice proves: integration
- Real runtime required: yes (browser + SQLite)
- Human/UAT required: yes (browser verification of all admin flows)

## Verification

- `npx vitest run` — all existing 64 tests pass (no regressions)
- `npx tsc --noEmit` — zero TypeScript errors
- `npm run build` — production build succeeds with all admin routes
- Browser: `/admin` redirects to `/admin/login`
- Browser: wrong password → error message, stays on login
- Browser: correct password → cookie set, redirected to `/admin/templates`
- Browser: `/admin/templates` lists templates, approve/unapprove toggle works
- Browser: create new template → appears in list
- Browser: delete template → removed from list
- Browser: `/admin/orders` shows orders with status badges and status change
- Browser: `/admin/beads` shows 100 beads with material filter
- Browser: logout → redirected to `/admin/login`

## Observability / Diagnostics

- Runtime signals: console.error on API route failures (matches existing pattern)
- Inspection surfaces: GET /api/admin/templates, GET /api/admin/orders for DB state verification; browser DevTools for admin_token cookie
- Failure visibility: 401 JSON on unauthenticated API calls, redirect to /admin/login on unauthenticated page access, 500 JSON with console.error on DB errors
- Redaction constraints: ADMIN_PASSWORD never logged or returned in responses; cookie is httpOnly

## Integration Closure

- Upstream surfaces consumed: `src/lib/prisma.ts` (Prisma singleton), `src/data/catalogBeads.ts` (CATALOG_BEADS array), existing Template/Order models in `prisma/schema.prisma`
- New wiring introduced in this slice: `src/middleware.ts` guards /admin/* and /api/admin/* paths; admin API routes at `/api/admin/*` (separate from public `/api/*`)
- What remains before the milestone is truly usable end-to-end: S07 (integration + deploy) — assemble full app on VPS with HTTPS, test on real mobile

## Tasks

- [ ] **T01: Auth layer + Admin layout shell** `est:30m`
  - Why: All admin pages and API routes depend on auth being enforced. The layout provides the sidebar nav and CSS overrides that all pages inherit. This is the foundation everything else builds on.
  - Files: `src/middleware.ts`, `src/app/admin/login/page.tsx`, `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`, `src/app/api/admin/auth/route.ts`, `src/app/globals.css`
  - Do: Create Next.js middleware checking admin_token cookie on /admin and /api/admin paths. Create login page with password form. Create admin layout with sidebar nav and admin-root CSS class overriding global overflow:hidden. Create auth API route that sets/clears httpOnly cookie. Add ADMIN_PASSWORD to .env. Dashboard page redirects to /admin/templates.
  - Verify: Browser `/admin` → redirect to `/admin/login`; wrong password → error; correct password → cookie set → redirect to `/admin/templates` (empty page OK)
  - Done when: Auth middleware blocks unauthenticated access to /admin/* and /api/admin/*; login sets cookie; admin layout renders with sidebar
- [ ] **T02: Admin API routes + Templates + Orders pages** `est:45m`
  - Why: These are the two core CRUD management surfaces — templates (create, approve, delete) and orders (view, change status, promote to template). Each needs its own admin API routes under /api/admin/* to avoid colliding with public endpoints.
  - Files: `src/app/api/admin/templates/route.ts`, `src/app/api/admin/templates/[id]/route.ts`, `src/app/api/admin/orders/route.ts`, `src/app/api/admin/orders/[id]/status/route.ts`, `src/app/admin/templates/page.tsx`, `src/app/admin/orders/page.tsx`
  - Do: Create admin template API (GET all without isApproved filter, POST create, PATCH update name/isApproved, DELETE). Create admin order API (GET all, PATCH status). Build Templates page with table, create form (name + design code), approve/unapprove toggle, delete button. Build Orders page with table, status badges, status change dropdown, "Сделать шаблоном" button that promotes an order's design to a new approved template.
  - Verify: `curl` or browser — POST /api/admin/templates creates template; PATCH toggles isApproved; DELETE removes; PATCH /api/admin/orders/[id]/status changes status; Templates page shows seeded templates; Orders page shows orders
  - Done when: All template CRUD operations work end-to-end in browser; order status changes persist; promote-to-template creates a new approved template from an order
- [ ] **T03: Beads catalog viewer + integration verification** `est:20m`
  - Why: Beads page completes the admin panel's three-section nav. Then full verification (tests, type check, build, browser) confirms the entire admin panel works as a cohesive unit.
  - Files: `src/app/admin/beads/page.tsx`
  - Do: Create beads catalog page reading from CATALOG_BEADS static array (not DB — Bead table has no migration). Show table with all 100 beads (id, name, nameRu, shape, material, color swatch). Add material filter dropdown (wood/silicone/knit/plastic). Add name search. Run `npx vitest run`, `npx tsc --noEmit`, `npm run build`. Browser-verify all admin flows: login → templates → orders → beads → logout.
  - Verify: `npx vitest run` passes; `npx tsc --noEmit` clean; `npm run build` succeeds; browser shows 100 beads on /admin/beads; material filter works
  - Done when: All 64+ tests pass, zero TS errors, production build includes all admin routes, beads page shows 100 beads with filtering, complete browser flow verified

## Files Likely Touched

- `src/middleware.ts` (new)
- `src/app/admin/login/page.tsx` (new)
- `src/app/admin/layout.tsx` (new)
- `src/app/admin/page.tsx` (new)
- `src/app/api/admin/auth/route.ts` (new)
- `src/app/api/admin/templates/route.ts` (new)
- `src/app/api/admin/templates/[id]/route.ts` (new)
- `src/app/api/admin/orders/route.ts` (new)
- `src/app/api/admin/orders/[id]/status/route.ts` (new)
- `src/app/admin/templates/page.tsx` (new)
- `src/app/admin/orders/page.tsx` (new)
- `src/app/admin/beads/page.tsx` (new)
- `src/app/globals.css` (modify — add admin-root class)
- `.env` (modify — add ADMIN_PASSWORD)
