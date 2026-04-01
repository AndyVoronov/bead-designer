# Personal Account — Architecture Plan

## Auth Providers
- **NextAuth.js v5 (Auth.js)** — session, JWT, OAuth flow
- **Yandex ID** — OAuth2, returns email/name/avatar
- **Telegram Login Widget** — returns id/name/username/photo
- **VK OAuth** — returns id/name/photo

All three — user can link multiple social accounts to one profile.
Contextual auth: login modal appears when user tries to save/favorite/review.
No separate login page. Route: `/profile`.

Saved designs: unlimited per user.

---

## Database Schema

### New tables

```prisma
model User {
  id        Int       @id @default(autoincrement())
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  name      String?
  email     String?   @unique
  avatar    String?
  phone     String?

  accounts   Account[]
  favorites  Favorite[]
  reviews    Review[]
  designs    SavedDesign[]
  orders     Order[]
}

model Account {
  id          Int    @id @default(autoincrement())
  userId      Int    @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider    String  // "yandex" | "telegram" | "vkontakte"
  providerId  String
  accessToken String?
  accountId   String? // username in social network

  user User @relation(fields: [userId], references: [id])

  @@unique([provider, providerId])
}

model Favorite {
  id         Int      @id @default(autoincrement())
  userId     Int      @relation(fields: [userId], references: [id], onDelete: Cascade)
  templateId Int      @relation(fields: [templateId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())

  user     User     @relation(fields: [userId], references: [id])
  template Template @relation(fields: [templateId], references: [id])

  @@unique([userId, templateId])
}

model Review {
  id         Int      @id @default(autoincrement())
  userId     Int      @relation(fields: [userId], references: [id], onDelete: Cascade)
  authorName String   // snapshot of User.name at publish time
  rating     Int      // 1-5
  text       String
  isApproved Boolean  @default(false)
  createdAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}

model SavedDesign {
  id         Int      @id @default(autoincrement())
  userId     Int      @relation(fields: [userId], references: [id], onDelete: Cascade)
  name       String
  designCode String
  beadCount  Int
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])
}
```

### Modified tables
- `Order` — add `userId Int? @relation(fields: [userId], references: [id])`
- `Template` — add `favorites Favorite[]`, `favoriteCount Int @default(0)` (denormalized)

---

## Profile Tabs
1. **Мои дизайны** — saved from constructor (grid with thumbnails, open/delete)
2. **Избранное** — liked templates
3. **Мои отзывы** — with status badge (на модерации / опубликовано)
4. **Заказы** — order history table
5. **Профиль** — name, phone, linked social accounts

---

## API Routes
| Method | Route | Description |
|--------|-------|-------------|
| | `/api/auth/[...nextauth]` | NextAuth handlers |
| POST/DELETE | `/api/favorites/[templateId]` | Toggle favorite |
| GET | `/api/favorites` | User's favorites |
| GET | `/api/reviews` | Approved reviews (public) |
| POST | `/api/reviews` | Create review (auth required) |
| GET | `/api/reviews/mine` | User's reviews with status |
| POST | `/api/designs/save` | Save design (auth required) |
| GET | `/api/designs/saved` | User's saved designs |
| DELETE | `/api/designs/saved/[id]` | Delete saved design |
| GET | `/api/orders/mine` | User's orders |

---

## Admin Additions
- Reviews: list all, approve/delete buttons
- Users: view users, linked accounts

---

## UI Components
- `AuthProvider` — session wrapper
- `LoginModal` — contextual auth with 3 social buttons
- `ProfileLayout` — tab navigation + content
- `ProfileDesigns` — saved designs grid
- `ProfileFavorites` — favorited templates
- `ProfileReviews` — user reviews with status
- `ProfileOrders` — order history
- `ProfileSettings` — name/phone/socials
- `FavoriteButton` — heart toggle on template cards
- `SaveDesignDialog` — name input in constructor
- `ReviewForm` — stars + text in landing reviews
- `StarRating` — clickable 1-5 stars input

---

## Implementation Order (suggested slices)
1. **Auth + User model** — NextAuth setup, Yandex/Telegram/VK providers, session, LoginModal
2. **Profile + SavedDesigns** — /profile page, tabs layout, save/load designs from constructor
3. **Favorites** — FavoriteButton, favorites tab, denormalized counter on templates
4. **Reviews** — ReviewForm, moderation, reviews tab, admin approve/delete
5. **Orders linkage** — userId on orders, orders tab, improve order flow with auth
