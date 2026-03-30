---
estimated_steps: 5
estimated_files: 5
---

# T02: Create deployment configuration files

**Slice:** S07 — Интеграция + деплой
**Milestone:** M001

## Description

Create all deployment configuration files needed to run the application on a reg.ru VPS with PostgreSQL, Nginx reverse proxy, HTTPS via Let's Encrypt, and PM2 process management.

All configuration is parameterized via environment variables with sensible defaults, since VPS credentials and domain are unknown at plan time (per S07 research findings). The deploy script handles the full cycle: local build → rsync to VPS → remote schema push → seed → PM2 restart.

## Steps

1. Create `nginx.conf` — reverse proxy template:
   - Listen 80 (HTTP redirect to HTTPS) and 443 (HTTPS with SSL)
   - `server_name` as placeholder `_DOMAIN_` (replaced by deploy.sh)
   - `ssl_certificate` / `ssl_certificate_key` paths for Let's Encrypt (`/etc/letsencrypt/live/_DOMAIN_/`)
   - `location /` proxy_pass to `http://127.0.0.1:3000` with standard proxy headers (`X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, `Host`)
   - `X-Accel-Buffering: no` header for Next.js streaming responses
   - Gzip on for common MIME types (text/plain, text/css, application/json, application/javascript, image/svg+xml)
   - Static file caching: `location /_next/static/` with `expires 365d` and `add_header Cache-Control "public, immutable"`
   - Placeholders: `_DOMAIN_` (domain name), `_APP_PATH_` (app path on VPS)

2. Create `ecosystem.config.cjs` — PM2 process config:
   - App name: `bead-designer`
   - Script: `node server.js` (standalone entry point)
   - CWD: placeholder `_APP_PATH_`
   - Instances: 1 (single-core VPS likely)
   - env: `NODE_ENV=production`, `PORT=3000`
   - Log files: `~/.pm2/logs/bead-designer-out.log`, `~/.pm2/logs/bead-designer-error.log`
   - `autorestart: true`, `watch: false`, `max_memory_restart: '512M'` (VPS may have limited RAM)

3. Create `deploy.sh` — build + deploy script:
   - Parameters from env: `DEPLOY_HOST` (VPS IP/hostname), `DEPLOY_USER` (SSH user, default: root), `DEPLOY_PATH` (app path, default: /opt/bead-designer), `DOMAIN` (domain for Nginx)
   - Steps:
     a. `npm run build` locally
     b. `rsync -avz --delete` `.next/standalone/` to `$DEPLOY_HOST:$DEPLOY_PATH/`
     c. `rsync -avz` `.next/static/` to `$DEPLOY_HOST:$DEPLOY_PATH/.next/static/`
     d. `rsync -avz` `public/` to `$DEPLOY_HOST:$DEPLOY_PATH/public/`
     e. `rsync -avz` `prisma/` to `$DEPLOY_HOST:$DEPLOY_PATH/prisma/`
     f. `rsync -avz` `ecosystem.config.cjs` to `$DEPLOY_HOST:$DEPLOY_PATH/`
     g. `rsync -avz` `.env.production` to `$DEPLOY_HOST:$DEPLOY_PATH/.env`
     h. SSH to VPS: `cd $DEPLOY_PATH && npx prisma db push && npx prisma db seed && npx pm2 restart ecosystem.config.cjs`
   - Sed replacement of `_DOMAIN_` and `_APP_PATH_` placeholders in nginx.conf before copy
   - Copy nginx.conf to `/etc/nginx/sites-available/bead-designer`, symlink to sites-enabled
   - `nginx -t && systemctl reload nginx`
   - Error handling: `set -euo pipefail`, echo each step, exit on failure

4. Create `scripts/setup-vps.sh` — first-time VPS provisioning:
   - Parameters: `DOMAIN` (required), `APP_USER` (default: beaduser), `DB_NAME` (default: beaddesigner), `DB_USER` (default: beaduser), `DB_PASSWORD` (required)
   - Steps:
     a. Update system: `apt update && apt upgrade -y`
     b. Install: `curl, git, build-essential, nginx, certbot, python3-certbot-nginx`
     c. Install Node.js 20.x via NodeSource
     d. Install PM2 globally: `npm install -g pm2`
     e. Install PostgreSQL: `apt install -y postgresql postgresql-contrib`
     f. Create database and user: `sudo -u postgres createuser -P $DB_USER`, `sudo -u postgres createdb -O $DB_USER $DB_NAME`
     g. Start services: `systemctl enable --now nginx postgresql`
     h. Create app directory: `mkdir -p /opt/bead-designer`
     i. Request SSL cert: `certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN` (or skip if no domain yet)
   - Error handling: `set -euo pipefail`

5. Update `.gitignore` — add deployment artifacts:
   - Add `*.pem` (already exists)
   - Ensure `.env.production` is covered by existing `.env*` pattern
   - No changes needed — existing .gitignore already covers all deployment artifacts

## Must-Haves

- [ ] `nginx.conf` with reverse proxy to localhost:3000, SSL, gzip, X-Accel-Buffering: no
- [ ] `ecosystem.config.cjs` with PM2 config for standalone server.js
- [ ] `deploy.sh` with full build → rsync → migrate → seed → restart cycle
- [ ] `scripts/setup-vps.sh` with Node.js, PostgreSQL, Nginx, certbot, PM2 installation
- [ ] All scripts use `set -euo pipefail` and parameterized via env vars
- [ ] `bash -n deploy.sh` and `bash -n scripts/setup-vps.sh` pass (syntax check)

## Verification

- `test -f nginx.conf && test -f ecosystem.config.cjs && test -f deploy.sh && test -f scripts/setup-vps.sh`
- `bash -n deploy.sh && bash -n scripts/setup-vps.sh` — shell syntax valid
- `grep -q "X-Accel-Buffering" nginx.conf` — anti-buffering header present
- `grep -q "proxy_pass" nginx.conf` — reverse proxy configured
- `grep -q "standalone" ecosystem.config.cjs` — references standalone output
- `grep -q "prisma db push" deploy.sh` — schema application step present

## Inputs

- `next.config.ts` — standalone output config (from T01)
- `.env.production` — production env template (from T01)
- `.gitignore` — current ignore rules

## Expected Output

- `nginx.conf` — Nginx reverse proxy template with SSL and performance headers
- `ecosystem.config.cjs` — PM2 process configuration for standalone Next.js
- `deploy.sh` — one-command deploy script (build → rsync → remote setup)
- `scripts/setup-vps.sh` — first-time VPS provisioning script
