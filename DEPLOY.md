# 5 минут тишины — Deployment Guide

## Предварительные требования

- **VPS** с SSH доступом (Ubuntu 24.04)
- **Домены** с A-записями → IP VPS
- **Локальная машина** с Node.js 20+, npm, ssh (tar, scp)
- **Git**

## Информация о продакшене

| Параметр | Значение |
|----------|----------|
| VPS IP | `82.38.60.189` |
| VPS провайдер | HOSTKEY (US, Ubuntu 24.04) |
| Основной домен | `5minutesofsilence.ru` |
| Старый домен | `thekidsdream.ru` → 301 на основной |
| Путь на сервере | `/opt/bead-designer` |
| БД | PostgreSQL 16, `beaduser` / `beaddesigner` |
| PM2 процесс | `bead-designer` |
| PM2 старт | `pm2 start node --name bead-designer -- server.js` (standalone, НЕ `next start`) |
| SSL | Let's Encrypt (certbot), прямое HTTPS на nginx (порт 443 НЕ блокируется) |
| DNS | Cloudflare (DNS-only, серые облака). Регистратор: REG.RU. NS: `alec.ns.cloudflare.com` / `amber.ns.cloudflare.com` |
| Загрузки | `/var/www/toydesigner/uploads/` (nginx отдаёт напрямую) |
| Конфиг | `/opt/bead-config/.env` (ВНЕ проекта, symlink в `/opt/bead-designer/.env`) |
| Деплой-скрипт | `/usr/local/bin/bead-deploy` (ВНЕ проекта, не затирается при tar) |

## Домены

| Домен | Роль | SSL | Поведение |
|--------|------|-----|-----------|
| `5minutesofsilence.ru` | Основной | `/etc/letsencrypt/live/5minutesofsilence.ru/` | Отдаёт приложение |
| `www.5minutesofsilence.ru` | Алиас | Тот же сертификат | Отдаёт приложение |
| `thekidsdream.ru` | Старый | `/etc/letsencrypt/live/thekidsdream.ru/` | 301 → `5minutesofsilence.ru` |
| `www.thekidsdream.ru` | Старый | Тот же сертификат | 301 → `5minutesofsilence.ru` |

## Переменные окружения

Секреты хранятся в `/opt/bead-config/.env` на VPS. `require('dotenv').config()` в `server.js` загружает их при старте.

| Переменная | Описание | Пример |
|------------|----------|--------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://beaduser:PASS@localhost:5432/beaddesigner` |
| `ADMIN_LOGIN` | Логин админки | `admin` |
| `ADMIN_PASSWORD` | Пароль админки | `your_secure_password` |
| `ADMIN_COOKIE_SECRET` | HMAC-секрет админ-токена | `openssl rand -hex 32` |
| `NODE_ENV` | Окружение | `production` |
| `PORT` | Порт приложения | `3000` |
| `AUTH_SECRET` | JWT-секрет Auth.js (32+ символов) | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | Доверять прокси для Auth.js | `true` |
| `NEXTAUTH_URL` | Канонический URL для OAuth | `https://5minutesofsilence.ru` |
| `AUTH_YANDEX_ID` | Yandex OAuth client ID | Из https://oauth.yandex.ru |
| `AUTH_YANDEX_SECRET` | Yandex OAuth client secret | Из https://oauth.yandex.ru |
| `AUTH_VK_ID` | VK OAuth client ID *(опционально)* | Из https://dev.vk.com |
| `AUTH_VK_SECRET` | VK OAuth client secret *(опционально)* | Из https://dev.vk.com |
| `TELEGRAM_BOT_TOKEN` | Telegram бот токен *(опционально)* | Из @BotFather |
| `TELEGRAM_BOT_NAME` | Имя Telegram бота *(опционально)* | Из @BotFather |

**Важно:** `.env` исключён из git через `.gitignore`. Никогда не коммитьте секреты.

**Не перезаписывайте `.env` на сервере при деплое** — tar-архив standalone затирает корневые файлы. `bead-deploy` автоматически восстанавливает symlink.

**OAuth callback URLs** (указываются в настройках приложения Яндекс/VK):
- Yandex: `https://5minutesofsilence.ru/api/auth/callback/yandex`
- VK: `https://5minutesofsilence.ru/api/auth/callback/vkontakte`

## Деплой

### Быстрый деплой (рекомендуется)

