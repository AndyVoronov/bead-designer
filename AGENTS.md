<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- ⚠️ MANDATORY DEBUGGING RULE — VIOLATING THIS CAUSES OUTAGES ⚠️ -->
## 🚨 DEBUGGING RULE: ANALYZE OWN ACTIONS FIRST

When something breaks after a deploy or code change:

1. **NEVER blame external factors first** (HOSTKEY, DNS, ports, Cloudflare, ISP, browser cache). These are almost never the cause.
2. **FIRST check server error logs**: `ssh root@82.38.60.189 "pm2 flush bead-designer && curl -s http://localhost:3000/BROKEN_PATH > /dev/null && pm2 logs bead-designer --err --lines 20 --nostream"`
3. **Review own recent actions** — what files were modified/deployed, what commands were run on the server.
4. **Common self-inflicted breakage patterns**:
   - Turbopack hashed symlinks (`@prisma/client-HASH`, `pg-HASH`) broken by `rm -rf` on server → fix: `npx prisma generate` + recreate symlinks
   - `rm -rf .next` without redeploying → missing BUILD_ID → "Could not find a production build"
   - `rm -rf src` or moving standalone files incorrectly → missing server-side route handlers
   - tar `--overwrite` doesn't delete old files → must `rm -rf` before extract
   - Broken symlinks in `node_modules` from Turbopack build on Windows not matching Linux
5. **Only after confirming server logs show no errors**, then check external factors.

**Pattern of past failures**: Every single "site is down" incident was caused by own deploy mistakes, never by the hosting provider. Stop guessing and check logs.

# AI Agent Context — 5 минут тишины

## Project Summary

E-commerce site for children's toys and accessories (pacifier holders, teething bracelets, knitted toys, bundles). Brand: **5 минут тишины**.

- **Domain**: `https://5minutesofsilence.ru` (aliases: `www.5minutesofsilence.ru`, `thekidsdream.ru`)
- **Stack**: Next.js 16.2.1 (App Router, Turbopack), React 19, PostgreSQL 16 + Prisma 7.6 (PrismaPg adapter), Auth.js v5 beta (Yandex/VK/Telegram), Tailwind CSS v4, React Three Fiber + Drei + Rapier, Zustand, Nginx + PM2
- **Server**: `root@82.38.60.189` (HOSTKEY VPS, US), path `/opt/bead-designer`, PM2 process `bead-designer`
- **PM2 start**: `pm2 start node --name bead-designer -- server.js` (standalone mode, NOT `next start`)
- **SSL**: Let's Encrypt direct on nginx (port 443 works — NOT blocked by HOSTKEY)
- **DNS**: Cloudflare (DNS-only mode, gray clouds — NOT proxied). NS: `alec.ns.cloudflare.com` / `amber.ns.cloudflare.com`. Domain registrar: REG.RU

## Key Conventions

### Image URLs
Database stores full paths like `/uploads/products/xxx.jpg`. Client code must always prepend `/api`:
```tsx
src={`/api${image.url}`}    // correct
src={image.url}             // 404
```
On production, nginx serves `/api/uploads/` directly from disk (`/var/www/toydesigner/uploads/`), bypassing Next.js. For `next/image`, use `remotePatterns` — see `next.config.ts`.

### Next.js Image (`next/image`)
All product images MUST use `<Image>` from `next/image` — never raw `<img>`. Components using it: `ProductCard.tsx`, `ImageGallery.tsx`, `LandingOverlay.tsx`, `_client.tsx` (composite, bundle, related). Use `fill` + `sizes` for responsive images.

**Exception**: legacy inline images in cart, profile, admin still use raw `<img>` — low priority migration.

### Admin Auth
Admin panel uses cookie-based auth with login + password. API: `POST /api/admin/auth` with `{login, password}`. Token is HMAC-signed with `ADMIN_COOKIE_SECRET` env var, `sameSite: "strict"`, `secure: true` in production, `maxAge: 86400`.

**IMPORTANT**: `isAdmin(request)` from `@/lib/admin-auth` must be called at the start of every `/api/admin/*` handler.

### OAuth
Auth.js v5 beta. Providers are configured dynamically in `src/lib/auth.ts`:
- **Yandex**: always enabled (credentials in `.env`)
- **VK**: conditional — only added if `AUTH_VK_ID` and `AUTH_VK_SECRET` are set
- **Telegram**: custom JWT auth via `/api/auth/telegram` — also saves `telegramChatId` for order notifications

Provider list available at `/api/auth/providers`. LoginModal fetches this dynamically.

### Auth in API Routes
Use `auth()` from `@/lib/auth` (Auth.js v5), **not** `getServerSession()`:
```ts
import { auth } from "@/lib/auth";
const session = await auth();
if (!session?.user?.id) { /* unauthorized */ }
```

### `auth-required` Custom Event
Used across the app to trigger the `LoginModal`. Dispatch from any component:
```ts
window.dispatchEvent(new CustomEvent("auth-required"));
```

### Prisma Singleton Pattern
All files MUST use `import { prisma } from "@/lib/prisma"` (lazy proxy). Never use `new PrismaClient()` directly.

### FK Constraints on Product Deletion
- `CartItem` → ON DELETE CASCADE (cart items removed)
- `OrderItem` → ON DELETE SET NULL (order history preserved, `productId` becomes nullable)

### Composite Products
- Type: `"simple"` or `"composite"`
- `CompositeItem` links parent (bundle) to children with quantity
- Admin form auto-calculates base price from components and defaults to 10% discount
- Product pages show "Входит в наборы" section for simple products that are children of composites

### Promo Codes
- **Scope**: what gets discounted — `cart` / `products` / `categories` / `gift`
- **Conditions**: required products, categories, min quantity per product (`{"9": 2}`), min order amount, `conditionMode` (`all`/`any`), `maxUsesPerUser`
- **Shared utility**: `src/lib/promo-utils.ts` — `checkConditions()`, `calculateDiscount()`, `effectivePrice()`, `cartTotal()` used by both `/api/promo/validate` and `/api/cart/checkout`
- **Validation**: client-side at `/api/promo/validate` with optional server-side cart fetch (pass `userId`/`sessionId` instead of `cartItems`)
- **Checkout**: all scopes fully implemented, conditions re-checked, `maxUsesPerUser` validated, usage tracked in `PromoCodeUse`

### Cart
- Cookie-based by default, **merged with DB cart on login**
- `POST /api/cart/merge` — migrates cookie cart items to DB (`Cart` table with `userId`) on login
- `auth-provider.tsx` calls merge POST after login, dispatches `cart-updated` event
- `useCartCount` listens for `cart-updated` event to refresh badge
- **Lightweight count endpoint**: `GET /api/cart?count=1` returns `{ count: N }` without joining products
- GET handler manually maps product fields — **must include `categoryId`** for promo validation
- Phone field has auto-formatting (`+7 (999) 999-99-99`) and digit-length validation
- Quantity capped at 99 both client-side and server-side
- Cookie has `secure: true` in production, `httpOnly`, `sameSite: "lax"`, 30-day maxAge

### Product Favorites
- `FavoriteButton` component exported from `src/components/catalog/ProductCard.tsx`
- Props: `productId`, `initialFavorited`, `className`, `size` ("sm" | "lg"), `showToast`
- On mount, checks `/api/product-favorites` to set initial heart state
- On toggle: if 401 → dispatches `CustomEvent("auth-required")` to open login modal
- API: `GET /api/product-favorites` returns user's favorites (N+1 fixed — nested `include`), `POST /api/product-favorites` toggles

