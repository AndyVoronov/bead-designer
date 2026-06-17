# 5 минут тишины

Интернет-магазин игрушек и аксессуаров для малышей — держатели для пустышек, браслеты для прорезывания, вязаные игрушки, наборы.

## Стек

| Технология | Версия | Назначение |
|------------|--------|------------|
| Next.js | 16.2.1 (Turbopack) | Фреймворк, SSR/SSG, App Router |
| React | 19.2.4 | UI |
| NextAuth.js | v5 beta.30 | OAuth-авторизация (Яндекс, VK, Telegram) |
| Prisma | 7.6.0 | ORM |
| PostgreSQL | 16 | БД |
| Tailwind CSS | 4 | Стилизация |
| Three.js + Rapier | 0.183 / 2.2 | 3D-конструктор бусин (движок физики) |
| Zustand | 5 | State management (3D-редактор) |
| PM2 | — | Process manager на сервере |
| Nginx | — | Reverse proxy, SSL |

## Структура проекта

```
src/
├── app/
│   ├── page.tsx                    # Главная (landing)
│   ├── layout.tsx                  # Корневой layout (ScrollFix, CartBadge, брендинг)
│   ├── catalog/
│   │   ├── page.tsx                # Каталог товаров
│   │   └── [slug]/page.tsx         # Карточка товара
│   ├── cart/page.tsx               # Корзина (промокоды, оформление заказа)
│   ├── editor/page.tsx             # 3D-конструктор бусин
│   ├── design/[code]/page.tsx      # Сохранённый дизайн
│   ├── profile/page.tsx            # Личный кабинет (авторизация)
│   ├── about/page.tsx              # Страница «О нас» (SSR, SEO)
│   ├── delivery/page.tsx           # Доставка и оплата (SSR, SEO)
│   ├── faq/page.tsx                # Частые вопросы (SSR, SEO)
│   └── admin/                      # Панель управления
│       ├── login/page.tsx          # Вход (логин + пароль)
│       ├── layout.tsx              # Сайдбар с навигацией
│       ├── products/               # Управление товарами
│       │   ├── page.tsx            # Список (с фото, категориями, ценами)
│       │   ├── product-form.tsx    # Форма создания/редактирования
│       │   ├── new/page.tsx        # Новый товар
│       │   └── [id]/edit/page.tsx  # Редактирование товара
│       ├── categories/page.tsx     # Категории (с количеством товаров)
│       ├── badges/page.tsx         # Бейджи (Хит, Новинка, Скидка)
│       ├── promo-codes/page.tsx    # Промокоды (с условиями применения)
│       ├── catalog-orders/page.tsx # Заказы каталога
│       ├── orders/page.tsx         # Заказы конструктора
│       ├── templates/page.tsx      # Шаблоны конструктора
│       ├── reviews/page.tsx        # Модерация отзывов
│       └── beads/page.tsx          # Бусины (для конструктора)
├── api/
│   ├── admin/auth/route.ts         # Вход в админку (login + password → cookie)
│   ├── admin/products/             # CRUD товаров, загрузка изображений
│   ├── admin/categories/           # CRUD категорий, сортировка
│   ├── admin/badges/               # CRUD бейджей
│   ├── admin/promo-codes/          # CRUD промокодов
│   ├── admin/catalog-orders/       # Управление заказами каталога
│   ├── admin/orders/               # Управление заказами конструктора
│   ├── admin/templates/            # Управление шаблонами
│   ├── admin/reviews/              # Модерация отзывов
│   ├── auth/[...nextauth]/route.ts # Auth.js handlers
│   ├── auth/providers/route.ts     # GET /api/auth/providers — список активных OAuth
│   ├── auth/session/route.ts       # Сессия текущего пользователя
│   ├── auth/telegram/route.ts      # Telegram Login Widget (JWT)
│   ├── cart/route.ts               # GET/POST корзина (cookie-based)
│   ├── cart/checkout/route.ts      # Оформление заказа
│   ├── products/route.ts           # GET /api/products — каталог
│   ├── products/[slug]/route.ts    # GET /api/products/[slug] — товар + «Входит в наборы»
│   ├── categories/route.ts         # Категории (публичный)
│   ├── promo/validate/route.ts     # POST — проверка промокода + условия
│   ├── product-favorites/route.ts  # GET/POST — избранное товаров
│   ├── catalog-orders/mine/route.ts # GET — заказы каталога текущего пользователя
│   ├── favorites/route.ts          # Избранное шаблонов
│   ├── reviews/route.ts            # Отзывы (публичные)
│   ├── orders/route.ts             # Заказы конструктора
│   └── uploads/products/[...path]/ # Отдача изображений товаров
├── components/
│   ├── auth/LoginModal.tsx         # Модалка OAuth-входа (динамический список провайдеров)
│   ├── auth/SignOut.tsx            # Кнопка выхода
│   ├── landing/LandingOverlay.tsx  # Landing page overlay (брендинг «5 минут тишины»)
│   ├── landing/LandingPage.tsx     # Полная landing страница
│   ├── catalog/ProductCard.tsx     # Карточка товара в каталоге (с избранным)
│   ├── catalog/CartBadge.tsx       # Иконка корзины в шапке
│   ├── catalog/ImageGallery.tsx    # Галерея изображений товара
│   ├── analytics/MetricsScript.tsx # Yandex.Metrica (NEXT_PUBLIC_YM_ID)
│   ├── layout/PageHeader.tsx      # Общий sticky header для страниц
│   ├── ScrollFix.tsx               # Фикс мобильного скролла (убирает overflow:hidden)
│   ├── editor/                     # 3D-конструктор (Three.js + Rapier)
│   └── scene/                      # 3D-сцена, бусины, нить, физика
├── lib/
│   ├── auth.ts                     # Auth.js конфигурация (провайдеры)
│   ├── auth-provider.tsx           # React контекст сессии
│   ├── admin-auth.ts               # Проверка admin cookie
│   ├── prisma.ts                   # Prisma client singleton
│   ├── catalog-utils.ts            # Утилиты каталога (formatPrice, generateSlug)
│   ├── bead-utils.ts               # Утилиты бусин (catalogBeadToBeadState)
│   ├── telegram.ts                 # Telegram JWT верификация
│   └── serialization.ts            # Сериализация/десериализация дизайнов
├── types/catalog.ts                # TypeScript типы каталога
├── types/bead.ts                   # TypeScript типы конструктора
└── stores/useDesignStore.ts        # Zustand store для 3D-редактора
```

