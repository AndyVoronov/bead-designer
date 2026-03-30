# S03: Каталог бусин + редактор UI — UAT

**Milestone:** M001
**Written:** 2026-03-30

## UAT Type

- UAT mode: mixed (artifact-driven automated checks + live-runtime browser verification)
- Why this mode is sufficient: The slice integrates 3D physics, DOM UI, and Zustand state — all must wire together at runtime. Automated tests prove store logic and data integrity; browser checks prove the integrated experience (catalog ↔ store ↔ 3D scene).

## Preconditions

- `npm run dev` running (from real path, not junction — see D015)
- Browser accessible at localhost:3000
- Mobile viewport available (390×844 emulation or real device)

## Smoke Test

1. Open `http://localhost:3000` in browser
2. **Expected:** 3D bead chain renders with pacifier clip at anchor, toolbar visible at bottom with "7 бусин" count and three action buttons

## Test Cases

### 1. Catalog opens with animation

1. Tap "Каталог" button in toolbar
2. **Expected:** Bottom sheet slides up from bottom with 300ms animation. Header shows "Каталог бусин" with close button. 5 filter chips visible (Все, Дерево, Силикон, Вязаное, Пластик). Grid of bead cards with colored circles, Russian names, material labels.

### 2. Material filters work

1. With catalog open, tap "Дерево" filter chip
2. **Expected:** Grid shows ~25 wood-toned beads only. Active chip has visual indicator (aria-pressed). Other beads hidden.
3. Tap "Все" chip
4. **Expected:** All 100 beads visible again

### 3. Add bead from catalog to chain

1. With catalog open on "Все", note the bead count in toolbar (e.g., "7 бусин")
2. Tap any bead card in the grid (e.g., "Розовое облако")
3. **Expected:** Bead count in toolbar increments (e.g., "8 бусин"). New bead appears in 3D chain. Catalog stays open.
4. Tap another bead card
5. **Expected:** Count increments again (e.g., "9 бусин"). Second bead added to chain.

### 4. Close catalog

1. Tap ✕ button in catalog header, or tap "Закрыть" in toolbar
2. **Expected:** Catalog slides down and hides. 3D canvas fully visible. Toolbar shows updated bead count.

### 5. Tap-to-select bead in 3D

1. Quickly tap (press and release within 200ms, minimal movement) on any bead in the 3D chain
2. **Expected:** Bead gets golden wireframe highlight. Toolbar "Удалить" button becomes enabled.
3. Tap a different bead
4. **Expected:** First bead deselects, second bead highlights. "Удалить" remains enabled.

### 6. Deselect by tapping empty space

1. With a bead selected, tap on empty space in the 3D scene (not on any bead)
2. **Expected:** Selection clears (no highlight). "Удалить" button becomes disabled.

### 7. Remove selected bead

1. Select a bead in 3D (tap it)
2. Note bead count in toolbar (e.g., "9 бусин")
3. Tap "Удалить" in toolbar
4. **Expected:** Selected bead disappears from chain. Bead count decreases by 1 (e.g., "8 бусин"). Selection clears.

### 8. Reset chain

1. Add several beads from catalog (count > 7)
2. Tap "Сброс" in toolbar
3. **Expected:** Chain returns to default 7 beads. Bead count shows "7 бусин". No selection active. All catalog-added beads gone.

### 9. Drag still works (tap vs drag distinction)

1. Press and hold on a 3D bead for >200ms, then move pointer
2. **Expected:** Bead drags (kinematic mode). No selection highlight appears. On release, bead swings with physics. Selection remains null.

### 10. Pacifier clip visible

1. Look at the top of the bead chain (anchor point)
2. **Expected:** Metallic silver clip shape visible (torus ring + cylinder arm), NOT a plain gray sphere

### 11. Mobile viewport layout

1. Set browser viewport to 390×844 (iPhone 14 Pro)
2. Reload page
3. **Expected:** 3D canvas fills screen above toolbar. Toolbar buttons visible and tappable. Catalog opens fully within viewport. Bead grid scrollable. Touch scroll in catalog does NOT rotate/pan the 3D scene.

## Edge Cases

### Max chain length (40 beads)

1. Open catalog, add beads rapidly until reaching 40
2. Try to add the 41st bead
3. **Expected:** No crash. Bead count stays at 40. No visual feedback (known limitation — S04 may add toast).

### Add bead with invalid ID

1. In browser console: `useDesignStore.getState().addBead("nonexistent-id")`
2. **Expected:** No crash. Bead count unchanged. Store returns without mutation.

### Remove non-existent bead

1. In browser console: `useDesignStore.getState().removeBead("fake-id")`
2. **Expected:** No crash. Store returns without mutation.

### Remove when nothing selected

1. With no bead selected, tap "Удалить" button
2. **Expected:** Button is disabled, nothing happens. No crash.

### Rapid add/remove cycle

1. Open catalog, rapidly tap 5 different beads to add
2. Close catalog, tap beads in 3D to select, tap "Удалить" 5 times
3. **Expected:** Chain returns toward original state. No physics glitches, no dangling joints.

## Failure Signals

- **Store broken:** Toolbar bead count doesn't update, or add/remove buttons have no effect
- **Physics broken after add/remove:** Beads fall through floor, joints detach, chain separates
- **Touch isolation broken:** Scrolling catalog causes 3D scene to rotate/pan
- **Tap detection broken:** Either all taps become drags (can't select) or all drags become taps (can't drag)
- **Build errors:** `npm run build` or `npx tsc --noEmit` fails
- **Test failures:** `npx vitest run` shows any test failures

## Not Proven By This UAT

- **Real mobile device performance** — testing on emulated viewport only, not actual phone hardware
- **Bead reorder** — not implemented in this slice (R005 partial)
- **Database persistence** — Prisma schema written but no migrations or DB connection
- **PNG textures on catalog beads** — catalog uses hex colors, not texture images
- **Long chain stability** — tested up to ~21 beads in S02, not 40-bead max from S03
- **Concurrent rapid interactions** — stress test of rapid add/remove with physics simulation

## Notes for Tester

- The dev server MUST run from the real path (see D015 in DECISIONS.md), not the junction path
- Pre-existing Three.js deprecation warnings in console are expected and harmless
- Catalog stays open after adding a bead — this is intentional UX for batch-adding
- The "Удалить" button only removes the currently selected bead (golden highlight). If no bead is selected, it's disabled
- Drag vs tap: quick taps (<200ms, <0.05 NDC movement) select beads. Longer press-and-move drags them
- Pacifier clip is at the TOP of the chain (fixed anchor), not on a bead
