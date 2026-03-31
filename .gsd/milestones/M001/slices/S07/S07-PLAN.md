# S07: Интеграция + деплой

**Goal:** Полное приложение развёрнуто на reg.ru VPS по HTTPS с PostgreSQL, автозапуском через PM2, и доступно по URL. Production-сборка проверена локально.
**Demo:** `curl https://<domain>` возвращает главную страницу с 3D-конструктором. `/admin` доступен по паролю. Все 16 маршрутов отвечают 200.

## Must-Haves

- PostgreSQL вместо SQLite: schema provider, PrismaPg adapter в prisma.ts и seed.ts
- Next.js standalone output для оптимизированного деплоя на VPS
- Nginx reverse proxy конфиг с HTTPS (Let's Encrypt), gzip, X-Accel-Buffering
- PM2 ecosystem конфиг для автозапуска Next.js приложения
- Deploy скрипт: build → rsync → remote migrate + seed + restart
- VPS provisioning скрипт: Node.js 20, PostgreSQL, Nginx, certbot, PM2
- Production build проходит локально со всеми 16 маршрутами
- .env.production шаблон с плейсхолдерами

## Proof Level

- This slice proves: operational
- Real runtime required: yes (VPS with PostgreSQL)
- Human/UAT required: yes (SSL cert activation, real mobile FPS test)

## Verification

- `npx tsc --noEmit` — zero errors
- `npx vitest run` — all 64 tests pass (tests don't hit DB, so they work without PostgreSQL)
- `npm run build` — succeeds with standalone output, all 16 routes in output
- `bash scripts/smoke-test.sh <domain>` — all routes return 200 (requires deployed VPS)
- `pm2 status bead-designer` on VPS — online status
- `curl -I https://<domain>` — HTTP 200 with proper headers

## Observability / Diagnostics

- Runtime signals: PM2 process status (`pm2 status`), PM2 logs (`pm2 logs bead-designer`), Nginx access/error logs (`/var/log/nginx/`), PostgreSQL connection logs
- Inspection surfaces: `GET /api/templates` (public API health), `GET /api/admin/templates` (admin API + auth health), PM2 monit, `systemctl status nginx postgresql`
- Failure visibility: PM2 auto-restarts crashed app with error timestamp in logs, Nginx returns 502 if Next.js is down, deploy.sh exits on any command failure
- Redaction constraints: .env.production contains DATABASE_URL with password and ADMIN_PASSWORD — never committed to git (.gitignore excludes .env*)

## Integration Closure

- Upstream surfaces consumed: `src/lib/prisma.ts` (Prisma singleton used by all API routes), `src/proxy.ts` (auth guard for admin), all 16 routes from S01–S06
- New wiring introduced in this slice: prisma.ts → PostgreSQL via PrismaPg adapter, Nginx → Next.js on port 3000, PM2 → Node.js process, Let's Encrypt → Nginx SSL
- What remains before the milestone is truly usable end-to-end: real mobile FPS UAT (manual, requires deployed URL), ADMIN_PASSWORD set to a secure value on VPS

## Tasks

- [x] **T01: Migrate to PostgreSQL + standalone output** `est:30m`
  - Why: Приложение использует SQLite (libsql) для локальной разработки (D024), но production требует PostgreSQL (D004). Нужно сменить provider, адаптер, и добавить standalone output для оптимизированного деплоя.
  - Files: `prisma/schema.prisma`, `src/lib/prisma.ts`, `prisma/seed.ts`, `prisma.config.ts`, `next.config.ts`, `package.json`, `.env.production`
  - Do: Установить @prisma/adapter-pg + pg. Сменить provider на postgresql в schema.prisma. Заменить PrismaLibSql на PrismaPg с pg.Pool в prisma.ts и seed.ts. Удалить SQLite миграции. Добавить output: 'standalone' в next.config.ts. Создать .env.production шаблон. Обновить .gitignore.
  - Verify: `npx tsc --noEmit` (0 errors), `npx vitest run` (64 tests pass)
  - Done when: Код компилируется, тесты проходят, schema provider = postgresql, standalone output включён, .env.production существует
- [x] **T02: Create deployment configuration files** `est:45m`
  - Why: Для деплоя на VPS нужны конфиги Nginx (reverse proxy + SSL), PM2 (автозапуск), скрипт деплоя и скрипт первоначальной настройки VPS. Все параметры (домен, пути) должны быть настраиваемыми.
  - Files: `nginx.conf`, `ecosystem.config.cjs`, `deploy.sh`, `scripts/setup-vps.sh`, `.env.production`
  - Do: Создать nginx.conf с reverse proxy на localhost:3000, SSL через Let's Encrypt, gzip, X-Accel-Buffering: no. Создать ecosystem.config.cjs для PM2 (next start, автозапуск, логи). Создать deploy.sh (build → rsync → remote prisma db push + seed + pm2 restart). Создать scripts/setup-vps.sh (установка Node.js 20, PostgreSQL, Nginx, certbot, PM2, создание БД и юзера). Все параметры через переменные окружения с дефолтами.
  - Verify: `test -f nginx.conf && test -f ecosystem.config.cjs && test -f deploy.sh && test -f scripts/setup-vps.sh`
  - Done when: Все конфигурационные файлы существуют, shell-скрипты синтаксически корректны (bash -n)
- [x] **T03: Production build verification + deploy execution** `est:45m`
  - Why: Финальная задача проверяет что production-сборка работает со всеми маршрутами, выполняет деплой на VPS (если доступны учётные данные), и проводит smoke test. Это закрывает R010.
  - Files: `scripts/smoke-test.sh`, `DEPLOY.md`
  - Do: Запустить npm run build и проверить что все 16 маршрутов в выводе. Создать scripts/smoke-test.sh для проверки здоровья на VPS (curl все маршруты). Создать DEPLOY.md с пошаговой инструкцией. Собрать VPS credentials через secure_env_collect. Запустить deploy.sh. Запустить smoke-test.sh. Обновить R010 validation.
  - Verify: `npm run build` succeeds, `grep -c "route" .next/routes-manifest.json` >= 16 (или аналогичная проверка)
  - Done when: Production build успешен, deploy скрипт отработал (или VPS недоступен — тогда build + документация + smoke-test script готовы), R010 обновлён

## Files Likely Touched

- `prisma/schema.prisma`
- `src/lib/prisma.ts`
- `prisma/seed.ts`
- `prisma.config.ts`
- `next.config.ts`
- `package.json`
- `.env.production`
- `.env.example`
- `.gitignore`
- `nginx.conf`
- `ecosystem.config.cjs`
- `deploy.sh`
- `scripts/setup-vps.sh`
- `scripts/smoke-test.sh`
- `DEPLOY.md`
