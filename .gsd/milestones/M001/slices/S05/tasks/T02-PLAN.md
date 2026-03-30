---
estimated_steps: 5
estimated_files: 1
---

# T02: "Заказать" button in EditorToolbar with full order flow

**Slice:** S05 — Заказ + Telegram
**Milestone:** M001

## Description

Add a prominent "Заказать" (Order) CTA button to the EditorToolbar that completes the full order cycle: encode the current design → POST to /api/orders → open Telegram with a pre-filled message. This is the primary user-facing deliverable for R007.

## Steps

1. **Add state for ordering flow** — In `EditorToolbar.tsx`, add two new state variables:
   - `const [isOrdering, setIsOrdering] = useState(false)` — disables button during API call
   - `const [orderError, setOrderError] = useState<string | null>(null)` — shows error feedback
   
   Add `orderError` cleanup in the existing `useEffect` timeout pattern (clear after 3 seconds).

2. **Add the order handler function** — Create `handleOrder` async callback:
   ```typescript
   const canOrder = beads.length > 0;
   const handleOrder = useCallback(async () => {
     if (!canOrder || isOrdering) return;
     setIsOrdering(true);
     setOrderError(null);
     try {
       const code = encodeDesign(beads);
       if (!code) return;
       const res = await fetch("/api/orders", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ designCode: code, beadCount: beads.length }),
       });
       if (!res.ok) throw new Error("Order failed");
       const order = await res.json();
       const link = generateTelegramLink(order.designCode, order.beadCount);
       window.open(link, "_blank", "noopener");
     } catch (err) {
       console.error("Failed to create order:", err);
       setOrderError("Не удалось создать заказ");
     } finally {
       setIsOrdering(false);
     }
   }, [beads, canOrder, isOrdering]);
   ```
   Import `encodeDesign` (already imported) and `generateTelegramLink` from `@/lib/telegram`.

3. **Add the "Заказать" button to the JSX** — Place it as a **full-width button ABOVE** the existing action row (before the flex row with gap-2). This avoids the 5-button overflow problem. Use a distinctive green/emerald color to make it stand out as the primary CTA per D011 (minimal friction):
   ```tsx
   {/* ── Order CTA (full-width above actions) ──────────────── */}
   <button
     onClick={handleOrder}
     disabled={!canOrder || isOrdering}
     className="w-full py-2.5 text-sm font-semibold rounded-xl text-white transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer select-none active:scale-[0.98]"
     style={{ backgroundColor: isOrdering ? "#9ca3af" : "#10b981" }}
   >
     {isOrdering ? "Отправка..." : orderError ? orderError : "🛒 Заказать"}
   </button>
   ```
   The toolbar structure becomes: bead count (left) + action buttons (right) wrapped in a flex-col with the order button on top.

4. **Restructure toolbar layout** — Change the outer `div` from `flex items-center justify-between` to `flex flex-col gap-2`. The order button sits above the existing `flex items-center justify-between` row. This gives the order button full width while keeping the existing buttons in their row.

5. **Verify the full flow** — In the browser:
   - Open /editor, verify "Заказать" button is visible and green when beads exist
   - Open /editor with empty design (0 beads), verify "Заказать" is disabled
   - Click "Заказать" → observe button shows "Отправка..." briefly
   - Check GET /api/orders returns the created order with status "new" and designCode
   - Verify Telegram page opens (t.me/VoronovAndrey) with pre-filled message text containing the design code and bead count
   - Verify no console errors

## Must-Haves

- [ ] "Заказать" button visible in toolbar when beads.length > 0
- [ ] Button disabled when beads.length === 0
- [ ] Button shows loading state ("Отправка...") during API call
- [ ] Button disabled during API call to prevent double submission
- [ ] Click calls POST /api/orders with designCode and beadCount
- [ ] On success, opens Telegram deep link in new tab
- [ ] On error, shows error feedback and logs to console
- [ ] Error state clears after timeout
- [ ] Toolbar layout works on mobile without overflow

## Verification

- `npx tsc --noEmit` — zero errors (import of generateTelegramLink resolves)
- `npm run build` — succeeds
- Browser: toolbar shows "Заказать" button with green background
- Browser: click "Заказать" → GET /api/orders returns new order with status "new"
- Browser: Telegram opens (t.me/VoronovAndrey) with pre-filled Russian text containing design code
- Browser: empty design → button is disabled (opacity-30)

## Observability Impact

- Signals added: `console.error("Failed to create order:", err)` on fetch failure
- How a future agent inspects this: Browser console for errors, GET /api/orders for created orders, `npx prisma studio` for DB state
- Failure state exposed: button text changes to error message for 3 seconds, console.error with full error details

## Inputs

- `src/components/editor/EditorToolbar.tsx` — existing toolbar with 4 buttons (Каталог, Удалить, Поделиться, Сброс); add "Заказать" button
- `src/lib/serialization.ts` — encodeDesign function for serializing current bead design
- `src/lib/telegram.ts` — generateTelegramLink function from T01
- `src/app/api/orders/route.ts` — POST endpoint from T01
- `src/stores/useDesignStore.ts` — beads array for current design state

## Expected Output

- `src/components/editor/EditorToolbar.tsx` — modified with "Заказать" CTA button, order handler, loading/error states, restructured layout