### Toast Notifications
- `ToastProvider` in `src/components/ui/ToastProvider.tsx` wraps the app (in layout.tsx)
- Use `useToast()` hook: `toast.success("msg")`, `toast.error("msg")`, `toast.info("msg")`
- Toasts auto-dismiss after 3s, stack vertically, appear top-right
- `role="status"` + `aria-live="polite"` for screen reader announcements

### Category Pages
- `/catalog/category/[slug]/page.tsx` — server component with `generateStaticParams` + `generateMetadata`
- Products filtered by category slug, reuses `CatalogClientPage` with `initialCategory` prop
- 6 default categories (from `DEFAULT_CATEGORIES` in `catalog-utils.ts`)
- Sitemap includes category pages; canonical URLs on product detail pages

### Order Notifications
- `src/lib/notifications.ts` — sends Telegram messages via Bot API
- Admin changes order status → auto-notification to user (if `telegramChatId` exists)
- Hooked into: `PUT /api/admin/catalog-orders/[id]` and `PATCH /api/admin/orders/[id]/status`
- `TELEGRAM_BOT_TOKEN` env var required
- **Bug**: Telegram auth saves `user.id` as `telegramChatId`, not the actual `chat_id` from bot conversation

### Profile Page
- 6 tabs: Designs, Orders, Product Favorites, Template Favorites, Reviews, Settings
- **Orders tab**: status filter (All / Active / Completed), visual 5-step progress tracker for active orders, "Повторить" reorder button, fetches both design + catalog orders
- **Orders badge**: pulsing dot on "Заказы" tab when new/active orders exist (uses `localStorage`)
- **Settings tab**: functional — `PATCH /api/user/profile` + wired form + toast
- **Performance issue**: all 6 tabs fetch data on mount (lazy loading not implemented)

### Landing Page
- 3D scene (R3F) with HTML overlay rendered inside `ScrollControls`
- Client-only — SSR disabled via `dynamic(() => ..., { ssr: false })`
- Search bar → dropdown autocomplete (debounced 300ms); navigates to `/catalog?search=...`
- Products section lazy-loaded via IntersectionObserver (200px margin)
- Newsletter form in footer → `POST /api/subscribe` + auto-generates 5% promo code
- Reviews section fetches from `/api/reviews`; falls back to hardcoded if empty
- Contact form sends pre-filled Telegram message via `t.me/karinavoronova?text=...`

### Newsletter Subscribers
- `Subscriber` model: `email` (unique), `source` (footer/landing/checkout), `isActive`
- API: `POST /api/subscribe` with `{ email, source }` — upserts, rate-limited 5/min

### Custom Error/Not Found Pages
- `src/app/not-found.tsx` — styled 404 with links to catalog, home, info pages, Telegram
- `src/app/error.tsx` — branded client error boundary (resets on retry)
- `src/app/global-error.tsx` — server-level error boundary (owns `<html><body>`)

### Product Auto-NEW Badge
- Products created in last 14 days automatically show "NEW" badge (if no SALE/HIT badge)
- Requires `createdAt` field in `ProductListItem` type

### Category Product Counts
- `/api/categories` includes `_count: { products: { where: { status: "active" } } }`
- Catalog page filters show `(count)` next to each category name

### Cart Pre-fill
- Checkout form pre-fills `contactName` from user session for authenticated users

### Analytics
Yandex.Metrica loaded via `MetricsScript` component in layout. Counter ID: `NEXT_PUBLIC_YM_ID` env var.

### SEO
- Layout: `title.template: "%s — 5 минут тишины"`, OG metadata with `og:image`, `metadataBase`
- Product pages: server-side `generateMetadata` with OG tags, canonical URL, `revalidate=300` (ISR)
- Category pages: `generateStaticParams` + `generateMetadata`
- `robots.ts` and `sitemap.ts` auto-generated (products use real `updatedAt`, blog posts included)
- Static pages: `/about`, `/delivery`, `/faq` — Server Components with metadata
- Landing page: `<noscript>` block with SEO content for crawlers
- JSON-LD: Organization + WebSite (layout), Product + BreadcrumbList + AggregateRating (product pages), FAQPage (FAQ page), AggregateRating (homepage via StoreRatingJsonLd), Article + BreadcrumbList (blog posts)

### Exit-Intent Popup
`src/components/ExitIntentPopup.tsx` — client component that detects mouse leaving viewport (clientY <= 0) and shows a discount popup. One-time per session (localStorage `exit_promo_shown`). Subscribes email via `/api/subscribe` + auto-generates promo code (10%) via `/api/admin/promo-codes`. Promo code saved to localStorage for display on return visits.

### Quick View Modal
`src/components/catalog/QuickViewModal.tsx` — full product preview modal accessible from catalog product cards via "Быстрый просмотр" link. Fetches product data from `/api/products/[slug]`. Shows images, price, stock, quantity selector, add-to-cart, favorite button, and "Подробнее" link to full page. `ProductCard` accepts `onQuickView?: (slug: string) => void` prop.

### Store Aggregate Rating
`src/components/seo/StoreRatingJsonLd.tsx` — client component that fetches `/api/reviews?stats=1` and renders `AggregateRating` JSON-LD on the homepage. Endpoint returns `{ count, avg }` for all approved reviews.

### Reviews Page
`/reviews` — public page showing all approved reviews with rating summary (average + distribution bars), star-based filtering, and links to related products. Data from `GET /api/reviews`.

### Product FAQ
`ProductFaq` model — per-product FAQ items with question/answer/order. Public API: `GET /api/product-faq?productId=X`. Admin API: `POST/DELETE /api/product-faq`. Displayed as accordion on product detail page.

### Site Settings
`SiteSettings` model — key/value store for admin-configurable site settings (address, phone, email, working hours, Telegram, WhatsApp, Yandex Maps URL, pickup address/note). Admin API: `GET/PUT /api/admin/site-settings`. Public API: `GET /api/site-settings`. Admin page: `/admin/site-settings`. Used by delivery page MapWidget and potentially other pages.

### Order Tracker
Profile orders tab shows a visual 5-step progress bar for active orders: Новый → Подтв. → В работе → Отправка → Готов. Each step shows completed (✓), current (highlighted), or pending state.

### Reorder
Profile orders tab has "Повторить" button on each catalog order. Re-adds all items to cart via `POST /api/cart` for each item (with `productId` from `OrderItem`). Dispatches `cart-updated` event.

### Cart Auth Banner
Cart page shows a rose banner for non-authenticated users: "Войдите, чтобы сохранить корзину и отслеживать заказы". Click dispatches `auth-required` event to open LoginModal. Uses `isAuth` state checked via `/api/auth/session`.

### Out-of-Stock Info Banner
Product detail page shows an info box when `stockQuantity === 0`: "Товар сейчас отсутствует на складе" with guidance to subscribe for notifications.

### WhatsApp/Telegram Ask Buttons
Product detail page (`_client.tsx`) has "Спросить" buttons for WhatsApp and Telegram. Messages are pre-filled with product name + URL: `Привет! Меня интересует [name] — https://5minutesofsilence.ru/catalog/[slug]`.

### Newsletter Auto-Promo
Footer `NewsletterForm` and `ExitIntentPopup` auto-generate promo codes on subscription. Footer generates 5% code (prefix `NEWS`), exit-intent generates 10% code (prefix `WELCOME`). Codes have 30-day expiry, 100 max uses.

### Performance: Product Link Prefetch
`ProductCard` `<Link>` uses `prefetch={false}` to prevent 6 ERR_ABORTED requests on every page load. Product detail pages are loaded on demand, not pre-fetched.

