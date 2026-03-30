---
estimated_steps: 7
estimated_files: 4
---

# T03: Share page + share button + /editor route

**Slice:** S04 — Шаблоны + шеринг
**Milestone:** M001

## Description

Wire the serialization layer to real browser navigation. Create the `/design/[code]` share page that decodes a URL parameter and loads it into the editor. Add a "Поделиться" button to the toolbar that serializes the current design and copies the share URL to clipboard. Create the `/editor` route for "start from scratch." This closes the sharing loop — designs can be shared and restored via URLs.

**Key patterns from prior slices:**
- D014: `ssr: false` forbidden in Server Components. The page itself is a Server Component that passes data to a client boundary (`DesignLoader`).
- Next.js 16: `params` is `Promise<{ code: string }>`, must be awaited.
- D020: Scene stays "dumb" (props-based). Store reads happen in `EditorCanvas`, not in Scene.
- D018: Use `getState()` in imperative callbacks (like the share button click handler).

## Steps

1. Create `src/components/editor/DesignLoader.tsx` ("use client"):
   - Props: `{ code: string }`
   - On mount, call `decodeDesign(code)` from `@/lib/serialization`
   - If valid: call `useDesignStore.getState().loadFromCatalogIds(design.b)`, set a `loaded` state to true
   - If invalid: set an `error` state to true
   - Render: while loading → centered spinner (Tailwind `animate-spin`), on error → error message with link back to `/` ("Неверная ссылка. Вернуться на главную."), once loaded → `<EditorCanvas />`
   - Use `useEffect` for the decode+load (runs once on mount)
   - Important: `loadFromCatalogIds` clears the store first, so no stale beads leak through

2. Create `src/app/design/[code]/page.tsx` as a Server Component:
   ```tsx
   import DesignLoader from "@/components/editor/DesignLoader";
   export default async function DesignSharePage({ params }: { params: Promise<{ code: string }> }) {
     const { code } = await params;
     return <DesignLoader code={code} />;
   }
   ```
   - This is a Server Component (no "use client"). It only extracts the URL parameter and delegates to the client boundary.

3. Create `src/app/editor/page.tsx` as a Client Component ("use client"):
   - On mount, call `useDesignStore.getState().clearDesign()` to ensure a fresh start
   - Render `<EditorCanvas />`
   - This gives a clean blank editor for "Начать с нуля"

4. Add "Поделиться" button to `src/components/editor/EditorToolbar.tsx`:
   - Add it between the "Удалить" and "Сброс" buttons in the right action group
   - On click handler:
     1. Get beads from `useDesignStore.getState().beads`
     2. Call `encodeDesign(beads)` from `@/lib/serialization`
     3. If result is empty/short (no valid beads), return early — disable button in this case
     4. Construct URL: `` `${window.location.origin}/design/${code}` ``
     5. Copy to clipboard: `navigator.clipboard.writeText(url)`
     6. Show brief confirmation — change button text to "Скопировано!" for 2 seconds, then revert
   - Add inline SVG share icon (link/chain icon, 14×14, consistent with existing icons)
   - Style: `bg-blue-50 text-blue-700 hover:bg-blue-100`, same rounded-xl + active:scale-95 pattern
   - Disabled state: `opacity-30 cursor-not-allowed` when beads array is empty or all beads lack catalogBeadId
   - Use `useState` for the confirmation state, `useEffect` with timeout to revert

5. Add a `canShare` derived value to the toolbar:
   - Check if at least one bead has a `catalogBeadId`
   - Use this to control the disabled state of the share button

6. Test manually in browser:
   - Navigate to `/design/<valid-code-from-T02-seed>` → editor loads with template beads
   - Navigate to `/design/invalid-code-here` → error page shows
   - Open editor, add beads, click "Поделиться" → URL copied to clipboard
   - Paste URL in new tab → identical design loads

7. Verify TypeScript and build:
   - `tsc --noEmit` — zero errors
   - `npm run build` — no build failures

**Relevant skills:** `frontend-design` for button styling and error page design.

## Must-Haves

- [ ] `/design/[code]` page decodes URL parameter and loads beads into editor
- [ ] Invalid design codes show a graceful error state with navigation back to home
- [ ] Loading state (spinner) shown while decoding
- [ ] `/editor` page shows blank editor (clears store on mount)
- [ ] "Поделиться" button serializes current design and copies URL to clipboard
- [ ] Share button shows "Скопировано!" confirmation for 2 seconds
- [ ] Share button is disabled when no beads have catalogBeadId
- [ ] Next.js 16 `params` as Promise pattern used in dynamic route

## Verification

- `tsc --noEmit` — zero TypeScript errors
- `npm run build` — production build succeeds
- Manual: navigate to `/design/<valid-code>` → editor loads with correct beads from that template
- Manual: navigate to `/design/invalid` → error state with "Вернуться на главную" link
- Manual: in editor with beads, click "Поделиться" → paste in new tab → same design loads
- Manual: in editor with no beads → "Поделиться" button is disabled

## Observability Impact

- Signals added/changed: clipboard copy success/failure (console.log on error), design decode success/failure (error state visible in UI)
- How a future agent inspects this: browser console for decode errors, DevTools Network tab for navigation, `useDesignStore.getState().beads` in console to verify loaded design
- Failure state exposed: DesignLoader error state visible in browser, clipboard API failure caught and logged to console

## Inputs

- `src/lib/serialization.ts` — encodeDesign + decodeDesign functions
- `src/stores/useDesignStore.ts` — loadFromCatalogIds + clearDesign actions (added in T01)
- `src/components/editor/EditorCanvas.tsx` — rendered by DesignLoader and /editor page
- `src/components/editor/EditorToolbar.tsx` — modified to add share button

## Expected Output

- `src/app/design/[code]/page.tsx` — Server Component for share page route
- `src/components/editor/DesignLoader.tsx` — client boundary for design loading with error/loading states
- `src/app/editor/page.tsx` — blank editor page for "start from scratch"
- `src/components/editor/EditorToolbar.tsx` — extended with "Поделиться" button
