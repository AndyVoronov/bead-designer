---
estimated_steps: 6
estimated_files: 6
---

# T01: Auth layer + Admin layout shell

**Slice:** S06 — Админка
**Milestone:** M001

## Description

Create the authentication foundation and admin panel shell. This includes Next.js middleware that guards all `/admin` and `/api/admin` paths with an httpOnly cookie check, a login page with password form, an admin layout with sidebar navigation, an auth API route for setting/clearing the cookie, and CSS overrides so the admin panel scrolls normally (the global CSS sets `overflow: hidden` and `touch-action: none` for the 3D editor).

## Steps

1. **Add `.admin-root` CSS class to `src/app/globals.css`** — Override global `overflow: hidden` and `touch-action: none` (set for the 3D canvas editor). Pattern: copy the `.home-page-root` block that already does this, name it `.admin-root`. Also add `.admin-root::-webkit-scrollbar { display: none; }` for clean desktop scrolling.

2. **Create `src/middleware.ts`** — Next.js middleware using `NextRequest`/`NextResponse`. Check for `admin_token` cookie on paths matching `/admin` or `/api/admin`. If cookie missing → redirect to `/admin/login` (for page paths) or return 401 JSON (for API paths). Whitelist `/admin/login` path (skip auth check). Use `NextResponse.next()` to pass through authenticated requests.

3. **Create `src/app/api/admin/auth/route.ts`** — Two handlers:
   - `POST` with `{ password }`: Compare `password` to `process.env.ADMIN_PASSWORD`. On match: return 200 with `Set-Cookie: admin_token=authenticated; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`. On mismatch: return 401 `{ error: "Invalid password" }`.
   - `POST` with `{ action: "logout" }`: Return 200 with `Set-Cookie: admin_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0` (clears cookie).

4. **Create `src/app/admin/login/page.tsx`** — `"use client"` component. Simple centered card with password input + "Войти" button. On submit: POST to `/api/admin/auth` with password. On success: `router.push('/admin/templates')`. On 401: show error message. Add `ADMIN_PASSWORD=admin123` to `.env` (or use `secure_env_collect`). The login page must NOT use the admin layout — it's a standalone page.

5. **Create `src/app/admin/layout.tsx`** — `"use client"` layout component. Uses `usePathname()` to conditionally render:
   - If pathname is `/admin/login` or starts with `/admin/login`: render just `{children}` (no sidebar — clean login page).
   - Otherwise: render flex row with sidebar (w-56, bg-gray-100, border-r) and main content area (flex-1, `admin-root` class, overflow-auto, p-6). Sidebar contains: app title "Bead Designer Admin", nav links to `/admin/templates` (Шаблоны), `/admin/orders` (Заказы), `/admin/beads` (Бусины) — highlight active link with `usePathname()`. Logout button at bottom calls `POST /api/admin/auth` with `{ action: "logout" }`, then `router.push('/admin/login')`.
   - Import globals.css is handled by root layout — this layout just provides the admin shell.

6. **Create `src/app/admin/page.tsx`** — Simple Server Component that redirects to `/admin/templates`. Use `redirect('/admin/templates')` from `next/navigation`.

## Must-Haves

- [ ] Middleware blocks unauthenticated access to /admin/* and /api/admin/* (redirect for pages, 401 for API)
- [ ] Login page accepts password, sets httpOnly cookie on success, shows error on failure
- [ ] Admin layout renders sidebar with nav links (Шаблоны, Заказы, Бусины) and logout button
- [ ] `admin-root` CSS class overrides global `overflow: hidden` for normal scrolling
- [ ] ADMIN_PASSWORD env var configured

## Verification

- Browser: visit `/admin` → redirected to `/admin/login`
- Browser: submit wrong password → error message shown, stays on login page
- Browser: submit correct password → redirected to `/admin/templates` (404 OK — page doesn't exist yet)
- Browser: cookie `admin_token` visible in DevTools (httpOnly flag set)
- Browser: `/api/admin/auth` returns 401 without cookie
- Browser: `/api/admin/templates` returns 401 without cookie
- `npx tsc --noEmit` — zero errors

## Observability Impact

- Signals added: Middleware redirects unauthenticated requests (visible in Network tab), auth API returns 401 on wrong password
- How a future agent inspects this: Check browser DevTools Network tab for 302 redirects; check Application > Cookies for admin_token
- Failure state exposed: Login stays on page with error message on wrong password; API returns 401 JSON

## Inputs

- `src/app/globals.css` — Existing global CSS with overflow:hidden, add admin-root override class
- `src/app/layout.tsx` — Root layout (read-only context, admin layout nests under this)
- `.env` — Add ADMIN_PASSWORD env var

## Expected Output

- `src/middleware.ts` — Next.js middleware guarding /admin/* and /api/admin/* paths
- `src/app/api/admin/auth/route.ts` — POST login (set cookie) + POST logout (clear cookie)
- `src/app/admin/login/page.tsx` — Password login form
- `src/app/admin/layout.tsx` — Admin layout with conditional sidebar (sidebar for panel pages, bare for login)
- `src/app/admin/page.tsx` — Redirect to /admin/templates
- `src/app/globals.css` — Modified with .admin-root CSS override class