### Yandex Maps Widget
`src/app/delivery/MapWidget.tsx` — client component on delivery page showing contact info (address, phone, working hours) and Yandex Maps iframe. URL and contact data loaded from `GET /api/site-settings`. Admin-configurable via `/admin/site-settings`.

### Blog System
Full blog with Tiptap rich-text editor, categories, tags, comments, product embedding, and SEO.

**DB Models:** `BlogCategory`, `BlogPost`, `BlogPostTag` (composite PK), `BlogPostImage`, `BlogComment` (threaded replies).

**Admin Pages:**
- `/admin/blog` — post list with status filters (draft/published/archived), search, pagination
- `/admin/blog/new` — create post with Tiptap editor
- `/admin/blog/[id]/edit` — edit post
- `/admin/blog/categories` — CRUD for blog categories
- Sidebar: "Блог" + "Рубрики блога" in "Контент" section

**Blog Editor (`BlogEditor.tsx`):**
- Tiptap rich-text with toolbar: Bold/Italic/Underline/Strike, H2/H3, lists, blockquote, code, alignment, link, image (URL+upload), YouTube, Product Embed, undo/redo
- Custom `ProductEmbed` node — `div[data-product-id]` atom, toolbar button prompts for product ID
- Left column: title, slug (auto Cyrillic→Latin), category select, tags (comma-separated), excerpt, editor
- Right column: hero image upload, status/publishedAt/pin, SEO (meta title/description/OG image), related product IDs
- Auto-save (5s debounce), auto-readTime (`Math.ceil(content.length / 1500)`), auto-slug from title

**Public Pages:**
- `/blog` — listing with hero, category pills, 3-col grid cards (image, pinned badge, category, title, excerpt, date/readTime/views), subscribe form, pagination
- `/blog/[slug]` — article page with hero image, breadcrumbs, metadata, tags, share buttons, comments, related posts, product recommendations
- `/blog/category/[slug]` — category filter
- `/blog/tag/[tag]` — tag filter

**Comments (`BlogComments.tsx`):**
- Auth-aware: logged-in users auto-approved, guests moderated (require authorName, optional email)
- Threaded replies (parentId self-relation), nested indentation
- Avatar circle (first letter of name)

**Blog Content Rendering (`BlogContent.tsx`):**
- Client component renders HTML via `dangerouslySetInnerHTML`
- Finds `div[data-product-id]` elements, replaces with inline product cards (image, name, price, link, add-to-cart)
- Products pre-fetched server-side, passed as `Map<number, ProductBasic>`

**SEO:**
- `generateMetadata` for all blog pages (title, description, OG, article:published_time, article:section)
- JSON-LD: `Article` + `BreadcrumbList` on post pages
- Sitemap includes blog posts (priority 0.7) and categories (priority 0.6)

**Image Upload:**
- `POST /api/admin/blog/upload` — multipart file, validates image type + 5MB max, saves to `/var/www/toydesigner/uploads/blog/`
- `GET /api/uploads/blog/[...path]` — serves from disk (nginx handles in production)

**Slug Generation:**
Cyrillic→Latin transliteration inline: а→a, б→b, в→v, г→g, д→d, е→e, ё→yo, ж→zh, з→z, и→i, й→y, к→k, л→l, м→m, н→n, о→o, п→p, р→r, с→s, т→t, у→u, ф→f, х→kh, ц→ts, ч→ch, ш→sh, щ→shch, ъ→, ы→y, ь→, э→e, ю→yu, я→ya. Then lowercase, replace non-alnum with hyphens, collapse, trim.

### Mobile Scroll
`ScrollFix.tsx` — client component that removes `overflow: hidden` from html/body on non-home pages.

### Shared UI Components
- `src/components/layout/PageHeader.tsx` — sticky page header with `title`, `subtitle`, `cartCount`, `backHref`, `maxWidth`, `children`
- `src/hooks/useCartCount.ts` — shared hook for cart item count (listens for `cart-updated` event)
- `src/components/catalog/ProductCard.tsx` — includes `FavoriteButton` (36/40px hit area) + `ProductCardSkeleton`; accepts `priority` prop
- `src/components/ui/ToastProvider.tsx` — toast notification system with `useToast()` hook
- `src/components/auth/LoginModal.tsx` — modal triggered by `auth-required` event
- `src/components/ExitIntentPopup.tsx` — exit-intent discount popup (10% for email)
- `src/components/seo/StoreRatingJsonLd.tsx` — homepage AggregateRating JSON-LD
- `src/components/catalog/QuickViewModal.tsx` — product quick view modal
- `src/app/delivery/MapWidget.tsx` — Yandex Maps + contact info widget
- `src/components/blog/BlogEditor.tsx` — Tiptap rich-text blog editor with product embedding
- `src/components/blog/BlogCard.tsx` — blog post card (image, pinned badge, category, title, excerpt, meta)
- `src/components/blog/BlogContent.tsx` — renders blog HTML with inline product card embedding
- `src/components/blog/BlogComments.tsx` — blog comments (auth-aware, threaded replies, moderation)
- `src/components/blog/Pagination.tsx` — pagination with ellipsis
- `src/components/blog/ShareButtons.tsx` — Telegram + WhatsApp + Copy link
- `src/components/blog/BlogSubscribeForm.tsx` — email subscribe for blog updates

## Known Security Issues

### FIXED
- ~~Admin auth token was static string~~ → HMAC-signed cookie with `ADMIN_COOKIE_SECRET`
- ~~Admin password comparison was timing-vulnerable~~ → `crypto.timingSafeEqual`
- ~~Telegram auth had no hash verification~~ → HMAC-SHA256 validation
- ~~No rate limiting~~ → Applied to admin auth (5/min) and newsletter (5/min)
- ~~Cart merge race condition~~ → Wrapped in `prisma.$transaction()`
- ~~Admin orders GET was public~~ → `isAdmin()` check added
- ~~`GET /api/orders` was public~~ → Removed (405)
- ~~3 admin routes had no auth~~ → `isAdmin()` added to templates and reviews
- ~~Admin token no expiry~~ → 24h max age validated
- ~~Admin legacy fallback~~ → `generateAdminToken()` throws if secret unset
- ~~Telegram PostMessage no origin check~~ → `event.origin` verified; sender uses `window.opener.origin`
- ~~Cart quantity unbounded server-side~~ → Capped at 99 (including merge)
- ~~Cart cookie missing `secure: true`~~ → Added in production
- ~~Template favorites race condition~~ → Wrapped in `$transaction`
- ~~Product favorites race condition~~ → Wrapped in `$transaction`
- ~~Checkout promo scopes ignored~~ → All scopes + conditions + maxUsesPerUser implemented
- ~~Checkout input not sanitized~~ → Length limits + trim applied
- ~~Related products broken~~ → Category slug instead of ID
- ~~Promo validate trusts client data~~ → Server-side cart fetch mode available
- ~~Duplicate promo functions~~ → Extracted to `src/lib/promo-utils.ts`
- ~~Cart session ID insecure~~ → `crypto.randomUUID()` instead of `Math.random()`
- ~~Admin reviews `id` type coercion~~ → `Number(rawId)` applied
- ~~Telegram Markdown injection~~ → Switched to HTML parse_mode with entity escaping
- ~~Profile/admin pages indexable~~ → `noindex, nofollow` via layout.tsx
- ~~Missing DB indexes~~ → Added `@@index` on 8 FK columns + 1 status column
- ~~`ProductListItem.mainImage` type wrong~~ → Fixed to `{ id, url } | null`
- ~~`next/image` missing in product detail~~ → Composite/bundle/related all migrated
- ~~Catalog duplicate `<main>`~~ → Changed to `<div>`
- ~~"Popular" sort no-op~~ → Removed (no viewCount field)
- ~~Badge filter page-scoped~~ → API returns `availableBadges` from all active products

