# S06 — Research

**Date:** 2026-03-30

## Summary

S06 delivers an admin panel for managing templates (CRUD), viewing/managing orders, and browsing the bead catalog. The admin panel is a desktop-oriented web UI at `/admin` protected by a simple password. All required backend models (Template, Order, Bead) already exist in Prisma with SQLite. The existing API endpoints (`GET /api/templates`, `GET /api/orders`, `GET /api/templates/[code]`) provide read-only access — S06 adds the missing write endpoints (POST/PUT/DELETE for templates, PATCH for order status) and admin-only middleware/auth.

This is straightforward work: Next.js App Router pages under `/admin`, server-side auth via middleware checking a password header or cookie, and a handful of CRUD API routes. No new technology, no risky integrations. The main decision is auth approach (password via middleware vs. cookie vs. next-auth-lite) — recommendation: cookie-based simple password via Next.js middleware, stored as env var. No external auth libraries needed.

## Recommendation

Build a single-page admin dashboard at `/admin` with tab-based navigation between three sections: Templates, Orders, Beads. Protect all `/admin/*` routes with Next.js middleware that checks a cookie set on login. Use a standalone `"use client"` login page at `/admin/login` that POSTs a password and sets an `httpOnly` cookie via a server action or API route. All admin API endpoints (`/api/admin/*`) reuse the same cookie check.

Auth approach: **middleware-based cookie guard** — a single `src/middleware.ts` that checks for an `admin_token` cookie on all `/admin` and `/api/admin` paths. Login sets the cookie server-side via a Route Handler that compares `process.env.ADMIN_PASSWORD`. Simple, no dependencies, works with SQLite.

## Implementation Landscape

### Key Files

#### Existing (read-only context)

- `prisma/schema.prisma` — Bead, Template, Order models already defined. Template has `isApproved`, `isUserSubmitted` fields ready for approval flow.
- `src/lib/prisma.ts` — Prisma singleton with LibSql adapter. Reuse directly in all new API routes.
- `src/app/api/templates/route.ts` — Public GET endpoint (returns only `isApproved: true`). Admin endpoints should be separate (`/api/admin/templates`) to avoid mixing public/admin logic.
- `src/app/api/orders/route.ts` — Public POST + GET endpoints. Admin needs PATCH for status changes — new route at `/api/admin/orders/[id]/status`.
- `src/app/api/templates/[code]/route.ts` — Public GET by code. Admin needs full CRUD including delete.
- `src/data/catalogBeads.ts` — 100 beads as static array. Admin bead management is read-only for MVP (view catalog). D021 noted migration to API-backed catalog happens in S06, but since there's no Bead CRUD requirement from users and the static array works, a read-only view is sufficient.
- `src/lib/serialization.ts` — `encodeDesign`/`decodeDesign` for design code generation if admin creates templates from designs.
- `src/app/globals.css` — Global CSS. Admin pages need their own layout that overrides `overflow: hidden` and `touch-action: none` (those are for the 3D editor).
- `src/app/layout.tsx` — Root layout with `lang="ru"`. Admin layout should be nested under this.
- `prisma/seed.ts` — Template seeding. Shows the pattern for creating templates with valid design codes.

#### New files to create

- `src/middleware.ts` — Next.js middleware: checks `admin_token` cookie on `/admin` and `/api/admin` paths, redirects to `/admin/login` if missing.
- `src/app/admin/login/page.tsx` — Login form: password input + submit. Calls `POST /api/admin/auth` to set cookie.
- `src/app/admin/layout.tsx` — Admin layout: sidebar/nav + main content area. Overrides global `overflow: hidden` for normal scrolling. Reads no 3D scene dependencies.
- `src/app/admin/page.tsx` — Admin dashboard: redirects to `/admin/templates` or shows overview.
- `src/app/admin/templates/page.tsx` — Template management: list all templates (including unapproved), approve/reject, create new, delete.
- `src/app/admin/orders/page.tsx` — Order management: list orders, change status (new → processing → completed).
- `src/app/admin/beads/page.tsx` — Bead catalog viewer: display all 100 beads with filtering. Read-only for now.
- `src/app/api/admin/auth/route.ts` — POST: validate password, set `admin_token` httpOnly cookie. POST with `{ action: "logout" }`: clear cookie.
- `src/app/api/admin/templates/route.ts` — GET: list all templates (no isApproved filter). POST: create template.
- `src/app/api/admin/templates/[id]/route.ts` — GET: single template. PATCH: update (name, isApproved). DELETE: remove.
- `src/app/api/admin/orders/route.ts` — GET: list all orders (same as public, but admin-scoped path).
- `src/app/api/admin/orders/[id]/status/route.ts` — PATCH: update order status.

