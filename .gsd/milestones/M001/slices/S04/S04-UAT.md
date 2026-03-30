# S04: Шаблоны + шеринг — UAT

**Milestone:** M001
**Written:** 2026-03-30

## UAT Type

- UAT mode: live-runtime
- Why this mode is sufficient: This slice delivers user-facing URL-based sharing and template browsing that requires a running Next.js server, a populated database, and browser interaction. Contract tests prove serialization correctness; this UAT proves the full user experience.

## Preconditions

1. PostgreSQL or SQLite database is migrated and seeded with 8 templates (`npx prisma db seed`)
2. Next.js dev server running (`npm run dev`) from the real path (not junction)
3. Browser accessible at `http://localhost:3000`

## Smoke Test

Open `http://localhost:3000` — the home page should show a gradient background with "Конструктор бусин" heading and a horizontal-scroll gallery of template cards, each showing colored dot previews and Russian names. A dashed "Начать с нуля" card should be visible at the end.

## Test Cases

### 1. Home page template gallery renders

1. Navigate to `http://localhost:3000`
2. Scroll down past the hero section
3. **Expected:** 8 template cards displayed in horizontal scroll, each showing:
   - Row of small colored circles (bead color preview, up to 8 dots)
   - Russian template name (e.g., "Лесная сказка", "Морской бриз")
   - Bead count in Russian (e.g., "12 бусин", "15 бусин")
4. **Expected:** "Начать с нуля" card at the end with dashed border

### 2. Template loads in editor

1. On home page, click any template card
2. Wait for page navigation
3. **Expected:** URL changes to `/design/[code]` where `[code]` is a compressed string
4. **Expected:** Editor canvas renders with the correct beads from the template (toolbar shows bead count matching the template card)
5. **Expected:** 3D scene shows beads hanging on a chain with physics

### 3. "Начать с нуля" opens blank editor

1. On home page, click "Начать с нуля" card
2. **Expected:** Navigates to `/editor`
3. **Expected:** Editor shows blank canvas with 0 beads (toolbar shows "0 бусин")

### 4. Share button generates valid URL

1. Open any template or add beads via catalog in the editor
2. Click "Поделиться" button in toolbar (between "Удалить" and "Сброс")
3. **Expected:** Button text changes to "Скопировано!" briefly (2 seconds)
4. **Expected:** A URL of the form `http://localhost:3000/design/[code]` is copied to clipboard
5. Paste the URL into a new browser tab and navigate to it
6. **Expected:** Editor loads with the exact same beads as the original

### 5. Invalid design code shows error state

1. Navigate to `http://localhost:3000/design/invalid-code-12345`
2. **Expected:** Error state displayed with "Неверная ссылка" message
3. **Expected:** "Вернуться на главную" link is visible and navigates back to `/`

### 6. API endpoints return correct data

1. Navigate to `http://localhost:3000/api/templates`
2. **Expected:** JSON array of 8 objects, each with `id`, `name`, `designCode`, `beadCount`, `isApproved`, `isUserSubmitted`, `createdAt`
3. Note a template's `designCode` value
4. Navigate to `http://localhost:3000/api/templates/[that-code]` (encode `+` as `%2B` if present)
5. **Expected:** Single JSON object matching that template (200)
6. Navigate to `http://localhost:3000/api/templates/nonexistent`
7. **Expected:** `{"error":"Not found"}` (404)

### 7. Mobile viewport template gallery

1. Open browser DevTools and set viewport to 390px width (iPhone 14 Pro)
2. Navigate to `http://localhost:3000`
3. **Expected:** Template gallery scrolls horizontally on swipe
4. Click a template card
5. **Expected:** Editor loads correctly on mobile viewport

## Edge Cases

### Design with no catalog beads cannot be shared

1. Open `/editor` (blank editor with 0 beads)
2. **Expected:** "Поделиться" button is disabled (grayed out)
3. Add a bead from the catalog
4. **Expected:** "Поделиться" button becomes enabled

### Malformed URL code

1. Navigate to `http://localhost:3000/design/%00%01%02`
2. **Expected:** Graceful error state (no crash, no infinite loading)

### Multiple rapid template clicks

1. On home page, rapidly click two different template cards
2. **Expected:** Final navigation shows the last-clicked template (no race condition or mixed beads)

## Failure Signals

- Home page shows loading spinner indefinitely → API fetch failed (check `/api/templates` returns 200)
- Template click leads to editor with wrong beads → serialization or store load bug (check `useDesignStore.getState().beads` in console)
- "Поделиться" button throws error in console → clipboard API not available (needs HTTPS or localhost)
- `/design/[code]` shows infinite loading → `decodeDesign` returning null silently or store not updating
- Build fails → TypeScript error in new files
- Tests fail → serialization round-trip broken

## Not Proven By This UAT

- Real device sharing (clipboard behavior on mobile Safari/Chrome) — deferred to S07
- Concurrent database access under load — single-user assumption holds
- Template CRUD by admin — S06 deliverable
- User-submitted design approval flow — S06 deliverable
- Share URL survival across app restarts / cache clears
- Long design codes (>2000 chars URL length limits) — all current templates produce short codes

## Notes for Tester

- Design codes contain `+` characters from lz-string compression. When constructing URLs manually (e.g., in API tests), encode `+` as `%2B`.
- The share button's clipboard functionality only works on HTTPS or localhost. On plain HTTP, it will fail silently (error logged to console).
- Template IDs in the database start at 9 (not 1) due to re-seeding during development — this is cosmetic and doesn't affect functionality.
- WebGL context loss may occur if the HDR environment map fails to load through the proxy — this is a pre-existing infrastructure issue unrelated to S04. Refresh the page if the 3D scene appears blank.
- The home page has no 3D canvas — it's intentionally lightweight HTML/CSS only.