### ACTIVE
1. **`AUTH_SECRET` dangerous default** in telegram route — fallback to known static string
2. **No Content-Security-Policy** header in nginx
3. **No CSRF protection** on mutation endpoints (acceptable with SameSite cookies)
4. **VK userinfo** — access_token in URL query param (VK API limitation)

## Known Bugs

### CRITICAL
1. **`AUTH_SECRET` dangerous default** in telegram route — if env var unset, known static string used for JWT signing
2. **Admin product badge/composite replacement not atomic** — delete-then-create outside `$transaction` (data loss if create fails)

### MEDIUM
3. **Auth JWT callback DB query** — `prisma.account.findUnique()` on every token refresh (performance)
4. **Landing reviews fallback** — 10 hardcoded 5-star fake reviews shown when DB has no approved reviews with categoryId
5. **Duplicate `<main>` in checkout pages** — inner components use `<main>` but root layout wraps in `<main id="main-content">`
6. **Admin login no redirect** — authenticated admins still see login form
7. **Cart total recalculation anti-pattern** — `setTotal()` inside `setItems()` callback (R10-H8)
8. **WhatsApp link**: placeholder number in footer — update to real number
9. **Profile phone not pre-filled from session** — always empty in Settings tab
10. **Checkout client/server validation mismatch** — city not validated client-side but rejected server-side for yandex_pvz
11. **`/api/auth/session` 401 spam** — NextAuth session poller fires repeatedly for guests (expected — admin uses separate auth), ~60 requests per page visit

### LOW
11. **VK access token in URL** — proxy/CDN may log it (VK API limitation)
12. **Global-error.tsx missing fonts** — renders without Nunito/Pacifico
13. **Cart page dead code** — inline success state (redirect fires immediately)
14. **Rate limiter per-process only** — PM2 multi-worker bypass possible
15. **Landing page H1** — renders "5 минуттишины" without space (CSS `white-space: nowrap` hides it visually but accessibility/SEO affected)

## Build & Deploy

- **Turbopack** creates hashed module symlinks (`@prisma/client-HASH`, `pg-HASH`) that break on Linux server
- **Must fix symlinks after every deploy** (see DEPLOY.md)
- Standalone tar transfer often times out at 120s on Windows — use 180s+ timeout
- **Never overwrite server `.env`** during deploy
- **Run `npx prisma db push`** after schema changes to sync DB
- **Always delete `.next` on server before deploying** — stale chunk files from previous builds persist otherwise
- **Run PM2 with `node server.js`** — NOT `next start` (standalone mode); use: `pm2 start node --name bead-designer -- server.js`
- **Verify `ADMIN_COOKIE_SECRET`** exists in server `.env` — if missing, admin auth returns 500 with cryptic "Некорректный запрос" error
- **NFT warning** is non-blocking: `./next.config.ts` → `./src/app/api/uploads/products/[...path]/route.ts`
- **Nginx gzip directives** commented out in `nginx.conf` (already in main nginx.conf)

### SSL & DNS
- **Port 443 is NOT blocked** by HOSTKEY — works directly via nginx + Let's Encrypt
- **Cloudflare is DNS-only** (gray clouds, NOT proxied) — traffic goes directly to VPS
- **Cloudflare proxied (orange cloud) causes slow loading** for some Russian ISPs — never enable
- **SSL certificates**: Let's Encrypt at `/etc/letsencrypt/live/5minutesofsilence.ru/` (expires Aug 2026), `/etc/letsencrypt/live/thekidsdream.ru/` (expires Jul 2026)
- **Cloudflare SSL/TLS** should be set to **Flexible** (irrelevant for DNS-only but keep as fallback)
- **DNS NS records** at REG.RU: `alec.ns.cloudflare.com`, `amber.ns.cloudflare.com`
- **Nginx config on server** must always match `nginx.conf` in project root — deploy with `scp nginx.conf root@82.38.60.189:/etc/nginx/sites-enabled/bead-designer`

## File Structure Notes

- `src/lib/catalog-utils.ts` — **canonical** utility file (prices, slugs, formatting, defaults, `DEFAULT_CATEGORIES`, `ORDER_STATUS_LABELS`)
- `src/lib/bead-utils.ts` — bead-related utilities (`catalogBeadToBeadState`)
- `src/lib/notifications.ts` — Telegram order notification service (HTML parse_mode with entity escaping)
- `src/lib/email.ts` — Nodemailer order confirmation service (HTML template, fire-and-forget)
- `src/lib/waitlist-notify.ts` — Waitlist email notification service (sends on restock, marks notified)
- `src/lib/delivery-cost.ts` — Delivery cost service (ПВЗ Яндекс.Маркет + Самовывоз; `fetchYandexDeliveryCost()` API stub)
- `src/lib/search.ts` — Full-text search helper (PostgreSQL tsvector with Russian morphology)
- `src/hooks/useRecentlyViewed.ts` — Recently viewed products hook (localStorage, max 12)
- `src/hooks/useCartCount.ts` — shared hook for cart item count (listens for `cart-updated` event)
- `src/lib/auth-provider.tsx` — session state + cart merge on login
- `src/lib/admin-auth.ts` — admin token verification (HMAC + timingSafeEqual)
- `src/lib/rate-limit.ts` — in-memory rate limiter (per-process)
- `src/lib/promo-utils.ts` — shared promo discount/condition calculation
- `src/types/catalog.ts` — shared TypeScript types (Product with stockQuantity/recommendedAge, Category, Badge, ProductImage, CatalogOrderType with delivery + contactEmail, OrderItemType, ProductListItem with mainImage/stockQuantity/recommendedAge, ProductsQueryParams with age filter)
- `prisma/schema.prisma` — single source of truth for DB schema (26 models including Subscriber, TrustBadge, WaitlistEntry, SiteSettings, ProductFaq, BlogCategory, BlogPost, BlogPostTag, BlogPostImage, BlogComment; CatalogOrder has deliveryMethod/city/address/index/contactEmail; Product has stockQuantity/recommendedAge/trustBadges/waitlistEntries/productFaqs; BlogPost has content/heroImage/status/tags/comments/relatedProductIds; BlogComment has threaded replies via parentId)
- `nginx.conf` in project root — production nginx config (security headers, `set_real_ip_from`, `real_ip_header`)

### Admin Panel
- Route groups: `/admin/login/` (no sidebar), `/admin/(dashboard)/` (sidebar via `layout.tsx`)
- Sidebar: `AdminSidebar.tsx` with 5 groups: Основное, Продажи, Контент, Настройки, Конструктор
- Dashboard: stats cards + recent orders table
- Users page (`/admin/users`): list with search, pagination; detail modal with orders, reviews, contacts
- Users API: `GET /api/admin/users` (list with `_count` + `catalogOrderStats`), `GET /api/admin/users/[id]` (detail with orders, reviews, `totalSpent`)
- Site settings page (`/admin/site-settings`): admin-configurable contacts (address, phone, email, working hours, Telegram, WhatsApp, Yandex Maps URL, pickup address/note)
- Site settings API: `GET/PUT /api/admin/site-settings` (admin), `GET /api/site-settings` (public)
- Blog: `/admin/blog` (list with status/search/pagination), `/admin/blog/new` + `/admin/blog/[id]/edit` (Tiptap editor), `/admin/blog/categories` (rubric CRUD)

## API Routes

