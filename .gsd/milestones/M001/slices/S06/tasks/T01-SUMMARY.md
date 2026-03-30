---
id: T01
parent: S06
milestone: M001
provides:
  - Auth proxy guarding /admin/* and /api/admin/* paths
  - Login page at /admin/login with password form
  - Admin layout with sidebar nav (Шаблоны, Заказы, Бусины) and logout
  - Auth API route (POST login + POST logout)
  - Admin redirect page at /admin
key_files:
  - src/proxy.ts
  - src/app/api/admin/auth/route.ts
  - src/app/admin/login/page.tsx
  - src/app/admin/layout.tsx
  - src/app/admin/page.tsx
  - src/app/globals.css
key_decisions:
  - Next.js 16 uses proxy.ts instead of middleware.ts; all auth logic lives in proxy.ts
  - /api/admin/auth whitelisted in proxy to allow unauthenticated login attempts
  - ADMIN_PASSWORD=admin123 set in .env
patterns_established:
  - Admin auth pattern: httpOnly cookie check in proxy, redirect for pages, 401 JSON for API
  - Admin layout conditional rendering: sidebar only on non-login pages
  - CSS override pattern: admin-root class overrides global overflow:hidden/touch-action:none
observability_surfaces:
  - 401 JSON on unauthenticated /api/admin/* calls
  - 302 redirect to /admin/login on unauthenticated /admin/* page access
  - httpOnly admin_token cookie visible in browser DevTools
  - console.error on missing ADMIN_PASSWORD env var
duration: ~15m
verification_result: passed
completed_at: 2026-03-30T09:00:00+09:00
blocker_discovered: false
---

# T01: Auth layer + Admin layout shell

**Implemented admin auth proxy, login page, admin layout shell, and auth API route for password-protected admin panel.**

## What Happened

All six target files were pre-created by a prior session. The only missing piece was the auth proxy (`src/middleware.ts` was listed in the task plan but Next.js 16 uses `src/proxy.ts` instead). The existing `proxy.ts` already contained correct auth logic with one bug: it blocked `/api/admin/auth` itself, preventing login attempts without a cookie. Fixed by whitelisting `/api/admin/auth` in the proxy matcher.

Key findings during execution:
- The `.admin-root` CSS class was already present in `globals.css` (matching the existing `.home-page-root` pattern)
- `ADMIN_PASSWORD=admin123` was already configured in `.env`
- Next.js 16 replaced `middleware.ts` with `proxy.ts` — the task plan referenced the old API but the project already uses the new one
- The project runs inside a Windows symlink (junction) worktree, causing Next.js dev server path doubling bugs. Production builds and `next start` from the real path work correctly; dev server requires launching from the resolved real path

## Verification

All task-level verification checks passed:
- Browser `/admin` → redirected to `/admin/login` ✅
- Wrong password → "Invalid password" error shown, stays on login ✅
- Correct password → cookie set, redirected to `/admin/templates` (404 expected — page doesn't exist yet) ✅
- Cookie `admin_token` is httpOnly (confirmed via `document.cookie` returning empty string) ✅
- `/api/admin/templates` returns 401 without cookie (verified via curl) ✅
- `npx tsc --noEmit` — zero TypeScript errors ✅
- Login page renders without sidebar ✅
- Logout clears cookie and redirects to login ✅
- `npx vitest run` — all 64 tests pass ✅
- `npm run build` — succeeds with all admin routes ✅

Note: The admin sidebar cannot be visually verified until T02 creates `/admin/templates/page.tsx`. Next.js's built-in not-found handler bypasses the segment layout. The layout code is correct (conditional rendering via `usePathname()`, nav links, logout button).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | ~5s |
| 2 | `npx vitest run` (64 tests) | 0 | ✅ pass | 6.6s |
| 3 | `npm run build` | 0 | ✅ pass | 14.6s |
| 4 | Browser: `/admin` → redirect to `/admin/login` | 0 | ✅ pass | 1s |
| 5 | Browser: wrong password → error shown | 0 | ✅ pass | 1s |
| 6 | Browser: correct password → `/admin/templates` | 0 | ✅ pass | 1s |
| 7 | Browser: cookie httpOnly verified | 0 | ✅ pass | 0.5s |
| 8 | curl: `/api/admin/templates` → 401 | 0 | ✅ pass | 0.5s |
| 9 | Browser: logout → redirect to login | 0 | ✅ pass | 1s |

## Diagnostics

- **Auth state**: Check browser DevTools → Application → Cookies → `admin_token` (httpOnly)
- **API auth failures**: 401 JSON `{ "error": "Unauthorized" }` on unauthenticated `/api/admin/*`
- **Page auth failures**: 302 redirect to `/admin/login` on unauthenticated `/admin/*`
- **Server config**: Check `ADMIN_PASSWORD` env var; missing var triggers `console.error` and 500 response

## Deviations

1. **proxy.ts instead of middleware.ts**: The task plan specified creating `src/middleware.ts` but Next.js 16 uses `src/proxy.ts`. The proxy file already existed with correct auth logic. Removed the middleware.ts file to avoid conflict.

2. **Whitelisted `/api/admin/auth` in proxy**: The original proxy blocked all `/api/admin/*` paths, but the auth endpoint must be reachable without a cookie for login attempts. Added `/api/admin/auth` to the whitelist.

## Known Issues

- **Dev server symlink bug**: Next.js 16 dev server doubles up paths when running from a Windows symlink/junction worktree. Workaround: launch from the real path (`C:\Users\Andy\.gsd\projects\...\worktrees\M001`). Production builds and `next start` work correctly from the symlink path.
- **Admin sidebar not visible on 404**: Next.js's built-in not-found page bypasses segment layouts. The sidebar will render correctly once T02 creates `/admin/templates/page.tsx`.

## Files Created/Modified

- `src/proxy.ts` — Modified: whitelisted `/api/admin/auth` path to allow unauthenticated login attempts
- `src/app/api/admin/auth/route.ts` — Pre-existing: POST login (sets httpOnly cookie) + POST logout (clears cookie)
- `src/app/admin/login/page.tsx` — Pre-existing: centered card with password input + "Войти" button, error display
- `src/app/admin/layout.tsx` — Pre-existing: conditional layout with sidebar (Шаблоны, Заказы, Бусины) and logout button
- `src/app/admin/page.tsx` — Pre-existing: server component redirecting to `/admin/templates`
- `src/app/globals.css` — Pre-existing: `.admin-root` CSS override class for normal scrolling
- `.env` — Pre-existing: `ADMIN_PASSWORD=admin123`
