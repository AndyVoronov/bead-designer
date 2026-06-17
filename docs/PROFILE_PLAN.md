# Personal Account — Implementation Status

> Original architecture plan preserved below with implementation notes.

## ✅ Auth (Implemented)
- **NextAuth.js v5 (Auth.js)** — JWT sessions, OAuth flow
- **Yandex ID** — OAuth2, active in production
- **Telegram Login Widget** — JWT verification, route at `/api/auth/telegram`
- **VK OAuth** — conditional (credentials not configured, code ready)
- **LoginModal** — dynamic provider list from `/api/auth/providers`
- **Contextual auth** — modal triggers on protected actions
- Files: `src/lib/auth.ts`, `src/lib/auth-provider.tsx`, `src/components/auth/LoginModal.tsx`, `src/app/api/auth/telegram/route.ts`

## ✅ Profile (Implemented)
- `/profile` page with tabs
- **Мои дизайны** — saved designs from constructor
- **Избранное** — liked templates
- **Мои отзывы** — user reviews with status
- **Заказы** — order history
- **Профиль** — name, phone, linked social accounts
- Files: `src/app/profile/page.tsx`

## ✅ Favorites (Implemented)
- Toggle favorite on templates
- Favorites tab in profile
- Files: `src/app/api/favorites/route.ts`

## ✅ Reviews (Implemented)
- Star rating + text form
- Moderation in admin (`/admin/reviews`)
- User reviews tab with status (pending/approved)
- Files: `src/app/api/reviews/route.ts`, `src/app/api/reviews/mine/route.ts`

## ✅ Orders linkage (Implemented)
- `userId` on orders
- Orders tab in profile (`/api/orders/mine`)
- Files: `src/app/api/orders/mine/route.ts`

## ✅ 3D Constructor (Implemented)
- Bead chain editor with physics (Rapier)
- Save/load designs
- Templates browser
- Files: `src/app/editor/page.tsx`, `src/components/editor/`, `src/components/scene/`

## ✅ Catalog + E-commerce (Implemented)
- Product catalog with categories, badges, composite bundles
- Cart (cookie-based) with checkout
- Promo codes with scope and conditions
- Admin panel: products, categories, badges, promo codes, orders
- Image upload via admin
- Files: `src/app/catalog/`, `src/app/cart/`, `src/app/api/promo/`

## 🔮 Future Plans
- Soft/plush toys catalog expansion
- VK OAuth credentials configuration
- Product image replacement with real photos
- Deploy script improvement (don't overwrite `.env`, auto-fix symlinks)
- Webpack fallback for production builds (eliminate Turbopack symlink issue)

---

# Original Architecture Plan (Reference)

## Database Schema

See `prisma/schema.prisma` for current state. Key models:

- `User` / `Account` — OAuth users with linked social accounts
- `Favorite` — user favorites on templates
- `Review` — user reviews with moderation
- `SavedDesign` — saved 3D designs
- `Order` / `OrderItem` — constructor orders
- `CatalogOrder` — catalog product orders
- `Product` (simple/composite) / `Category` / `Badge` / `PromoCode`

## Implementation Order (Completed)
1. ~~**Auth + User model** — NextAuth setup, Yandex/Telegram/VK providers, session, LoginModal~~ ✅
2. ~~**Profile + SavedDesigns** — /profile page, tabs layout, save/load designs~~ ✅
3. ~~**Favorites** — FavoriteButton, favorites tab~~ ✅
4. ~~**Reviews** — ReviewForm, moderation, reviews tab, admin approve/delete~~ ✅
5. ~~**Orders linkage** — userId on orders, orders tab~~ ✅