| Route | Method | Description | Auth | Notes |
|-------|--------|-------------|------|-------|
| `/api/products` | GET | List products (filters, sort, pagination) | Public | Returns `availableBadges` metadata |
| `/api/products/[slug]` | GET | Single product detail | Public | Fixed N+1 |
| `/api/cart` | GET/POST/PATCH/DELETE | Cart CRUD | Cookie+User | `?count=1` for lightweight count |
| `/api/cart/checkout` | POST | Create CatalogOrder | Cookie+User | Full promo validation |
| `/api/cart/merge` | POST | Merge cookie cart into user DB cart | User | Transaction-wrapped, qty capped |
| `/api/promo/validate` | POST | Validate promo code | Cookie | Server-side cart fetch mode |
| `/api/product-favorites` | GET/POST | List/toggle product favorites | User | Transaction-wrapped |
| `/api/catalog-orders/mine` | GET | User's catalog orders | User | |
| `/api/orders/mine` | GET | User's design orders | User | |
| `/api/favorites` | GET/POST | Template favorites | User | Race condition fixed |
| `/api/reviews` | GET/POST | Public reviews + submit | Public/User | Filters by productId + categoryId |
| `/api/reviews/mine` | GET | User's submitted reviews | User | |
| `/api/auth/providers` | GET | Dynamic provider list | Public | |
| `/api/auth/telegram` | POST | Telegram JWT auth | Public | Dangerous AUTH_SECRET default |
| `/api/auth/session` | GET | Current session | Public | |
| `/api/subscribe` | POST | Newsletter subscription | Public | Rate-limited 5/min |
| `/api/user/profile` | PATCH | Update user profile | User | |
| `/api/admin/auth` | POST | Admin login/logout | Public | Rate-limited 5/min |
| `/api/admin/products` | GET/POST | Admin product list/create | Admin | Paginated |
| `/api/admin/products/[id]` | GET/PUT/DELETE | Admin product CRUD | Admin | Badge/composite not atomic |
| `/api/admin/products/[id]/images` | POST/DELETE | Admin product images | Admin | |
| `/api/admin/categories` | GET/POST | Admin categories | Admin | |
| `/api/admin/categories/[id]` | GET/PUT/DELETE | Admin category CRUD | Admin | |
| `/api/admin/catalog-orders` | GET | Admin catalog orders | Admin | Paginated (page/limit/status/search) |
| `/api/admin/catalog-orders/[id]` | GET/PUT | Admin order detail/status | Admin | |
| `/api/admin/orders` | GET | Admin design orders | Admin | |
| `/api/admin/orders/[id]/status` | PATCH | Admin design order status | Admin | |
| `/api/admin/badges` | GET/POST | Admin badges | Admin | |
| `/api/admin/badges/[id]` | GET/PUT/DELETE | Admin badge CRUD | Admin | |
| `/api/admin/promo-codes` | GET/POST | Admin promo codes | Admin | |
| `/api/admin/promo-codes/[id]` | GET/PUT/DELETE | Admin promo code CRUD | Admin | |
| `/api/admin/reviews` | GET/POST | Admin review moderation | Admin | Edit review + link product |
| `/api/admin/users` | GET | Admin user list | Admin | Search, pagination, `_count` + `catalogOrderStats` |
| `/api/admin/users/[id]` | GET | Admin user detail | Admin | Orders, reviews, totalSpent |
| `/api/admin/waitlist/notify` | POST | Send waitlist notifications on restock | Admin | |
| `/api/admin/trust-badges` | GET/POST | Admin trust badge CRUD | Admin | |
| `/api/admin/trust-badges/[id]` | GET/PUT/DELETE | Admin trust badge CRUD | Admin | |
| `/api/trust-badges` | GET | Public trust badges (with productId fallback) | Public | |
| `/api/waitlist` | POST | "Notify when available" subscription | Public | Rate-limited 3/min |
| `/api/site-settings` | GET | Public site settings (contacts, map URL) | Public | Key/value pairs |
| `/api/product-faq` | GET/POST/DELETE | Product FAQ items | Public/Admin | GET public, POST/DELETE admin |
| `/api/admin/site-settings` | GET/PUT | Admin site settings (contacts, map, hours) | Admin | Key/value upsert |
| `/api/blog` | GET | Public blog listing (pagination, filters) | Public | No content in list |
| `/api/blog/[slug]` | GET | Single blog post + increment views | Public | Cookie-based view tracking |
| `/api/blog/categories` | GET | Blog categories with post count | Public | |
| `/api/blog/tags` | GET | All tags with post count | Public | |
| `/api/blog/comments` | GET/POST | Blog comments (list/submit) | Public/User | Guests moderated, users auto-approved |
| `/api/admin/blog` | GET/POST | Admin blog CRUD (list/create) | Admin | Cyrillic→Latin auto-slug |
| `/api/admin/blog/[id]` | GET/PUT/DELETE | Admin blog edit/delete | Admin | Tag replacement in transaction |
| `/api/admin/blog/categories` | GET/POST | Admin blog categories | Admin | |
| `/api/admin/blog/categories/[id]` | PUT/DELETE | Admin blog category edit/delete | Admin | Nullifies categoryId on posts |
| `/api/admin/blog/upload` | POST | Upload blog image | Admin | Max 5MB, image types only |
| `/api/uploads/blog/[...path]` | GET | Serve blog images | Public | Nginx handles in production |

## Route Map

```
/                              — Landing page (3D, R3F Canvas, client-only)
/catalog                       — Product catalog (filter, sort, search, URL params)
/catalog/category/[slug]       — Category-filtered catalog (SEO, ISR)
/catalog/[slug]                — Product detail (reviews, related, recommendations, FAQ, WhatsApp/Telegram ask, JSON-LD, ISR 300s)
/cart                          — Shopping cart + checkout
/order-success                 — Order confirmation page
/privacy                      — Privacy policy (static, noindex)
/profile                       — User profile (6 tabs: orders, designs, favorites, reviews, settings)
/about                         — About page (static)
/delivery                      — Delivery info (static) + Yandex Maps widget + contacts from SiteSettings
/faq                           — FAQ page (static, JSON-LD FAQPage)
/reviews                       — All approved reviews (rating summary, star filters, product links)
/blog                          — Blog listing (categories, tags, pagination, subscribe)
/blog/[slug]                   — Blog post (content, comments, related posts, product embeds, JSON-LD)
/blog/category/[slug]          — Blog posts by category
/blog/tag/[tag]                — Blog posts by tag
/editor                        — 3D bead editor (R3F)
/design/[code]                 — View a design (R3F)
/admin                         — Admin dashboard (stats, recent orders)
/admin/products                — Product management
/admin/products/new            — Create product
/admin/products/[id]/edit      — Edit product
/admin/catalog-orders          — Order management (CSV export)
/admin/categories              — Category management
/admin/badges                  — Badge management
/admin/promo-codes             — Promo code management
/admin/reviews                 — Review moderation
/admin/templates               — Template management
/admin/beads                   — Bead catalog management
/admin/trust-badges            — Trust badge management (Shield, Truck, etc.)
/admin/users                   — User management (list, detail modal, orders/reviews)
/admin/orders                  — Design order management
/admin/site-settings           — Site settings (contacts, map URL, working hours)
/admin/blog                    — Blog post list (status filters, search, pagination)
/admin/blog/new                — Create blog post (Tiptap editor)
/admin/blog/[id]/edit          — Edit blog post (Tiptap editor)
/admin/blog/categories         — Blog category management
```

## Implementation History

### Round 1 — 10 features
Refactoring, Yandex analytics, mobile hamburger nav, order history in profile, static info pages (about/delivery/faq), phone input mask, product favorites with auth-required flow, SEO (robots/sitemap/metadata), admin product/pages, CDN image optimization.