Единственная рабочая команда — piped tar через SSH в `bead-deploy`:

```bash
# 1. Билд локально
npm run build

# 2. Деплой standalone на сервер (piped tar — не зависает, в отличие от SCP больших файлов)
tar cf - -C .next/standalone . | ssh root@82.38.60.189 'cd /opt/bead-designer && bash /usr/local/bin/bead-deploy'

# 3. Обновить статику (если изменились CSS/шрифты)
tar cf - -C .next/static . | ssh root@82.38.60.189 'cd /opt/bead-designer && tar xf - -C .next/static/'

# 4. Обновить public/ (если добавились новые файлы: изображения книг и т.д.)
tar cf - public/ | ssh root@82.38.60.189 'cd /opt/bead-designer && tar xf -'
```

**Почему piped tar, не SCP:** SCP на Windows зависает при передаче файлов >100MB. Piped tar через SSH работает стабильно.

### bead-deploy скрипт

Скрипт `/usr/local/bin/bead-deploy` (на сервере, ВНЕ проекта). Делает:

1. **Extract** — `rm -rf .next/server .next/cache && tar xf -` (читает из stdin)
2. **Sync manifests** — копирует `server/` и все manifest файлы из `.next/standalone/.next/` в `.next/` (Next.js ищет их в корневом `.next/`)
3. **Symlink .env** → `/opt/bead-config/.env`
4. **Fix Turbopack hashed symlinks** — `mkdir -p .next/node_modules/@prisma` затем `ln -sf` для `@prisma/client-HASH` и `pg-HASH`
5. **dotenv** — добавляет `require("dotenv").config()` в `server.js` если нет
6. **PM2 restart** — stop → delete → start `node server.js` → save

**Fix mode** (без распаковки — только sync manifests + symlink + рестарт):
```bash
ssh root@82.38.60.189 'bash /usr/local/bin/bead-deploy fix'
```

**Важно:** если после деплоя все страницы возвращают 500, "no products", или `/admin/login` показывает 404 — запустите fix:
```bash
ssh root@82.38.60.189 'bash /usr/local/bin/bead-deploy fix'
```

### Ручной деплой (без bead-deploy)

Если скрипт по какой-то причине не работает:

```bash
# 1. Билд
npm run build

# 2. Piped tar standalone
tar cf - -C .next/standalone . | ssh root@82.38.60.189 "cd /opt/bead-designer && rm -rf .next/server .next/cache && tar xf -"

# 3. Piped tar static
tar cf - -C .next/static . | ssh root@82.38.60.189 "cd /opt/bead-designer && tar xf - -C .next/static/"

# 4. Восстановить .env symlink (ОБЯЗАТЕЛЬНО — tar затирает!)
ssh root@82.38.60.189 "ln -sf /opt/bead-config/.env /opt/bead-designer/.env"

# 5. Fix Turbopack hashed symlinks
ssh root@82.38.60.189 <<'REMOTE'
cd /opt/bead-designer
mkdir -p .next/node_modules/@prisma .next/node_modules
PRISMA_HASH=$(grep -roh "prisma/client-[a-f0-9]*" .next/server/chunks/ 2>/dev/null | sed "s|prisma/client-||" | sort -u | head -1)
PG_HASH=$(grep -roh "pg-[a-f0-9]*" .next/server/chunks/ 2>/dev/null | sed "s|pg-||" | sort -u | head -1)
rm -f .next/node_modules/@prisma/client-$PRISMA_HASH .next/node_modules/pg-$PG_HASH 2>/dev/null
[ -n "$PRISMA_HASH" ] && ln -sf /opt/bead-designer/node_modules/.prisma/client .next/node_modules/@prisma/client-$PRISMA_HASH
[ -n "$PG_HASH" ] && ln -sf /opt/bead-designer/node_modules/pg .next/node_modules/pg-$PG_HASH
rm -rf .next/cache
echo "Fixed: prisma=$PRISMA_HASH pg=$PG_HASH"
REMOTE

# 6. Добавить dotenv если нет
ssh root@82.38.60.189 'grep -q "dotenv" /opt/bead-designer/server.js || sed -i "4a require(\"dotenv\").config()" /opt/bead-designer/server.js'

# 7. Рестарт PM2
ssh root@82.38.60.189 'cd /opt/bead-designer && pm2 stop bead-designer 2>/dev/null; pm2 delete bead-designer 2>/dev/null; pm2 start node --name bead-designer -- server.js; pm2 save'

# 8. Проверка
sleep 5
ssh root@82.38.60.189 "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/"
# Ожидается: 200
```

