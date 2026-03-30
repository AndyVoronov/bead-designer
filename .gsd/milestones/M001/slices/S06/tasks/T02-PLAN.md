---
estimated_steps: 6
estimated_files: 6
---

# T02: Admin API routes + Templates + Orders pages

**Slice:** S06 — Админка
**Milestone:** M001

## Description

Create all admin-only API routes for templates (CRUD) and orders (list + status change), then build the two management UI pages that consume them. Admin template routes are separate from public `/api/templates` — they return ALL templates (not just approved) and support write operations. The orders page includes a "Сделать шаблоном" (Promote to Template) action that closes the R006 user-submitted design approval loop by creating a new approved Template from an Order's design code.

All pages are `"use client"` components at `src/app/admin/templates/page.tsx` and `src/app/admin/orders/page.tsx`. The admin layout from T01 (`src/app/admin/layout.tsx`) conditionally shows the sidebar based on `usePathname()` — these pages will have the sidebar.

## Steps

1. **Create `src/app/api/admin/templates/route.ts`** — Two handlers:
   - `GET`: `prisma.template.findMany({ orderBy: { createdAt: 'desc' } })` — returns ALL templates (no `isApproved` filter, unlike the public endpoint).
   - `POST`: Accept `{ name, designCode }`. Validate both fields present (400 if missing). Create template with `{ name, designCode, beadCount: 0, isApproved: true }`. Return 201 with created template.

2. **Create `src/app/api/admin/templates/[id]/route.ts`** — Three handlers:
   - `GET`: `prisma.template.findUnique({ where: { id: Number(id) } })`. Return 404 if not found.
   - `PATCH`: Accept `{ name?, isApproved? }` partial update. Use `prisma.template.update({ where: { id }, data: { name, isApproved } })`. Return updated template.
   - `DELETE`: `prisma.template.delete({ where: { id: Number(id) } })`. Return 200 with deleted template. Wrap in try/catch (500 on DB errors).

3. **Create `src/app/api/admin/orders/route.ts`** — One handler:
   - `GET`: `prisma.order.findMany({ orderBy: { createdAt: 'desc' } })` — returns all orders. Same as public GET but scoped to admin path.

4. **Create `src/app/api/admin/orders/[id]/status/route.ts`** — One handler:
   - `PATCH`: Accept `{ status }`. Validate status is one of `"new"`, `"processing"`, `"completed"` (400 if invalid). Use `prisma.order.update({ where: { id: Number(id) }, data: { status } })`. Return updated order.

5. **Create `src/app/admin/templates/page.tsx`** — `"use client"` component with:
   - **Header**: "Шаблоны" title + "Новый шаблон" button that toggles a create form
   - **Create form** (collapsible): two inputs — name (text) and design code (text) + "Создать" button. On submit: POST `/api/admin/templates`, then refresh list.
   - **Table**: columns — ID, Название, Код дизайна, Бусин, Статус, Действия. Status shows "✅ Одобрен" / "⏳ На модерации" badge based on `isApproved`. Actions: toggle approve/unapprove button (PATCH `/api/admin/templates/[id]`), delete button with confirmation (DELETE `/api/admin/templates/[id]`).
   - Fetch templates on mount with `useEffect` + `fetch('/api/admin/templates')`.
   - Refresh list after every mutation (create, update, delete).
   - Empty state: "Нет шаблонов" message.

6. **Create `src/app/admin/orders/page.tsx`** — `"use client"` component with:
   - **Header**: "Заказы" title
   - **Table**: columns — ID, Код дизайна, Статус, Бусин, Дата, Действия. Status shows colored badge: "🆕 Новый" (yellow), "⏳ В обработке" (blue), "✅ Завершён" (green). Actions column has: status change dropdown (select with new/processing/completed, PATCH on change), and "Сделать шаблоном" button.
   - **"Сделать шаблоном" flow**: On click, POST `/api/admin/templates` with `{ name: "Заказ #" + order.id, designCode: order.designCode }` to create a new approved template from the order's design code. Disable button if template with this designCode already exists (check by scanning current templates list).
   - Fetch orders on mount with `useEffect` + `fetch('/api/admin/orders')`.
   - Refresh after status change.
   - Empty state: "Нет заказов" message.
   - Format dates with `new Date(createdAt).toLocaleString('ru-RU')`.

## Must-Haves

- [ ] GET /api/admin/templates returns all templates (including unapproved)
- [ ] POST /api/admin/templates creates a new template with name + designCode
- [ ] PATCH /api/admin/templates/[id] updates name and/or isApproved
- [ ] DELETE /api/admin/templates/[id] removes a template
- [ ] GET /api/admin/orders returns all orders
- [ ] PATCH /api/admin/orders/[id]/status changes order status with validation
- [ ] Templates page shows table, create form, approve toggle, delete
- [ ] Orders page shows table, status badges, status change, promote-to-template
- [ ] All mutations refresh the list automatically

## Verification

- Browser (after T01 login): `/admin/templates` shows 8 seeded templates
- Browser: toggle approve on a template → isApproved flips in DB (refresh page to confirm)
- Browser: create new template with name + designCode → appears in list
- Browser: delete template → removed from list
- Browser: `/admin/orders` shows orders (may be empty if no orders created yet)
- Browser: if orders exist, change status → persists after refresh
- Browser: "Сделать шаблоном" on an order → new template appears in /admin/templates
- `npx tsc --noEmit` — zero errors

## Observability Impact

- Signals added: All API routes follow existing try/catch + console.error pattern for failure visibility
- How a future agent inspects this: GET /api/admin/templates and GET /api/admin/orders show current DB state as JSON; browser Network tab shows all mutation requests/responses
- Failure state exposed: 400 JSON on invalid input, 500 JSON + console.error on DB errors

## Inputs

- `src/lib/prisma.ts` — Prisma singleton for database access
- `prisma/schema.prisma` — Template and Order model definitions (read-only context)
- `src/app/admin/layout.tsx` — Admin layout from T01 (conditional sidebar)
- `src/app/api/templates/route.ts` — Existing public template route pattern to follow
- `src/app/api/orders/route.ts` — Existing public order route pattern to follow

## Expected Output

- `src/app/api/admin/templates/route.ts` — GET all + POST create
- `src/app/api/admin/templates/[id]/route.ts` — GET single + PATCH update + DELETE
- `src/app/api/admin/orders/route.ts` — GET all orders
- `src/app/api/admin/orders/[id]/status/route.ts` — PATCH order status
- `src/app/admin/templates/page.tsx` — Template management page
- `src/app/admin/orders/page.tsx` — Order management page