### Round 2 — 8 features
`next/image` for ProductCard/Gallery/LandingOverlay, FavoriteButton initial state fix + 401 handling, noscript SEO block, cart merge on auth login, toast notification system, category pages with generateStaticParams, profile order status filters, Telegram order status notifications.

### Round 3 — 7 features
Clickable search bar on landing with autocomplete, "new order" indicator badge in profile, custom 404 page, newsletter subscription (Subscriber model + API + form), cart pre-fill for authenticated users, product count in categories + auto "NEW" badge (14 days), lazy loading landing products section via IntersectionObserver.

### Round 4 — 15 features
Secure admin auth (HMAC + timingSafeEqual), rate limiting, Telegram auth hash verification, JSON-LD structured data, product reviews on detail pages, related products section, sitemap with real updatedAt, error boundaries (error.tsx + global-error.tsx), profile Settings tab, order success page, admin dashboard, API caching headers, loading.tsx skeletons, accessibility fixes (zoom + skip-to-content), promo code server-side validation.

### Round 5 — 18 features
Nginx security headers (HSTS/X-Frame/nosniff/Referrer/Permissions), `isAdmin()` on admin orders GET, removed public `GET /api/orders`, skip-to-content target (`<main id="main-content">`), cart merge in `prisma.$transaction()`, gift products in checkout, landing reviews from DB, og:image + canonical URLs, AggregateRating JSON-LD, toast aria-live, cart quantity max 99, N+1 fix in product-favorites, ISR for product pages (revalidate=300), deleted `catalogUtils.ts` shim, admin CSV export, landing review form categoryId fix, catalog search from URL params, CatalogOrderType discount/promoCodeId fields.

### Round 6 — 15 features
1. **Admin auth on 3 unprotected routes** — `isAdmin()` added to `templates/route.ts`, `templates/[id]/route.ts`, `reviews/route.ts` (were publicly accessible)
2. **Removed admin legacy fallback** — `ADMIN_COOKIE_SECRET` unset now denies all access (was `token === "authenticated"`)
3. **Admin token expiry validation** — tokens older than 24h rejected (timestamp was in payload but never checked)
4. **Telegram PostMessage origin check** — `LoginModal.tsx` now verifies `event.origin` against own origin + `https://oauth.telegram.org`
5. **Related products fix** — sends `category.slug` instead of `category.id` to API (was returning random products)
6. **Server-side cart quantity cap** — `Math.min(quantity, 99)` in both POST and PATCH handlers
7. **Cart cookie `secure: true`** — added `secure: process.env.NODE_ENV === "production"` to session cookie
8. **Favorites toggle in transaction** — wrapped in `prisma.$transaction()` (was race condition with counter drift)
9. **Checkout promo full implementation** — all scopes (cart/products/categories/gift), `checkConditions()`, `maxUsesPerUser`, input sanitization (length limits + trim)
10. **N+1 fix in products list** — removed per-product `findFirst` fallback; uses `orderBy: { order: "asc" }, take: 1` in include
11. **N+1 fix in product detail** — same fix for composite children and bundle items
12. **Lightweight `/api/cart?count=1`** — returns `{ count: N }` without joining products; `useCartCount` hook updated
13. **Removed duplicate `<main>` tag** — product detail page had nested `<main>` (root layout already wraps)
14. **ImageGallery alt text** — accepts `productName` prop, renders as alt attribute on all images
15. **FAQ ARIA attributes** — `aria-expanded`, `aria-controls`, `role="region"`, `aria-labelledby` on accordion
16. **loading.tsx for product detail** — skeleton with image gallery, info, and reviews sections
17. **loading.tsx for category pages** — skeleton with filter pills and product grid

### Round 7 — 14 features
1. **Shared promo utility** — extracted `checkConditions()`, `calculateDiscount()`, `effectivePrice()`, `cartTotal()` to `src/lib/promo-utils.ts` (single source of truth)
2. **Promo validate server-side mode** — accepts `userId`/`sessionId` to fetch cart from DB instead of trusting client-supplied prices/categories
3. **Product favorites in `$transaction`** — wrapped toggle in transaction to prevent race condition (template favorites were fixed in R6)
4. **Cart merge quantity cap** — `Math.min(sum, 99)` when merging guest cart into user cart
5. **Admin legacy fallback removed** — `generateAdminToken()` now throws if `ADMIN_COOKIE_SECRET` unset (was returning static `"authenticated"`)
6. **Admin reviews `id` type coercion** — `Number(rawId)` applied before Prisma queries
7. **LoginModal focus trap** — `role="dialog"`, `aria-modal`, `aria-label`, Tab trap, Escape close, auto-focus on open, body scroll lock
8. **Telegram postMessage target origin** — sender uses `window.opener.origin` instead of `'*'`
9. **Profile + admin `noindex`** — `layout.tsx` with `robots: { index: false, follow: false }` for both
10. **Reviews by productId** — product detail now fetches `/api/reviews?productId=X&categoryId=Y` instead of category-only
11. **Database indexes** — added `@@index` on 8 FK columns: `CatalogOrder.userId/promoCodeId/status`, `OrderItem.orderId/productId`, `Order.userId`, `SavedDesign.userId`, `Account.userId`, `User.telegramChatId`
12. **Admin catalog orders pagination** — `page/limit/status/search` params, includes promo code info, returns `{ orders, total, page, totalPages }`
13. **Telegram HTML parse_mode** — switched from `Markdown` to `HTML` with entity escaping to prevent injection from product names
14. **Nginx `set_real_ip_from`** — added `set_real_ip_from 127.0.0.1` + `real_ip_header X-Forwarded-For` for correct rate limiting behind proxy

### Round 8 — 14 features (catalog-focused overhaul)
1. **`<img>` → `<Image>` in product detail** — replaced 3 raw `<img>` tags in composite children, bundle items, and related products with `next/image` + reusable `SmallProductImage` component
2. **Removed duplicate `<main>` in catalog** — changed inner `<main>` to `<div>` (root layout already wraps in `<main id="main-content">`)
3. **Pagination synced to URL** — `page` param reflected in URL via `window.history.replaceState` for back-navigation preservation
4. **Fixed `mainImage` type drift** — changed `ProductListItem.mainImage` from `string | null` to `{ id: number; url: string } | null` in `types/catalog.ts`; removed `resolveImageUrl()` workaround
5. **Removed "Популярные" sort** — option removed from UI and API (was a no-op falling through to newest since no `viewCount` field exists)
6. **Categories from API** — filter sidebar loads from `/api/categories` instead of hardcoded `DEFAULT_CATEGORIES`; new admin categories appear immediately
7. **Badge filter from all products** — `/api/products` returns `availableBadges` metadata from a `distinct` query; badge filter no longer limited to current page
8. **Error handling for product fetch** — catalog shows error state with retry button instead of silent `catch { /* ignore */ }`
9. **`priority` on first 4 ProductCard images** — above-the-fold cards get `priority` prop for faster LCP
10. **ARIA on filters** — `role="radiogroup"` + `aria-checked` on category buttons, `aria-pressed` on badge toggles, `aria-label` on price/sort inputs, `aria-expanded` on mobile filter toggle, `aria-current="page"` on active pagination
11. **Thumbnail stable keys** — `key={img.url}` instead of `key={idx}` in ImageGallery
12. **FavoriteButton hit area** — increased from `w-8 h-8` (32px) to `w-9 h-9` (36px sm) / `w-10 h-10` (40px lg) for better mobile touch targets
13. **Collapsible description** — descriptions >200 chars collapse with "Читать далее"/"Свернуть" toggle
14. **Dead import removed** — `getProductPrice` unused import removed from `_client.tsx`; quantity selector capped at 99 client-side

