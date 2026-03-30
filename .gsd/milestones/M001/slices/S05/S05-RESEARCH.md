# S05 — Research

**Date:** 2026-03-30

## Summary

S05 wires up the order flow: "Заказать" button → POST /api/orders → SQLite → redirect to Telegram deep link. This is a straightforward CRUD slice with zero unfamiliar technology. All patterns are established: Prisma model + migration, Next.js API routes, serialization (encodeDesign), and toolbar button UI. The Telegram integration is a URL redirect only (D008) — no Bot API needed.

The Order model is not yet in the Prisma schema. Everything else (Prisma client, API route patterns, serialization functions, toolbar component) exists and is proven. The work divides into: (1) schema change + migration, (2) API endpoints, (3) Telegram link generator + order button UI, (4) tests + verification.

## Recommendation

Follow the exact same patterns as S04 for Prisma/API work. Add the Order model to schema.prisma, run migration, create POST /api/orders and GET /api/orders routes using the same prisma singleton and NextResponse.json pattern. Add the "Заказать" button to EditorToolbar alongside existing buttons, calling encodeDesign + fetch + window.open(t.me/VoronovAndrey?text=...). No new dependencies needed.

## Implementation Landscape

### Key Files

- `prisma/schema.prisma` — Add `Order` model (id, designCode, designState JSON, status enum, createdAt). Currently has Bead + Template only.
- `src/lib/prisma.ts` — Prisma client singleton with LibSql adapter. No changes needed — just import and use.
- `src/lib/serialization.ts` — `encodeDesign(beads)` and `decodeDesign(code)`. Used to serialize the design when creating an order.
- `src/stores/useDesignStore.ts` — `useDesignStore.getState().beads` provides current beads for order creation.
- `src/components/editor/EditorToolbar.tsx` — Add "Заказать" button. Currently has 4 buttons (Каталог, Удалить, Поделиться, Сброс). Add a 5th prominent order button. Already imports `encodeDesign` and reads `beads` from store.
- `src/app/api/templates/route.ts` — Reference pattern for GET API route (imports prisma, calls findMany, returns NextResponse.json).
- `src/app/api/templates/[code]/route.ts` — Reference pattern for parameterized route.
- `src/types/bead.ts` — `BeadState` and `SerializableDesign` types used in serialization.

### New Files to Create

- `src/app/api/orders/route.ts` — POST (create order), GET (list orders for admin)
- `src/lib/telegram.ts` — `generateTelegramLink(designCode, beadCount)` → `https://t.me/VoronovAndrey?text=...`
- `src/lib/__tests__/telegram.test.ts` — Unit tests for Telegram link generator
- `src/app/api/orders/__tests__/route.test.ts` — Integration tests for order API (or use vitest directly)

### Build Order

1. **Schema + migration** — Add Order model, run `npx prisma migrate dev`. Unblocks API endpoints.
2. **Telegram link generator** — Pure function, no dependencies. Can be built and tested immediately in parallel with schema.
3. **POST /api/orders** — Creates order in DB with designCode + status "new". Returns the order object (or at minimum the designCode).
4. **GET /api/orders** — Lists all orders (for S06 admin). Simple findMany.
5. **"Заказать" button in EditorToolbar** — Calls encodeDesign → POST /api/orders → window.open(telegramLink). This is the final integration point.
6. **Tests + verification** — Unit tests for telegram link, integration verification via browser.

### Verification Approach

- `npx vitest run` — all existing + new tests pass
- `npx tsc --noEmit` — zero type errors
- `npm run build` — production build succeeds
- Browser: "Заказать" button visible in toolbar (only when beads.length > 0)
- Browser: click "Заказать" → new row in database (check via GET /api/orders or prisma studio)
- Browser: click "Заказать" → Telegram opens with pre-filled message containing design code
- Browser: GET /api/orders returns the created order with designCode, status "new", and createdAt

## Constraints

- **SQLite for local dev** (D024): Order model uses SQLite provider same as Template. No changes needed for local dev.
- **No user authentication** (R014 deferred): Orders are anonymous — no userId field. This is intentional per D011 (minimal friction).
- **Telegram deep link only** (D008): No Bot API, no server-side Telegram calls. Just `window.open("https://t.me/VoronovAndrey?text=...")`.
- **Mobile-first toolbar layout**: EditorToolbar already has 4 buttons on mobile. Adding a 5th needs careful layout — consider making "Заказать" visually prominent (different color) or wrapping to a second row if 5 buttons overflow.

## Common Pitfalls

- **Toolbar overflow on mobile**: Adding a 5th button may cause horizontal overflow on narrow screens. The existing 4 buttons (Каталог, Удалить, Поделиться, Сброс) are already tight. Consider: making the order button full-width above the existing row, or reducing button labels to icons-only on small screens.
- **Empty design submission**: "Заказать" should be disabled when `beads.length === 0` (same guard as the share button's `canShare` check).
- **Race condition on rapid clicks**: Use disabled/loading state during the fetch call to prevent duplicate order creation.
- **Telegram URL encoding**: The `text` parameter in the Telegram deep link must be properly `encodeURIComponent`-encoded. The design code from `encodeDesign` is already URL-safe (base64url), but the surrounding Russian text needs encoding.

## Forward Intelligence

### What the next slice should know (S06 — Админка)
- Order model has `status` field (new/processing/completed) — S06 admin page will need PATCH /api/orders/[id]/status (not created in S05, but schema should support it).
- GET /api/orders returns all orders — S06 admin will likely want filtering/pagination eventually.
- The Telegram link generator is a pure function in `src/lib/telegram.ts` — S06 could extend it if the Telegram username or message format changes.
