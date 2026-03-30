# S05: Заказ + Telegram

**Goal:** Кнопка «Заказать» сохраняет заказ в БД и открывает Telegram с менеджером с предзаполненным сообщением и кодом изделия.
**Demo:** В редакторе с 3+ бусинами нажимаем «Заказать» → заказ появляется в БД (GET /api/orders) → открывается Telegram с текстом вида «Здравствуйте! Хочу заказать изделие. Код: xxx. Бусин: 5».

## Must-Haves

- Order model в Prisma schema с полями: id, designCode, designState (JSON), status, beadCount, createdAt
- POST /api/orders — создаёт заказ из designCode и beadCount, возвращает объект заказа
- GET /api/orders — возвращает список всех заказов (для S06 админки), сортировка по createdAt desc
- generateTelegramLink(designCode, beadCount) — формирует deep link на t.me/VoronovAndrey с предзаполненным русским сообщением
- Кнопка «Заказать» в EditorToolbar — видна когда beads.length > 0, вызывает encodeDesign → POST /api/orders → window.open(telegramLink)
- Защита от двойного нажатия (disabled + loading state во время fetch)
- Unit-тесты для Telegram link generator
- TypeScript без ошибок, production build проходит

## Proof Level

- This slice proves: integration
- Real runtime required: yes (browser verification of full order flow)
- Human/UAT required: no (automated checks sufficient)

## Verification

- `npx vitest run` — все тесты проходят (существующие + новые)
- `npx tsc --noEmit` — zero type errors
- `npm run build` — production build succeeds
- Browser: GET /api/orders returns array (initially empty)
- Browser: в редакторе с 3+ бусинами кнопка «Заказать» видима и кликабельна
- Browser: клик «Заказать» → GET /api/orders возвращает созданный заказ со статусом "new" и designCode
- Browser: клик «Заказать» → открывается страница t.me/VoronovAndrey с предзаполненным текстом

## Observability / Diagnostics

- Runtime signals: order created with status "new" + designCode in DB
- Inspection surfaces: GET /api/orders returns all orders; `npx prisma studio` for DB inspection
- Failure visibility: console.error in EditorToolbar catch block; API returns 500 JSON on DB errors
- Redaction constraints: none — orders are anonymous, no PII

## Integration Closure

- Upstream surfaces consumed: `encodeDesign` from `src/lib/serialization.ts`, `useDesignStore` from `src/stores/useDesignStore.ts`, `EditorToolbar` component from `src/components/editor/EditorToolbar.tsx`, Prisma client from `src/lib/prisma.ts`
- New wiring introduced in this slice: POST /api/orders endpoint, GET /api/orders endpoint, toolbar button → API → Telegram deep link
- What remains before the milestone is truly usable end-to-end: S06 админка (просмотр заказов, управление шаблонами), S07 деплой на VPS + HTTPS

## Tasks

- [x] **T01: Order model, API endpoints, and Telegram link generator** `est:30m`
  - Why: Устанавливает backend foundation — schema, migration, endpoints, и pure function для Telegram URL. Всё что нужно T02 для подключения UI.
  - Files: `prisma/schema.prisma`, `src/app/api/orders/route.ts`, `src/lib/telegram.ts`, `src/lib/__tests__/telegram.test.ts`
  - Do: (1) Добавить Order model в schema.prisma с полями: id (Int, autoincrement), designCode (String, unique), designState (String, JSON), status (String, default "new"), beadCount (Int), createdAt. (2) Запустить `npx prisma migrate dev --name add-order-model`. (3) Создать POST handler в /api/orders/route.ts — принимает { designCode: string, beadCount: number }, создаёт запись в БД, возвращает объект заказа. (4) Создать GET handler — findMany с orderBy createdAt desc. (5) Создать src/lib/telegram.ts с generateTelegramLink(designCode, beadCount) → возвращает `https://t.me/VoronovAndrey?text=...` с encodeURIComponent для русского текста. (6) Написать unit-тесты для generateTelegramLink.
  - Verify: `npx vitest run src/lib/__tests__/telegram.test.ts`, `npx tsc --noEmit`, `npm run build`
  - Done when: Миграция применена, GET/POST /api/orders работают (проверить через browser или curl), Telegram link тесты проходят, TypeScript clean
- [x] **T02: "Заказать" button in EditorToolbar with full order flow** `est:20m`
  - Why: Замыкает полный цикл заказа — пользователь нажимает кнопку, данные летят в API, открывается Telegram. Это основное требование R007.
  - Files: `src/components/editor/EditorToolbar.tsx`
  - Do: (1) Добавить «Заказать» как полный яркий CTA кнопку выше существующего row с action buttons. Использовать зелёный/emerald цвет чтобы выделить как primary action. (2) Кнопка disabled когда beads.length === 0 (аналогично canShare). (3) onClick: encodeDesign(beads) → fetch POST /api/orders → получить designCode из ответа → window.open(generateTelegramLink(designCode, beads.length)). (4) Добавить loading state (isOrdering) с disabled во время fetch для предотвращения дублирования заказов. (5) Добавить TryIcon SVG для кнопки. (6) Обработать ошибки fetch (console.error + alert или visual feedback).
  - Verify: Browser — с бусинами кнопка видима, клик → GET /api/orders показывает новый заказ, Telegram открывается
  - Done when: Полный цикл работает end-to-end в browser: кнопка → POST → DB → Telegram redirect

## Files Likely Touched

- `prisma/schema.prisma`
- `prisma/migrations/` (auto-generated)
- `src/app/api/orders/route.ts`
- `src/lib/telegram.ts`
- `src/lib/__tests__/telegram.test.ts`
- `src/components/editor/EditorToolbar.tsx`