### Round 10 — 14 features (conversion, trust, SEO, UX)
1. **Server-side delivery validation** — conditional validation: city+address required for non-pickup, phone required for courier, email format validated; `Cache-Control: no-store` on response
2. **Add-to-cart error handling** — toast.error on API failure + non-ok response
3. **"Купить сейчас" button** — secondary CTA next to "В корзину" that adds item and redirects to `/cart`
4. **Two-step mobile checkout** — step wizard on mobile: Step 1 = cart items, Step 2 = checkout form; desktop unchanged; step indicator with numbered circles
5. **Trust badges system** — `TrustBadge` + `ProductTrustBadge` models; admin CRUD page (`/admin/trust-badges`); per-product assignment in product form; public API with product-specific fallback to defaults; 10 Lucide SVG icons; display on product detail page
6. **"Notify when available"** — `WaitlistEntry` model; POST API with rate limit 3/min; email form instead of "В корзину" when stock=0
7. **Stock quantity limit** — client: `+` button caps at `stockQuantity` when > 0, disabled state; server: checkout caps quantity to stock, warns
8. **Enhanced JSON-LD Product** — `offers.availability` (InStock/LimitedAvailability/PreOrder based on stock); `offers.shippingDetails` (Russia, 1-2 day handling, 2-7 day transit); `priceCurrency: "RUB"`; `material` field
9. **Sitemap from DB** — categories from DB with fallback to defaults; static pages use `new Date()`
10. **Cart page metadata** — `/cart/layout.tsx` with `title: "Корзина"` + `robots: { index: false }`
11. **Price filter debounce** — 500ms delay; instant display, delayed API
12. **Delete button 44px + safe area** — `w-11 h-11`; iPhone safe area
13. **Parallel fetch on landing** — `Promise.all()` — ~200-400ms speedup
14. **Stock badges on ProductCard** — gray "Под заказ" badge when stock=0; amber "Осталось мало!" when stock 1-3

### Round 11 — 14 features (conversion, trust, search, quality)
1. **"В корзину" on landing product cards** — quick add button on each card; `e.preventDefault/stopPropagation` to prevent Link navigation; toast feedback; refetch cart count
2. **Delivery cost estimation** — `src/lib/delivery-cost.ts` service with static rates (СДЭК 350₽, Почта 300₽, Курьер 500₽, Самовывоз 0₽); cost shown on method buttons in checkout; delivery line in totals; Итого includes delivery (free above 3000₽); infrastructure for Yandex.Delivery API
3. **Promo recalculation on quantity change** — useEffect watches `total`, re-validates promo after 300ms debounce
4. **Search button in catalog** — visible "Найти" button next to search input (desktop sidebar + mobile drawer)
5. **Waitlist notification mechanism** — `src/lib/waitlist-notify.ts` email service; admin API `POST /api/admin/waitlist/notify`; auto-trigger when admin changes stock from 0→>0; `waitlistCount` in admin product list
6. **Review form on product detail** — StarRating component (5 stars); name + rating + text form; POST to `/api/reviews` with productId + categoryId; "appears after moderation" message
7. **Fixed animate-pulse** — replaced infinite pulse with 3-pulse CSS animation (`pulse-badge` keyframe in globals.css)
8. **`<img>` → `<Image>` in cart + landing search** — cart items use `next/image` with `fill` + `sizes="96px"`; landing search results use `fill` + `sizes="40px"`
9. **"Показано X-Y из Z" + filter pills** — range text above product grid; mobile-only active filter pills (category, search, age, price, badges) with × removal
10. **Pagination buttons 44px** — `w-11 h-11` on mobile (Apple HIG minimum)
11. **hasActiveFilters debounce fix** — uses `minPrice`/`maxPrice` (instant) instead of `debouncedMinPrice`/`debouncedMaxPrice`
12. **Cart count fetch optimized** — landing uses `GET /api/cart?count=1` instead of full cart fetch
13. **Full-text search with tsvector** — `scripts/add-search-vector.sql` migration: tsvector column + GIN index + auto-update trigger (Russian morphology); `src/lib/search.ts` helper; `description` added to search OR clause; 4 existing rows backfilled
14. **robots.txt updated** — added `/cart`, `/profile`, `/order-success` to disallow
15. **Auth cleanup + privacyConsent fix** — removed console.log from jwt/session callbacks; fixed boolean→string type hack on checkbox

### Round 12 — 12 features (delivery overhaul, conversion, UX, quality)
1. **Delivery overhaul: Яндекс.Маркет ПВЗ + Самовывоз** — removed СДЭК/Почта/Курьер; `delivery-cost.ts` rewritten with 2 options + `fetchYandexDeliveryCost()` API stub; `/delivery` page updated; server validation simplified; `YANDEX_DELIVERY_API_KEY`/`YANDEX_SENDER_ID` env vars
2. **Single source of truth for delivery** — `delivery-cost.ts` consumed by checkout + delivery page
3. **"Купить сейчас" client navigation** — `router.push("/cart")` instead of full page reload
4. **Informative order success page** — 3-step guide, payment info, delivery estimate, Telegram CTA, 3 action buttons; `noindex` metadata
5. **Price filter by effective price** — post-filters by `basePrice * (1 - discountPercent/100)`
6. **Parallel API requests on product detail** — `Promise.all()` for related + reviews
7. **Recently viewed products** — `useRecentlyViewed` hook (localStorage, max 12); landing section (max 8)
8. **Delivery page: 2 options** — ПВЗ Яндекс.Маркет (250₽) + Самовывоз (free); return policy 7 days
9. **Clear cart after order** — `removePromo()` on checkout success
10. **Beautiful image placeholder** — gradient + icon + "Фото скоро" text
11. **next/image in profile** — product favorites; avatar `referrerPolicy="no-referrer"`
12. **Profile tabs ARIA** — `role="tablist"`/`tab`/`tabpanel` on all 6 tabs
13. **Order success metadata** — `title` + `noindex`

### Round 9 — 12 features (delivery, trust, UX)
1. **Delivery method + address in checkout** — 4 options (СДЭК/Почта/Курьер/Самовывоз) + city/address/index fields; saved to `CatalogOrder` (deliveryMethod, deliveryCity, deliveryAddress, deliveryIndex)
2. **Email field + order confirmation** — optional email in checkout; `nodemailer` service at `src/lib/email.ts` sends HTML confirmation with order details (fire-and-forget, non-blocking); requires SMTP env vars
3. **Privacy consent checkbox** — required before order submission; links to `/privacy` page
4. **Stock status on products** — `stockQuantity` and `stockStatus` fields on Product model; green "В наличии", amber "Осталось N шт.", gray "Под заказ"; admin form includes stock field
5. **Free shipping progress bar** — threshold 3000₽; progress bar fills as cart total increases; shows "До бесплатной доставки осталось X₽" → "Бесплатная доставка!"
6. **WhatsApp + social contacts** — WhatsApp link in landing footer alongside Telegram
7. **Social sharing on product page** — native Web Share API on mobile; Telegram + WhatsApp + copy-link fallback on desktop
8. **middleware.ts (proxy.ts)** — admin routes already protected via `src/proxy.ts` (Next.js 16 proxy pattern); redirects `/admin/*` to login when no admin cookie
9. **Landing page metadata** — server component wrapper with title, description, OG tags; client-only 3D scene moved to `LandingClient.tsx`
10. **Cart UX: undo + bigger buttons** — item removal shows toast with "Отменить" action (re-adds item); quantity buttons increased 32px → 40px; toast supports action buttons
11. **Recommended age field + catalog filter** — `recommendedAge` on Product model; admin form dropdown (0+/6m+/1+/3+/6+); age filter in catalog sidebar; age badge on ProductCard
12. **Privacy policy page** — `/privacy` with standard Russian legal text (10 sections); linked from checkout consent and footer; `noindex` robots
13. **Stock badges on ProductCard** — gray "Под заказ" badge when stock=0; amber pulsing "Осталось мало!" when stock 1-3; positioned at `bottom-2.5 left-2.5`