### Build Order

1. **Auth layer first** (middleware + login page + auth API) — everything depends on being behind auth. Verify by visiting `/admin` → redirect to `/admin/login` → enter password → cookie set → redirect to `/admin/templates`.
2. **Admin layout** — provides the shell (sidebar, nav, scrollable content) that all admin pages use.
3. **Orders page** — simplest CRUD (read list + patch status). Reuses existing Order model and GET /api/orders logic. Only new thing is PATCH for status.
4. **Templates page** — CRUD operations. Needs POST (create), PATCH (approve/update), DELETE. Reuses Template model.
5. **Beads page** — read-only catalog view. Purely presentational, reads from static array or Bead model.

### Verification Approach

- `npx vitest run` — all existing 64 tests still pass (no regressions)
- `npx tsc --noEmit` — zero TypeScript errors
- `npm run build` — production build succeeds with all new routes
- Browser: visit `/admin` → redirected to `/admin/login`
- Browser: submit wrong password → error message, stays on login
- Browser: submit correct password → redirected to `/admin/templates`, cookie visible in DevTools
- Browser: `/admin/templates` shows all 8 seeded templates with approve/unapproved toggle
- Browser: `/admin/orders` shows orders list with status badges and status change dropdown
- Browser: `/admin/beads` shows 100 beads with material filter
- Browser: PATCH order status → status updates in list
- Browser: create new template → appears in list
- Browser: delete template → removed from list
- Browser: logout → redirected to `/admin/login`

## Constraints

- **SQLite via LibSql**: No `DELETE CASCADE` configuration in current schema. Template and Order deletes are independent (no FK references between them). Bead model exists in schema but no migration has been run for it (D021: "Prisma schema (Bead model) written but no migrations run"). Admin bead page should read from `CATALOG_BEADS` static array, not from DB, since Bead table doesn't exist yet.
- **No external auth libraries**: Keep it simple — `ADMIN_PASSWORD` env var compared directly. No bcrypt needed for a single-admin tool.
- **Admin is desktop-only**: No mobile optimization needed. The admin panel can use desktop layouts (sidebar nav, tables) without worrying about touch events or mobile viewports.
- **Global CSS overrides**: `globals.css` sets `overflow: hidden` and `touch-action: none` on html/body for the 3D editor. Admin layout must override these for normal scrolling behavior (like `home-page-root` class does on the home page).
- **Next.js 16 middleware**: Standard Next.js middleware API works. Use `NextRequest`/`NextResponse` with cookie matching.

## Common Pitfalls

- **Global overflow:hidden bleeds into admin**: The root `globals.css` applies `overflow: hidden` and `touch-action: none` on `html`/`body`. Admin pages must explicitly override this (add an `admin-root` class similar to `home-page-root`), otherwise the admin panel won't scroll.
- **Cookie not httpOnly**: If the admin cookie is accessible via JavaScript, it's vulnerable to XSS. Must set `httpOnly: true`, `secure: true` (in production), `sameSite: 'lax'`, and `path: '/admin'`.
- **Admin API paths must not collide with public API paths**: Public routes are at `/api/templates` and `/api/orders`. Admin routes go under `/api/admin/*` to avoid conflicts. The public GET `/api/templates` filters by `isApproved: true` — admin GET must return all templates.
- **Don't run Bead migration**: The Bead model is in `schema.prisma` but no migration exists for it. Do NOT run `prisma migrate dev` for beads — the admin bead page reads from the static `CATALOG_BEADS` array. Adding the migration is out of scope.

## Open Risks

- **Admin template creation UX**: Creating a template requires a valid design code. The admin either: (a) enters a design code manually (generated elsewhere), (b) pastes a design URL, or (c) the system provides a simple builder. Option (a) or (b) is simplest — admin gets a design code from the share link and pastes it in. This is low-risk since the serialization infrastructure already works.
- **User-submitted design approval**: R006 mentions "Подтверждённые админом пользовательские изделия попадают в каталог шаблонов". This requires a flow where user designs become templates. Currently, orders store a `designCode` — the approval flow could work by: admin sees a user order → clicks "approve as template" → creates a new Template with `isUserSubmitted: true` and `isApproved: true`. This is a UI workflow, not a technical risk.
