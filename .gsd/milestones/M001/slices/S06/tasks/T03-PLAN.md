---
estimated_steps: 5
estimated_files: 2
---

# T03: Beads catalog viewer + integration verification

**Slice:** S06 — Админка
**Milestone:** M001

## Description

Create the beads catalog viewer page — a read-only admin view of all 100 catalog beads from the `CATALOG_BEADS` static array. The Bead table exists in Prisma schema but has no migration, so this page reads from the static array (D021: "Static array for S03, dynamic API for S06" — but since no migration runs, static array remains). Then run the full verification suite to confirm the entire admin panel works: tests, type check, build, and browser verification of all admin flows.

## Steps

1. **Create `src/app/admin/beads/page.tsx`** — `"use client"` component with:
   - **Header**: "Бусины" title + bead count display (e.g., "Всего: 100")
   - **Filter bar**: Material dropdown filter (Все / Дерево / Силикон / Вязаное / Пластик) and name search input. Filter state managed with `useState`.
   - **Table**: columns — ID, Название, Название (RU), Форма, Материал, Размер, Цвет. Color column shows a small colored circle swatch (inline `bg-[color]` with Tailwind). Material names in Russian (Дерево, Силикон, Вязаное, Пластик). Shape names in Russian (Сфера, Диск, Звезда, Сердце, Цилиндр).
   - Import `CATALOG_BEADS` from `@/data/catalogBeads`. Apply filters client-side: `beads.filter(b => materialFilter === 'all' || b.material === materialFilter).filter(b => b.name.toLowerCase().includes(search) || b.nameRu.includes(search))`.
   - Empty state when no beads match filter.
   - Material label mapping: `{ wood: 'Дерево', silicone: 'Силикон', knit: 'Вязаное', plastic: 'Пластик' }`.
   - Shape label mapping: `{ sphere: 'Сфера', disc: 'Диск', star: 'Звезда', heart: 'Сердце', cylinder: 'Цилиндр' }`.

2. **Run test suite** — Execute `npx vitest run`. All 64 existing tests must pass. No new tests required for this slice (admin panel is UI-heavy, verified via browser).

3. **Run TypeScript check** — Execute `npx tsc --noEmit`. Zero errors expected.

4. **Run production build** — Execute `npm run build`. Build must succeed with all admin routes included: `/admin`, `/admin/login`, `/admin/templates`, `/admin/orders`, `/admin/beads`, `/api/admin/auth`, `/api/admin/templates`, `/api/admin/templates/[id]`, `/api/admin/orders`, `/api/admin/orders/[id]/status`.

5. **Browser verification of complete admin flow** — Test the full admin panel end-to-end:
   - Visit `/admin` → redirected to `/admin/login`
   - Submit wrong password → error message
   - Submit correct password → redirected to `/admin/templates`, sidebar visible
   - Templates page: 8 seeded templates visible, toggle approve, create new, delete
   - Orders page: order list visible (or "Нет заказов" empty state), status change works
   - Beads page: 100 beads visible, material filter works, name search works
   - Click "Выйти" → redirected to `/admin/login`
   - Visit `/admin/templates` without cookie → redirected to `/admin/login`

## Must-Haves

- [ ] Beads page displays all 100 catalog beads in a table
- [ ] Material filter dropdown works (filters to specific material family)
- [ ] Name search input works (filters by name or nameRu)
- [ ] Color swatch visible for each bead
- [ ] All 64 existing tests pass
- [ ] Zero TypeScript errors
- [ ] Production build succeeds
- [ ] Full admin flow works in browser (login → all pages → logout)

## Verification

- `npx vitest run` — all tests pass (64+)
- `npx tsc --noEmit` — zero errors
- `npm run build` — succeeds, all admin routes in output
- Browser: `/admin/beads` shows 100 beads
- Browser: material filter reduces visible beads (e.g., "Дерево" shows 25)
- Browser: search by "Дуб" finds the Oak bead
- Browser: complete login → navigate → logout flow works

## Observability Impact

None — this task is UI-only (read from static array) plus verification. No new runtime signals or error paths.

## Inputs

- `src/data/catalogBeads.ts` — CATALOG_BEADS array with 100 beads (read-only)
- `src/types/bead.ts` — CatalogBead, BeadType, BeadShape types (read-only)
- `src/app/admin/layout.tsx` — Admin layout from T01 (conditional sidebar)

## Expected Output

- `src/app/admin/beads/page.tsx` — Bead catalog viewer page