### Round 13 — 13 features (conversion, UX, admin settings)
1. **Performance: prefetch disabled on product links** — `prefetch={false}` on ProductCard `<Link>` eliminates 6 ERR_ABORTED requests on every page load
2. **WhatsApp/Telegram "Ask" buttons on product detail** — pre-filled messages with product name + URL
3. **Aggregate Rating JSON-LD on homepage** — `StoreRatingJsonLd` client component; `/api/reviews?stats=1` returns `{ count, avg }`
4. **Cart auth banner** — "Войдите, чтобы сохранить корзину" banner for guests; pre-fill form data for authenticated users
5. **Newsletter auto-promo code** — footer form generates 5% code (prefix `NEWS`), exit-intent generates 10% (prefix `WELCOME`); 30-day expiry, 100 max uses
6. **Personalized recommendations** — "Вам может понравиться" section on product detail shows products from other categories
7. **"Под заказ" info banner** — out-of-stock message on product detail with waitlist guidance
8. **Exit-intent popup** — discount popup on mouse-leave viewport (10% for email); one-time per session via localStorage
9. **Quick View modal** — "Быстрый просмотр" on catalog product cards; full product preview with images, price, add-to-cart
10. **Reviews page** — `/reviews` with aggregate rating, distribution bars, star-based filtering, product links
11. **Product FAQ accordion** — `ProductFaq` DB model + API; per-product FAQ items on product detail page
12. **Order status tracker + Reorder** — visual 5-step progress bar in profile orders tab; "Повторить" button re-adds items to cart
13. **Yandex Maps + admin-configurable contacts** — `SiteSettings` model; admin page `/admin/site-settings` for address/phone/hours/Telegram/WhatsApp/map URL; MapWidget on delivery page; public API `/api/site-settings`

### Round 14 — Blog System (content marketing, SEO, engagement)
1. **Blog DB schema** — 5 new models: `BlogCategory` (name/slug/order), `BlogPost` (title/slug/content/heroImage/status/author/category/tags/comments/relatedProductIds/SEO fields/views/pin), `BlogPostTag` (composite PK), `BlogPostImage` (url/alt/order), `BlogComment` (text/authorName/authorEmail/userId/threaded replies/isApproved)
2. **Public blog API** — `GET /api/blog` (list with pagination, category/tag/search filters, no content for bandwidth), `GET /api/blog/[slug]` (full post + cookie-based view tracking + 3 related posts), `GET /api/blog/categories`, `GET /api/blog/tags`, `GET/POST /api/blog/comments` (auth-aware: users auto-approved, guests moderated)
3. **Admin blog API** — `GET/POST /api/admin/blog` (list all statuses + create with Cyrillic→Latin auto-slug, auto-readTime, auto-publishedAt), `GET/PUT/DELETE /api/admin/blog/[id]` (edit/delete with tag replacement in transaction), `GET/POST /api/admin/blog/categories`, `PUT/DELETE /api/admin/blog/categories/[id]` (nullifies categoryId on posts before delete)
4. **Blog upload API** — `POST /api/admin/blog/upload` (image upload with type/size validation), `GET /api/uploads/blog/[...path]` (serve from disk)
5. **Tiptap rich-text editor** — `BlogEditor.tsx` (1145 lines): toolbar with Bold/Italic/Underline/Strike, H2/H3, lists, blockquote, code, alignment, link, image (URL+upload), YouTube, Product Embed, undo/redo; 2-column layout; auto-save 5s debounce; custom `ProductEmbed` atom node (`div[data-product-id]`)
6. **Admin blog pages** — `/admin/blog` (list with status tabs, search, pagination), `/admin/blog/new` + `/admin/blog/[id]/edit` (Tiptap editor), `/admin/blog/categories` (inline CRUD)
7. **Admin sidebar** — added "Блог" + "Рубрики блога" to "Контент" section
8. **Public blog listing** — `/blog` with hero section, category pills, 3-col grid cards, subscribe form, pagination; `BlogCard` component (image, pinned badge, category, title, excerpt, date/readTime/views)
9. **Public blog post** — `/blog/[slug]` with hero image, breadcrumbs, H1, metadata row, tags, `BlogContent` (HTML renderer with inline product card replacement), share buttons, comments, related posts, product recommendations
10. **Blog comments** — `BlogComments.tsx`: auth-aware (session check), threaded replies (parentId), guest moderation, avatar circles
11. **Blog SEO** — `generateMetadata` (title/description/OG/article:published_time/article:section), JSON-LD Article + BreadcrumbList, sitemap entries (posts priority 0.7, categories 0.6)
12. **Blog navigation** — "Блог" link in footer "Информация" section
13. **Reusable components** — `Pagination` (ellipsis, mobile), `ShareButtons` (Telegram/WhatsApp/Copy), `BlogSubscribeForm` (email subscribe)

## Architecture Notes

### Admin Route Protection
Admin routes are protected via `src/proxy.ts` (Next.js 16 proxy pattern) — redirects unauthenticated visitors from `/admin/*` to `/admin/login` before the page even renders. All `/api/admin/*` endpoints also check `isAdmin(request)` server-side.

### Database Indexes
The following `@@index` directives exist in `prisma/schema.prisma`:
- `ProductImage.productId`, `CartItem.userId`, `CartItem.sessionId`
- `ProductFavorite.productId`, `ProductFavorite.userId` (via `@@unique`)
- `Review.categoryId`, `Review.productId`, `Review.isApproved`
- `PromoCode.code`, `PromoCode.isActive`
- `PromoCodeUse.promoCodeId`, `PromoCodeUse.userId`, `PromoCodeUse.sessionId`
- `Account.userId`, `Account.[provider, providerId]` (unique)
- `CatalogOrder.userId`, `CatalogOrder.promoCodeId`, `CatalogOrder.status`
- `OrderItem.orderId`, `OrderItem.productId`
- `Order.userId`, `SavedDesign.userId`
- `Subscriber.isActive`, `User.telegramChatId`
- `SiteSettings.key`, `ProductFaq.productId`, `ProductFaq.order`
- `BlogPost.categoryId`, `BlogPost.status`, `BlogPost.publishedAt`, `BlogPost.isPinned`, `BlogPost.slug`
- `BlogPostImage.postId`, `BlogComment.postId`, `BlogComment.userId`, `BlogComment.parentId`, `BlogComment.isApproved`

### Auth JWT Performance
The `jwt` callback in `src/lib/auth.ts` queries `prisma.account.findUnique()` on every session refresh. Should only query on initial sign-in; subsequent refreshes should trust the stored `userId`.

### Promo Code Architecture
Shared utility at `src/lib/promo-utils.ts` — single source of truth for `checkConditions()`, `calculateDiscount()`, `effectivePrice()`, `cartTotal()`. Both `/api/promo/validate` and `/api/cart/checkout` import from this file. All scopes (cart/products/categories/gift) and conditions (required products, categories, min qty, min amount, conditionMode, maxUsesPerUser) are fully evaluated. Input sanitization (length limits + trim) applied at checkout.
