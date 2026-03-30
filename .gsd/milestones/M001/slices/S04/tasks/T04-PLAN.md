---
estimated_steps: 6
estimated_files: 3
---

# T04: Template browser + home page redesign

**Slice:** S04 — Шаблоны + шеринг
**Milestone:** M001

## Description

Transform the home page from a bare `<EditorCanvas />` into a welcoming template gallery. Users browse pre-made templates as cards with bead color previews, tap one to open it in the editor, or tap "Начать с нуля" to start from scratch. This closes the template browsing loop — R006's primary user-facing deliverable.

**Key patterns from prior slices:**
- S03 established glass-morphism (bg-white/70 backdrop-blur-md), rounded-xl cards, scale-on-press (active:scale-95), and mobile-first Tailwind styling. Follow these patterns for visual consistency.
- The template browser is a pure HTML/CSS component — no 3D canvas on the home page. Keep it lightweight.
- Use `getCatalogBead(id)` from `src/data/catalogBeads.ts` to resolve catalog bead IDs to their colors for the preview dots.
- The API route `GET /api/templates` (from T02) returns template objects with `{ id, name, designCode, beadCount, isApproved, isUserSubmitted, createdAt }`.

## Steps

1. Create `src/components/templates/TemplateCard.tsx` ("use client"):
   - Props: `{ name: string; designCode: string; beadCount: number }`
   - Decode the designCode to get the bead IDs: `decodeDesign(designCode)` from `@/lib/serialization`
   - Render a row of small colored circles (8px × 8px, rounded-full) showing the first 6–8 bead colors. For each catalogBeadId, look up the bead via `getCatalogBead(id)` and use its `color` field. If lookup fails, show a gray placeholder dot.
   - Template name as a bold label (Russian)
   - Bead count as a small subtitle (e.g., "12 бусин")
   - The entire card is wrapped in a `<Link href={`/design/${designCode}`}>` for navigation
   - Styling: `bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-4` with a subtle border. `active:scale-95` for tap feedback. Minimum height for tap target (48px+).
   - No 3D rendering — just colored dots and text

2. Create `src/components/templates/TemplateBrowser.tsx` ("use client"):
   - On mount, fetch `GET /api/templates` via native `fetch()`. Store in `useState<Template[]>([])`.
   - Loading state: skeleton cards (animated pulse placeholders) or a simple "Загрузка..." text
   - Error state: "Не удалось загрузить шаблоны" with a retry button
   - Render a horizontal-scroll container of `TemplateCard` components
   - Add a "Начать с нуля" card at the end (or beginning) — styled as a dashed-border card with a "+" icon and text. Links to `/editor`.
   - Scroll container: `flex gap-4 overflow-x-auto px-4 pb-4 snap-x` with `snap-start` on each card for nice mobile scrolling
   - Include a section heading above the scroll: "Шаблоны" in bold

3. Redesign `src/app/page.tsx` as a Server Component:
   - Remove the current `<EditorCanvas />` import
   - Create a welcoming layout:
     - Top section: app title "Конструктор бусин" with a subtitle like "Выберите шаблон или создайте своё изделие" (Russian)
     - Main section: `<TemplateBrowser />` component
     - Bottom: optional subtle footer or branding
   - Mobile-first: full-width, no horizontal overflow
   - Styling: clean, minimal, consistent with the app's soft color palette. Use `bg-gradient-to-b from-white to-gray-50` for a subtle background. Large heading, comfortable spacing.
   - No 3D canvas, no heavy JavaScript on the home page

4. Verify in browser:
   - Home page loads with template gallery
   - Horizontal scroll works on mobile viewport (resize to 390px)
   - Clicking a template navigates to `/design/[code]` and loads the correct beads
   - "Начать с нуля" navigates to `/editor` (blank editor)
   - Loading state shows while templates are being fetched
   - Cards look good visually — colored dots are visible and distinguishable

5. Verify build:
   - `tsc --noEmit` — zero errors
   - `npm run build` — production build succeeds

6. Final integration check:
   - Start dev server, navigate through the full flow: `/` → see templates → click one → `/design/[code]` → editor with beads → click "Поделиться" → copy URL → paste in new tab → same design loads → click "Начать с нуля" link → `/editor` → blank editor

**Relevant skills:** `frontend-design` for the template gallery layout and card design.

## Must-Haves

- [ ] Home page shows template gallery with cards in horizontal scroll
- [ ] Each template card shows colored dot preview of bead colors + name + bead count
- [ ] Clicking a template navigates to `/design/[code]` with correct design loaded
- [ ] "Начать с нуля" card links to `/editor`
- [ ] Loading and error states for API fetch
- [ ] Mobile-friendly layout (390px viewport)
- [ ] No 3D canvas on home page (lightweight, fast load)

## Verification

- `tsc --noEmit` — zero TypeScript errors
- `npm run build` — production build succeeds
- Manual: home page renders template cards with colored dots
- Manual: horizontal scroll works on narrow viewport
- Manual: click template → editor loads with correct beads
- Manual: click "Начать с нуля" → blank editor

## Inputs

- `src/app/api/templates/route.ts` — GET /api/templates endpoint (from T02)
- `src/lib/serialization.ts` — decodeDesign used by TemplateCard to preview bead colors
- `src/data/catalogBeads.ts` — getCatalogBead used to resolve bead IDs to colors
- `src/app/page.tsx` — current home page to be redesigned

## Expected Output

- `src/components/templates/TemplateCard.tsx` — individual template card with bead color preview
- `src/components/templates/TemplateBrowser.tsx` — horizontal-scroll template gallery
- `src/app/page.tsx` — redesigned home page with template browser and "Начать с нуля"