## База данных

### Основные модели

| Модель | Назначение |
|--------|------------|
| `Product` | Товары (simple / composite) |
| `Category` | Категории (с сортировкой) |
| `ProductImage` | Изображения товаров |
| `Badge` / `ProductBadge` | Бейджи (Хит, Новинка, Скидка) |
| `CompositeItem` | Состав набора (parent → children) |
| `CartItem` | Корзина (cookie-based) |
| `CatalogOrder` / `OrderItem` | Заказы каталога |
| `PromoCode` / `PromoCodeUse` | Промокоды с условиями |
| `User` / `Account` | Пользователи OAuth |
| `Template` | Шаблоны конструктора |
| `Order` | Заказы конструктора |
| `SavedDesign` | Сохранённые дизайны |
| `Favorite` | Избранное шаблонов |
| `ProductFavorite` | Избранное товаров |
| `Review` | Отзывы |
| `Bead` | Бусины для конструктора |

### Промокоды — структура

- **Scope** — что дисконтируется: корзина целиком / конкретные товары / категории / подарок
- **Conditions** — когда промо применяется: обязательные товары/категории в корзине, минимальное количество конкретного товара, минимальная сумма заказа
- `conditionMode`: `all` (все условия) / `any` (хотя бы одно)

## Локальная разработка

```bash
# Установка зависимостей
npm install

# Миграции БД (при изменении schema.prisma)
npx prisma db push
# Генерация Prisma-клиента
npx prisma generate

# Дев-сервер
npm run dev

# Сидирование БД (бусины, шаблоны)
npx prisma db seed
```

### Переменные окружения

Скопируйте `.env.example` → `.env` и заполните. Минимальные для локальной разработки:

```bash
DATABASE_URL=postgresql://beaduser:PASS@localhost:5432/beaddesigner
ADMIN_LOGIN=admin
ADMIN_PASSWORD=admin123
AUTH_SECRET=<random 32 chars>
AUTH_TRUST_HOST=true
NEXTAUTH_URL=http://localhost:3000
```

## Деплой

Подробности в [DEPLOY.md](./DEPLOY.md).

Кратко:

```bash
npm run build
# Перенос standalone + static на сервер
# Починка Turbopack symlinks
# pm2 restart bead-designer
```

## Продакшен

| Параметр | Значение |
|----------|----------|
| Домен | `5minutesofsilence.ru` |
| Старый домен | `thekidsdream.ru` → 301 на основной |
| Сервер | `root@82.38.60.189` |
| Путь на сервере | `/opt/bead-designer` |
| PM2 процесс | `bead-designer` |
| SSL | Let's Encrypt, продление автоматически |

## Известные нюансы

1. **Turbopack symlinks** — после каждого деплоя на сервере нужно пересоздать хешированные символические ссылки для `@prisma/client-HASH` и `pg-HASH` (см. DEPLOY.md)
2. **Изображения товаров** — хранятся на сервере в `/opt/bead-designer/uploads/products/`, в БД — полный путь `/uploads/products/xxx.jpg`. Клиент строит URL через `/api${url}`
3. **OAuth провайдеры** — VK и Telegram отключены (нет credentials), Яндекс активен. Провайдеры определяются динамически через `/api/auth/providers`
4. **Корзина** — cookie-based, не привязана к аккаунту
5. **Удаление товара** — `CartItem` каскадно удаляется, `OrderItem` устанавливает `productId = null` (SET NULL) для сохранения истории заказов
