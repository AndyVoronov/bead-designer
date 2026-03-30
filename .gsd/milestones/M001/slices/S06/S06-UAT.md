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

# S06: Админка — UAT

**Milestone:** M001
**Written:** 2026-03-30

## UAT Type

- UAT mode: mixed (artifact-driven + live-runtime)
- Why this mode is sufficient: Admin panel is CRUD web UI — build artifact proves routes exist, browser verification proves auth guard and all interactive flows work. No human emotional judgment needed; the check is "does the button do what it says."

## Preconditions

- `npm run build` succeeds (production build with all admin routes)
- Dev server running from real path (not junction): `cd C:\Users\Andy\.gsd\projects\...\worktrees\M001 && npm start`
- `.env` contains `ADMIN_PASSWORD=admin123`
- SQLite database has seeded templates (8 from S04 seed) and at least one order (from S05 testing)

## Smoke Test

Open `/admin` in browser → should redirect to `/admin/login`. Enter password `admin123` → should redirect to `/admin/templates` with sidebar visible.

## Test Cases

### 1. Auth guard blocks unauthenticated access

1. Open `/admin` in browser (no cookies)
2. **Expected:** Redirected to `/admin/login`
3. Open `/admin/templates` directly
4. **Expected:** Redirected to `/admin/login`
5. Call `GET /api/admin/templates` without cookie
6. **Expected:** 401 JSON `{"error": "Unauthorized"}`

### 2. Login with wrong password

1. On `/admin/login`, enter "wrongpassword" and click "Войти"
2. **Expected:** Error message "Invalid password" displayed, stays on login page, no cookie set

### 3. Login with correct password

1. On `/admin/login`, enter "admin123" and click "Войти"
2. **Expected:** Redirected to `/admin/templates`, sidebar visible with nav links (Шаблоны, Заказы, Бусины), logout button visible. `admin_token` cookie is httpOnly (verify via DevTools, not document.cookie).

### 4. Template management — list and approve/unapprove

1. On `/admin/templates`, observe seeded templates (8 items)
2. **Expected:** Each template shows name, design code, bead count, approve status badge
3. Click approve/unapprove toggle on any template
4. **Expected:** Badge changes (Одобрен ↔ На модерации), persists on page reload

### 5. Template management — create

1. Click "Добавить шаблон" to expand create form
2. Enter name "Тестовый шаблон" and a valid design code (e.g., from an existing template)
3. Click "Создать"
4. **Expected:** New template appears in list, form collapses

### 6. Template management — delete

1. Click delete button on a template
2. Confirm deletion in browser dialog
3. **Expected:** Template removed from list, count decreases

### 7. Order management — list and status

1. Navigate to `/admin/orders` via sidebar
2. **Expected:** Orders displayed with colored status badges (Новый/В обработке/Выполнен)
3. Change status dropdown on an order (e.g., "Новый" → "В обработке")
4. **Expected:** Badge updates, status persists on page reload

### 8. Promote order to template

1. On `/admin/orders`, click "Сделать шаблоном" on an order that hasn't been promoted yet
2. **Expected:** Button changes to "✓ Шаблон" (disabled)
3. Navigate to `/admin/templates`
4. **Expected:** New template "Заказ #N" appears with isApproved=true

### 9. Bead catalog viewer

1. Navigate to `/admin/beads` via sidebar
2. **Expected:** Table shows 100 beads with columns (ID, Название, Название RU, Форма, Материал, Размер, Цвет). Footer shows "Всего: 100, Показано: 100"
3. Select "Дерево" from material filter dropdown
4. **Expected:** "Показано: 25" (25 wood beads)
5. Enter "Дуб" in search field
6. **Expected:** "Показано: 1" — finds the Oak bead

### 10. Logout

1. Click "Выйти" in sidebar
2. **Expected:** Redirected to `/admin/login`, cookie cleared
3. Try accessing `/admin/templates`
4. **Expected:** Redirected to `/admin/login` (auth guard active)

## Edge Cases

### Empty orders list
1. If no orders exist in DB, `/admin/orders` shows empty state message — no crash

### Create template with duplicate design code
1. Creating a template with a design code that already exists creates a duplicate — no uniqueness constraint enforced by UI (acceptable for admin tool)

### Promote same order twice
1. After promoting an order, the button shows "✓ Шаблон" and is disabled — prevents double-promotion

## Failure Signals

- `/admin` not redirecting to `/admin/login` without cookie → proxy.ts auth guard broken
- Admin pages accessible without login → cookie check not working
- API routes returning data without auth → proxy.ts not guarding /api/admin/*
- Missing sidebar on admin pages → layout.tsx not applying to route segment
- 500 errors on admin pages → check server console for DB connection issues
- Beads page showing 0 items → CATALOG_BEADS import broken

## Not Proven By This UAT

- Real concurrent admin sessions (multi-user editing conflicts)
- Bead catalog editing/modification (read-only view from static array)
- Template thumbnail management (no thumbnail upload flow)
- Bead table migration (beads still read from static array, not DB)
- Rate limiting on login attempts (no brute-force protection)

## Notes for Tester

- Dev server MUST run from real path `C:\Users\Andy\.gsd\projects\...\worktrees\M001`, not junction path `D:\ProjectsOnCursor\ToyDesigner\.gsd\worktrees\M001`
- ADMIN_PASSWORD is "admin123" (set in .env)
- 8 templates are seeded from S04; you may need to create an order via the public editor ("Заказать" button) before testing orders page
- The beads page reads from a static TypeScript array (CATALOG_BEADS), not from the database — this is intentional (no Bead table migration exists yet)
- Admin panel is desktop-oriented (no mobile-specific layout)