### Изменения в схеме БД

Если `prisma/schema.prisma` был изменён:

```bash
# После деплоя standalone (node_modules/prisma уже на сервере)
ssh root@82.38.60.189 "cd /opt/bead-designer && npx prisma db push"
```

## Nginx

Конфиг `nginx.conf` в корне проекта — **единственный источник истины**. Деплой:
```bash
scp nginx.conf root@82.38.60.189:/etc/nginx/sites-enabled/bead-designer
ssh root@82.38.60.189 "nginx -t && systemctl reload nginx"
```

Обрабатывает:
- Оба домена на одном IP
- SSL через Let's Encrypt (прямое HTTPS, порт 443)
- HTTP → HTTPS редирект (302)
- Кеширование статики (`/_next/static/` — 365 дней, immutable)
- Загрузки с диска (`/api/uploads/` → `/var/www/toydesigner/uploads/`)
- Reverse proxy → Next.js :3000
- ACME webroot для certbot (`/var/www/letsencrypt`)
- Security headers: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy

### Важно: Cloudflare DNS-only
- DNS управляется через **Cloudflare** (DNS-only, серые облака)
- **НЕ включайте Proxied (оранжевые облака)** — Cloudflare прокси вызывает медленную загрузку для некоторых российских провайдеров
- Если случайно включили — переключите обратно в DNS only и подождите 1-2 минуты

### SSL сертификаты
- `5minutesofsilence.ru`: `/etc/letsencrypt/live/5minutesofsilence.ru/` (август 2026)
- `thekidsdream.ru`: `/etc/letsencrypt/live/thekidsdream.ru/` (июль 2026)
- Продление: `certbot renew && systemctl reload nginx` (cron уже настроен)
- Порт 443 НЕ блокируется HOSTKEY — работает напрямую

## Добавление нового домена

1. A-запись `@` → `82.38.60.189` в **Cloudflare DNS** (серое облако, DNS only)
2. **Удалите AAAA-запись**, если сервер не имеет глобального IPv6 — Let's Encrypt HTTP-01 не пройдёт по IPv6
3. SSL: `ssh root@82.38.60.189 "certbot --nginx -d newdomain.ru -d www.newdomain.ru"`
4. Добавьте server block в `nginx.conf`
5. Обновите `NEXTAUTH_URL` и OAuth callback URLs
6. Деплой конфига: `scp nginx.conf root@82.38.60.189:/etc/nginx/sites-enabled/bead-designer`

## Проверка после деплоя

```bash
# Health check
ssh root@82.38.60.189 "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/"
# Ожидается: 200

# Внешний
curl -s -o /dev/null -w "%{http_code}" https://5minutesofsilence.ru/
# Ожидается: 200

# Старый домен редиректит
curl -s -o /dev/null -w "%{http_code}" https://thekidsdream.ru/
# Ожидается: 301

# API каталога
curl https://5minutesofsilence.ru/api/products | python3 -m json.tool | head -5

# Админка редиректит на логин
curl -s -o /dev/null -w "%{http_code}" https://5minutesofsilence.ru/admin
# Ожидается: 307
```

### Визуальная проверка

1. `https://5minutesofsilence.ru/` — landing «5 минут тишины»
2. `https://thekidsdream.ru/` → редирект на основной домен
3. DevTools → Network — нет 404 на статике
4. `/admin/login` — логин + пароль, брендинг «5 минут тишины»
5. `/admin/products` — фото товаров отображаются
6. OAuth: «Войти через Яндекс» → `passport.yandex.ru` → возврат с сессией

## Обслуживание

### Логи
```bash
ssh root@82.38.60.189 "pm2 logs bead-designer --lines 50 --nostream"
ssh root@82.38.60.189 "tail -f /var/log/nginx/error.log"
```

### Перезапуск
```bash
ssh root@82.38.60.189 "cd /opt/bead-designer && pm2 restart bead-designer"
# Полный стоп и старт:
ssh root@82.38.60.189 "cd /opt/bead-designer && pm2 stop bead-designer 2>/dev/null; pm2 delete bead-designer 2>/dev/null; pm2 start node --name bead-designer -- server.js; pm2 save"
```

