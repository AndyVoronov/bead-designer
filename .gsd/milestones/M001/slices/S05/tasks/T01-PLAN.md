---
estimated_steps: 6
estimated_files: 4
---

# T01: Order model, API endpoints, and Telegram link generator

**Slice:** S05 — Заказ + Telegram
**Milestone:** M001

## Description

Add the Order model to Prisma schema, run migration, create POST/GET /api/orders API endpoints, and build the Telegram deep link generator with unit tests. This task establishes all backend infrastructure that T02 will wire to the UI.

## Steps

1. **Add Order model to `prisma/schema.prisma`** — Add after the Template model:
   ```
   model Order {
     id          Int      @id @default(autoincrement())
     designCode  String   @unique
     designState String   // JSON string of SerializableDesign
     status      String   @default("new")  // "new" | "processing" | "completed"
     beadCount   Int
     createdAt   DateTime @default(now())
   }
   ```
   Note: `designState` is stored as a String (not Json type) because SQLite's JSON support varies and the serialized JSON from `encodeDesign` is already a compact string. If using PostgreSQL in production, this could become `Json` type.

2. **Run Prisma migration** — Execute `npx prisma migrate dev --name add-order-model`. This creates the Order table in SQLite and generates the migration file. The Prisma client will auto-regenerate.

3. **Create `src/lib/telegram.ts`** — Pure function:
   ```typescript
   export function generateTelegramLink(designCode: string, beadCount: number): string {
     const message = `Здравствуйте! Хочу заказать изделие.\nКод: ${designCode}\nБусин: ${beadCount}`;
     return `https://t.me/VoronovAndrey?text=${encodeURIComponent(message)}`;
   }
   ```
   The Telegram username `VoronovAndrey` is from D008. Use `encodeURIComponent` on the full message (Russian text + special characters).

4. **Create `src/app/api/orders/route.ts`** — Two handlers:
   - **POST**: Parse body `{ designCode: string, beadCount: number }`. Validate both fields exist and are non-empty. Create `prisma.order.create({ data: { designCode, designState: JSON.stringify({ designCode, beadCount }), status: "new", beadCount } })`. Return `NextResponse.json(order, { status: 201 })`. On error, return 500 with `{ error: string }`.
   - **GET**: Call `prisma.order.findMany({ orderBy: { createdAt: "desc" } })`. Return `NextResponse.json(orders)`.
   Follow the exact same patterns as `src/app/api/templates/route.ts` (import prisma, NextResponse.json).

5. **Create `src/lib/__tests__/telegram.test.ts`** — Unit tests:
   - Returns URL starting with `https://t.me/VoronovAndrey?text=`
   - Contains `encodeURIComponent`-encoded Russian text
   - Design code appears in the URL
   - Bead count appears in the URL
   - Handles special characters in design code
   Use the same test patterns as `src/lib/__tests__/serialization.test.ts` (describe/it/expect from vitest).

6. **Verify everything** — Run `npx vitest run`, `npx tsc --noEmit`, and `npm run build`. All must pass clean. Test the API endpoints in the browser: GET /api/orders should return empty array `[]`, POST /api/orders with `{ designCode: "test-code", beadCount: 5 }` should return the created order, then GET should show it.

## Must-Haves

- [ ] Order model in prisma/schema.prisma with all required fields
- [ ] Migration applied (prisma/migrations/ has new migration)
- [ ] POST /api/orders creates order in DB and returns it
- [ ] GET /api/orders returns all orders sorted by createdAt desc
- [ ] generateTelegramLink produces correct Telegram deep link URL
- [ ] Unit tests for generateTelegramLink pass
- [ ] TypeScript clean, production build succeeds

## Verification

- `npx vitest run src/lib/__tests__/telegram.test.ts` — all tests pass
- `npx tsc --noEmit` — zero errors
- `npm run build` — succeeds
- Browser: `GET /api/orders` returns `[]` (before any orders)
- Browser: POST to `/api/orders` with `{"designCode":"test","beadCount":3}` returns order object with id, status "new", createdAt
- Browser: After POST, `GET /api/orders` returns array containing the created order

## Inputs

- `prisma/schema.prisma` — existing schema with Bead and Template models; add Order model here
- `src/lib/prisma.ts` — Prisma client singleton with LibSql adapter; import and use in API route
- `src/app/api/templates/route.ts` — reference pattern for Next.js API route structure (import prisma, NextResponse.json)

## Expected Output

- `prisma/schema.prisma` — modified with Order model
- `prisma/migrations/` — new migration directory for add-order-model
- `src/app/api/orders/route.ts` — POST + GET handlers for orders
- `src/lib/telegram.ts` — generateTelegramLink pure function
- `src/lib/__tests__/telegram.test.ts` — unit tests for Telegram link generator
