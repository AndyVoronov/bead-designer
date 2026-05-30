# 5 минут тишины — Deployment Guide

## Предварительные требования

- **VPS** с SSH доступом (Ubuntu 20.04+ или Debian 11+)
- **Домены** с A-записями → IP VPS
- **Локальная машина** с Node.js 20+, npm, ssh
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

Секреты хранятся в `/opt/bead-designer/.env` на VPS. PM2 загружает их через `npm start` (next start автоматически подгружает `.env` из рабочей директории).

| Переменная | Описание | Пример |
|------------|----------|--------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://beaduser:PASS@localhost:5432/beaddesigner` |
| `ADMIN_LOGIN` | Логин админки | `admin` |
| `ADMIN_PASSWORD` | Пароль админки | `your_secure_password` |
| `NODE_ENV` | Окружение | `production` |
| `PORT` | Порт приложения | `3000` |
| `AUTH_SECRET` | JWT-секрет Auth.js (32+ символов) | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | Доверять прокси для Auth.js | `true` |
| `NEXTAUTH_URL` | Канонический URL для OAuth | `https://5minutesofsilence.ru` |
| `AUTH_YANDEX_ID` | Yandex OAuth client ID | Из https://oauth.yandex.ru |
| `AUTH_YANDEX_SECRET` | Yandex OAuth client secret | Из https://oauth.yandex.ru |
| `AUTH_VK_ID` | VK OAuth client ID *(опционально)* | Из https://dev.vk.com |
| `AUTH_VK_SECRET` | VK OAuth client secret *(опционально)* | Из https://dev.vk.com |
| `TELEGRAM_BOT_NAME` | Имя Telegram бота *(опционально)* | Из @BotFather |

**Важно:** `.env` исключён из git через `.gitignore`. Никогда не коммитьте секреты.

**CRITICAL:** Next.js standalone `server.js` НЕ загружает `.env` автоматически. После каждого деплоя нужно:
1. Добавить `require('dotenv').config()` в `server.js`
2. Убедиться что `ADMIN_COOKIE_SECRET` есть в `.env`
3. Использовать `pm2 stop` + `pm2 start` (НЕ `pm2 restart --update-env` — он не перечитывает `.env`)

**Не перезаписывайте `.env` на сервере при деплое** — tar-архив standalone затирает корневые файлы. Локальный `.env` отличается от серверного.

**OAuth callback URLs** (указываются в настройках приложения Яндекс/VK):
- Yandex: `https://5minutesofsilence.ru/api/auth/callback/yandex`
- VK: `https://5minutesofsilence.ru/api/auth/callback/vkontakte`

## Деплой

### Быстрый деплой (скрипт)

```bash
DEPLOY_HOST=82.38.60.189 DOMAIN=5minutesofsilence.ru bash deploy.sh
```

### Ручной деплой

**ВАЖНО:** `.env` хранится в `/opt/bead-config/.env` (ВНЕ директории проекта).
`deploy.sh` автоматически восстанавливает symlink после распаковки. Если скрипт не используется —
всегда делайте `ln -sf /opt/bead-config/.env /opt/bead-designer/.env` после `tar xf`.

#### Шаг 1: Билд локально

```bash
npm run build
```

#### Шаг 2: Перенос файлов на VPS

Через deploy-скрипт (рекомендуется — автоматическая починка symlinks, .env, dotenv, рестарт):

```bash
# Standalone (через wrapper в /usr/local/bin/bead-deploy — НЕ затирается при деплое)
tar cf - -C .next/standalone . | ssh root@82.38.60.189 'bash /usr/local/bin/bead-deploy'

# Статика (отдельно)
tar cf - -C .next/static . | ssh root@82.38.60.189 'cd /opt/bead-designer && tar xf - -C .next/static/'
```

Или починить после ручного деплоя:
```bash
ssh root@82.38.60.189 'bash /usr/local/bin/bead-deploy fix'
```

**Важно:** deploy-скрипт хранится в `/usr/local/bin/bead-deploy` (ВНЕ проекта).

Или вручную (тогда нужно восстановить .env symlink):

```bash
# Standalone
tar cf - -C .next/standalone . | ssh root@82.38.60.189 "tar xf - -C /opt/bead-designer/"

# Статика
tar cf - -C .next/static . | ssh root@82.38.60.189 "tar xf - -C /opt/bead-designer/.next/static/"

# ВОССТАНОВИТЬ .env (ОБЯЗАТЕЛЬНО после tar xf!)
ssh root@82.38.60.189 "ln -sf /opt/bead-config/.env /opt/bead-designer/.env"
```

**Важно:** не копируйте `.env` с локальной машины — это затрёт серверные секреты!

#### Шаг 3: Починка Turbopack хешированных символических ссылок

> Если используете `deploy.sh` — этот шаг выполняется автоматически.

Turbopack создаёт хешированные ссылки (`@prisma/client-HASH`, `pg-HASH`) с абсолютными путями локальной машины — они не работают на Linux-сервере. Хеши меняются при каждом билде.

