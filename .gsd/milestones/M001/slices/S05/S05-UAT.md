# S05: Заказ + Telegram — UAT

**Milestone:** M001
**Written:** 2026-03-30

## UAT Type

- UAT mode: live-runtime
- Why this mode is sufficient: The order flow is a browser→API→DB→external-URL chain. Every step can be verified programmatically via HTTP responses and DOM state. No human aesthetic judgment is required — the button is either clickable and functional or it isn't.

## Preconditions

- Dev server running from real path: `C:\Users\Andy\.gsd\projects\...\.gsd\worktrees\M001` (not junction `D:\...`)
- Database seeded: `npx prisma db push --force-reset && npx prisma db seed`
- Browser open at `http://localhost:3000/editor`

## Smoke Test

Navigate to `/editor`. The toolbar at the bottom should show a green "Заказать" button with opacity 0.3 (disabled — no beads on chain). Add one bead from the catalog. Button becomes full opacity and clickable.

## Test Cases

### 1. Order button visibility and disabled state

1. Open `/editor` in browser
2. Observe the toolbar at the bottom of the screen
3. **Expected:** Green "🛒 Заказать" button is visible but grayed out (opacity 0.3), cursor not allowed
4. Tap "Каталог" to open the bead catalog
5. Tap any bead card to add it to the chain
6. **Expected:** "Заказать" button becomes full green (opacity 1), cursor changes to pointer

### 2. Full order creation flow

1. In the editor, add at least 3 beads from the catalog (different materials for variety)
2. Click the green "Заказать" button
3. **Expected:** Button text changes to "Отправка..." and becomes disabled during the API call
4. Open browser DevTools → Network tab, verify POST /api/orders request sent with body `{ designCode: "...", beadCount: 3 }`
5. **Expected:** Response status 201, response body contains order object with `id`, `designCode`, `status: "new"`, `beadCount: 3`, `createdAt` timestamp
6. **Expected:** A new browser tab opens with URL starting with `https://t.me/VoronovAndrey?text=...`
7. In the new tab, verify the pre-filled message contains:
   - Russian greeting: "Здравствуйте! Хочу заказать изделие."
   - Design code (the encoded string from step 5)
   - Bead count: "Бусин: 3"
8. Close the Telegram tab, return to the editor
9. Navigate to `http://localhost:3000/api/orders` in browser
10. **Expected:** JSON array with one order object matching the created order

### 3. Multiple orders accumulate correctly

1. Create an order with 3 beads (as in test case 2)
2. Remove all beads (click "Сброс")
3. Add 5 beads from the catalog
4. Click "Заказать" again
5. Navigate to `http://localhost:3000/api/orders`
6. **Expected:** JSON array with 2 orders, newest first (5-bead order first, then 3-bead order)
7. **Expected:** Each order has unique `id`, correct `beadCount`, and `status: "new"`

### 4. Double-submit protection

1. Add 3 beads to the chain
2. Open DevTools → Network tab, set "Slow 3G" throttling
3. Click "Заказать"
4. Immediately try to click "Заказать" again (while "Отправка..." is shown)
5. **Expected:** Button is disabled during the first request — second click has no effect
6. **Expected:** Only one POST /api/orders request is sent
7. **Expected:** GET /api/orders returns only 1 new order (plus any from test case 3)

### 5. Empty design cannot be ordered

1. Click "Сброс" to clear all beads
2. Verify 0 beads on chain
3. **Expected:** "Заказать" button is disabled (opacity 0.3), cursor not allowed
4. Attempt to click "Заказать"
5. **Expected:** No API request is sent, no navigation occurs

## Edge Cases

### API validation — missing fields

1. Open DevTools console, run: `fetch('/api/orders', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}' })`
2. **Expected:** Response status 400, body contains `{ "error": "designCode and beadCount are required" }`

### API validation — missing beadCount

1. Run: `fetch('/api/orders', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{"designCode":"test"}' })`
2. **Expected:** Response status 400

### Telegram link encoding — special characters

1. The unit tests cover this: `npx vitest run src/lib/__tests__/telegram.test.ts`
2. **Expected:** All 7 tests pass, verifying encodeURIComponent handles Russian text, special characters, and newlines in the Telegram URL

## Failure Signals

- GET /api/orders returns 500 → Prisma client or DB connection issue (check `prisma.config.ts` and `.env`)
- "Заказать" button click does nothing → check browser console for `Failed to create order:` error
- Telegram link opens but message is empty or garbled → encodeURIComponent issue in `src/lib/telegram.ts`
- Button stays on "Отправка..." permanently → API call hung (check Network tab for pending request)
- `npm run build` fails with Prisma type errors → clear `.next` cache and retry

## Not Proven By This UAT

- Real mobile device behavior (tested on mobile viewport emulation only)
- Actual Telegram delivery (link is generated correctly but message delivery depends on Telegram app being installed and `@VoronovAndrey` account existing)
- Order persistence across server restarts (SQLite file persistence not explicitly tested)
- Concurrent order creation from multiple clients

## Notes for Tester

- Dev server must run from the real Windows path (`C:\Users\Andy\.gsd\projects\...`), not the junction drive (`D:\...`). Running from the junction causes Next.js path corruption.
- Pre-existing "Cannot read properties of undefined (reading 'x')" errors from the 3D scene renderer may appear in console — these are unrelated to the order flow.
- If the `.next` cache has stale Prisma types after schema changes, delete the `.next` folder and restart.
- The Telegram deep link opens in a new tab (`_blank`). If Telegram desktop is installed, it may intercept the link directly. If not, the browser navigates to `t.me/VoronovAndrey`.