### Доступ к БД
```bash
ssh root@82.38.60.189 "PGPASSWORD='BeadDesign2026!' psql -U beaduser -h localhost -d beaddesigner"
```

### SSL продление
```bash
ssh root@82.38.60.189 "certbot renew && systemctl reload nginx"
```

## Проблемы и решения

### Turbopack hashed module symlinks (502 / import errors / БД не отвечает)

**Симптомы:** `Cannot find module '@prisma/client-<hash>'` или `'pg-<hash>'`
Или: все страницы 200 но каталог пуст, шаблоны не загружаются, админка не открывается — Prisma не может подключиться к БД.

**Решение:** `ssh root@82.38.60.189 'bash /usr/local/bin/bead-deploy fix'`

Хеши меняются при каждом билде. `bead-deploy` автоматом их пересоздаёт (включая `mkdir -p .next/node_modules/@prisma`).

### PM2 crash-loop: "Could not find a production build"

**Симптомы:** процесс падает сразу после старта, в логах ENOENT для `routes-manifest.json` или `pages-manifest.json`.

**Причина:** `tar xf -C /opt/bead-designer/` распаковал standalone в `.next/standalone/`, но Next.js ищет manifest файлы в `.next/` (корневом).

**Решение:** используйте `bead-deploy` — он распаковывает tar в корень проекта и файлы попадают куда нужно.

### SCP зависает на Windows

**Симптомы:** `scp largefile.tar.gz root@host:/tmp/` зависает бесконечно.

**Решение:** используйте **piped tar через SSH** вместо SCP:
```bash
tar cf - .next/standalone .next/static | ssh root@82.38.60.189 'cd /opt/bead-designer && tar xf -'
```

### PM2 не подхватывает переменные окружения

**Симптомы:** Auth.js `UntrustedHost` или `AUTH_SECRET is not set`

**Решение:** Полный рестарт (stop → delete → start), НЕ `pm2 restart`:
```bash
ssh root@82.38.60.189 "cd /opt/bead-designer && pm2 stop bead-designer; pm2 delete bead-designer; pm2 start node --name bead-designer -- server.js; pm2 save"
```

### Изображения товаров не загружаются (404)

**Симптомы:** `<img src="/uploads/products/xxx.jpg">` → 404

**Решение:** В коде всегда используйте префикс `/api` для путей из БД:
```tsx
// Правильно — DB хранит /uploads/products/xxx.jpg
src={`/api${image.url}`}
// Неправильно — 404
src={image.url}
```

### Let's Encrypt не продлевает сертификат

**Симптомы:** `certbot renew` падает с ошибкой IPv6

**Решение:** Удалите AAAA-запись в DNS. У сервера нет глобального IPv6, но Boulder кеширует AAAA и пытается HTTP-01 по IPv6.

## Архитектура

```
Интернет → DNS (Cloudflare DNS-only, серые облака)
       → Nginx (443/SSL, Let's Encrypt)
            ├─ 5minutesofsilence.ru → Next.js (PM2, :3000) → PostgreSQL (:5432)
            └─ thekidsdream.ru → 301 → 5minutesofsilence.ru
                                            Next.js ↔ Яндекс OAuth (passport.yandex.ru)
```

**Ключевое:** трафик идёт **напрямую** к VPS через Cloudflare DNS (без Cloudflare прокси). Порт 443 НЕ блокируется HOSTKEY.

## Чеклист деплоя

- [ ] DNS A-записи в Cloudflare → `82.38.60.189` (серые облака, DNS only)
- [ ] SSL сертификаты валидны для всех доменов
- [ ] `.env` на VPS содержит все переменные (ADMIN_LOGIN, ADMIN_PASSWORD, AUTH_*, ADMIN_COOKIE_SECRET)
- [ ] `NEXTAUTH_URL` совпадает с основным доменом
- [ ] OAuth callback URLs совпадают с основным доменом
- [ ] `npm run build` прошёл успешно
- [ ] Standalone + static + public перенесены на сервер (piped tar)
- [ ] **`.env` не затёрт** (bead-deploy восстанавливает symlink автоматически)
- [ ] Turbopack symlinks пересозданы (bead-deploy fix)
- [ ] PM2 restart через stop→delete→start (не `pm2 restart`)
- [ ] Health check → 200
- [ ] `https://5minutesofsilence.ru/` → 200
- [ ] Старый домен редиректит на основной → 301
- [ ] Админка: логин + пароль работают
- [ ] Изображения товаров отображаются