```bash
ssh root@82.38.60.189 <<'REMOTE'
cd /opt/bead-designer

PRISMA_HASH=$(grep -roh "prisma/client-[a-f0-9]*" .next/server/chunks/ 2>/dev/null | sed "s|prisma/client-||" | sort -u | head -1)
PG_HASH=$(grep -roh "pg-[a-f0-9]*" .next/server/chunks/ 2>/dev/null | sed "s|pg-||" | sort -u | head -1)

rm -f .next/node_modules/@prisma/client-$PRISMA_HASH .next/node_modules/pg-$PG_HASH
ln -sf /opt/bead-designer/node_modules/.prisma/client .next/node_modules/@prisma/client-$PRISMA_HASH
ln -sf /opt/bead-designer/node_modules/pg .next/node_modules/pg-$PG_HASH

rm -rf .next/cache
echo "Symlinks fixed: prisma=$PRISMA_HASH pg=$PG_HASH"
REMOTE
```

#### Шаг 3.5: Восстановление dotenv и ADMIN_COOKIE_SECRET

Next.js standalone `server.js` не загружает `.env` автоматически, а `tar xf` при деплое перезаписывает файлы.

```bash
ssh root@82.38.60.189 <<'REMOTE'
cd /opt/bead-designer

# 1. Вставить require('dotenv').config() в server.js (после строки с path)
if ! grep -q 'require.*dotenv' server.js; then
  sed -i '4a require("dotenv").config()' server.js
  echo "Added dotenv to server.js"
fi

# 2. Убедиться ADMIN_COOKIE_SECRET есть в .env
if ! grep -q 'ADMIN_COOKIE_SECRET' .env; then
  echo "ADMIN_COOKIE_SECRET=$(openssl rand -hex 32)" >> .env
  echo "Added ADMIN_COOKIE_SECRET to .env"
fi

echo "Dotenv ready"
REMOTE
```

#### Шаг 4: Перезапуск

```bash
ssh root@82.38.60.189 <<'REMOTE'
cd /opt/bead-designer
pm2 stop bead-designer || true
pm2 delete bead-designer 2>/dev/null || true
pm2 start npm --name bead-designer -- start
pm2 save
REMOTE
sleep 4
# Проверка
ssh root@82.38.60.189 "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/"
# Ожидается: 200
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
curl -s -o /dev/null -w "%{http_code}" https://5minutesofsilence.ru/
# Ожидается: 200

# Старый домен редиректит
curl -s -o /dev/null -w "%{http_code}" https://thekidsdream.ru/
# Ожидается: 301

# API каталога
curl https://5minutesofsilence.ru/api/products | python3 -m json.tool | head -5

# OAuth провайдеры
curl https://5minutesofsilence.ru/api/auth/providers
# Ожидается: {"providers":["yandex"]}

# Товары в корзине возвращают categoryId
curl -s -c /tmp/test -X POST "https://5minutesofsilence.ru/api/cart" \
  -H "Content-Type: application/json" \
  -d '{"productId":9,"quantity":1}' && \
curl -s -b /tmp/test "https://5minutesofsilence.ru/api/cart" | python3 -c "
import json,sys; d=json.load(sys.stdin)
print(d['items'][0]['product'].get('categoryId'))
"
# Ожидается: 4
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
ssh root@82.38.60.189 "pm2 logs bead-designer --lines 50"
ssh root@82.38.60.189 "tail -f /var/log/nginx/error.log"
```

### Перезапуск
```bash
ssh root@82.38.60.189 "pm2 restart bead-designer"
# Полный стоп и старт (если нужно):
ssh root@82.38.60.189 "pm2 stop bead-designer || true; pm2 delete bead-designer 2>/dev/null || true; cd /opt/bead-designer && pm2 start node --name bead-designer -- server.js; pm2 save"
```

### Миграции БД
```bash
ssh root@82.38.60.189 "cd /opt/bead-designer && npx prisma db push"
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

### Turbopack hashed module symlinks (502 / import errors)

**Симптомы:** `Cannot find module '@prisma/client-<hash>'` или `'pg-<hash>'`

**Решение:** Шаг 3 в ручном деплое. Хеши меняются при каждом билде.

### PM2 не подхватывает переменные окружения

**Симптомы:** Auth.js `UntrustedHost` или `AUTH_SECRET is not set`

**Решение:** `pm2 restart bead-director --update-env`. Проверить: `pm2 show bead-designer`.

### DNS не обновляется

Проверьте через NS напрямую: `nslookup domain.ru ns1.hosting.reg.ru`

### OAuth redirect_uri mismatch

После смены домена обновите:
1. OAuth callback URLs в настройках приложения Яндекс/VK
2. `NEXTAUTH_URL` в `.env` на сервере
3. `pm2 restart bead-designer --update-env`

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
- [ ] `.env` на VPS содержит все переменные (ADMIN_LOGIN, ADMIN_PASSWORD, AUTH_*, etc.)
- [ ] `NEXTAUTH_URL` совпадает с основным доменом
- [ ] OAuth callback URLs совпадают с основным доменом
- [ ] `npm run build` прошёл успешно
- [ ] Standalone + static перенесены на сервер
- [ ] **Не затёрт `.env` на сервере**
- [ ] Turbopack symlinks пересозданы
- [ ] `server.js` содержит `require('dotenv').config()`
- [ ] PM2 start: `pm2 start node --name bead-designer -- server.js`
- [ ] `nginx.conf` скопирован на сервер и reload
- [ ] Health check → 200
- [ ] Старый домен редиректит на основной
- [ ] Админка: логин + пароль работают
- [ ] Изображения товаров отображаются
- [ ] OAuth-вход работает end-to-end
