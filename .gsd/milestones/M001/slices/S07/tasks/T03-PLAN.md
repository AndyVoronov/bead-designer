---
estimated_steps: 6
estimated_files: 3
---

# T03: Production build verification + deploy execution

**Slice:** S07 — Интеграция + деплой
**Milestone:** M001

## Description

The final task verifies the complete application works as a production build, creates a smoke test script for post-deploy verification, attempts actual deployment to the VPS (if credentials are available), and documents the deployment process.

This task closes R010: "Приложение развёрнуто и доступно по URL на VPS reg.ru. Production-сборка, HTTPS, автозапуск."

**Note on VPS access:** VPS credentials (hostname, SSH user, domain) are unknown at plan time. If credentials are provided interactively during execution, this task will attempt the full deploy. If not, it will verify the production build locally and ensure all deploy artifacts are ready for manual deployment.

## Steps

1. Run production build and verify all 16 routes:
   ```
   npm run build
   ```
   Check that `.next/standalone/` exists and contains the server. Check build output for all routes:
   - 6 admin pages: /admin, /admin/login, /admin/templates, /admin/orders, /admin/beads, /admin/page
   - 5 admin API routes: /api/admin/auth, /api/admin/templates, /api/admin/templates/[id], /api/admin/orders, /api/admin/orders/[id]/status
   - 5 public routes: /, /editor, /design/[code], /api/templates, /api/templates/[code], /api/orders

2. Create `scripts/smoke-test.sh` — post-deploy health check:
   - Parameter: `BASE_URL` (default: https://localhost:3000)
   - curl checks for each route (expect HTTP 200):
     - `GET $BASE_URL/` — main page
     - `GET $BASE_URL/editor` — editor page
     - `GET $BASE_URL/api/templates` — public API
     - `GET $BASE_URL/admin/login` — admin login page
   - curl check for auth guard:
     - `GET $BASE_URL/admin` — expect 302 redirect to /admin/login (or 200 with redirect)
     - `GET $BASE_URL/api/admin/templates` — expect 401
   - Print summary: pass/fail per route, total pass count
   - `set -euo pipefail`

3. Create `DEPLOY.md` — deployment guide:
   - Prerequisites: VPS with SSH access, domain pointing to VPS IP
   - First-time setup: run `bash scripts/setup-vps.sh` with parameters
   - Environment variables needed: DOMAIN, DB_PASSWORD, ADMIN_PASSWORD
   - Deploy: run `bash deploy.sh` with parameters
   - Post-deploy: run `bash scripts/smoke-test.sh https://<domain>`
   - Maintenance: `pm2 logs`, `pm2 restart`, `nginx -t && systemctl reload nginx`
   - Troubleshooting: common issues (DB connection, port 3000 in use, SSL cert renewal)

4. Collect VPS credentials via `secure_env_collect`:
   - `DEPLOY_HOST` — VPS IP address or hostname (hint: e.g., 185.xxx.xxx.xxx)
   - `DEPLOY_USER` — SSH username (hint: usually root)
   - `DOMAIN` — domain name (hint: e.g., bead-designer.ru)
   - `DB_PASSWORD` — PostgreSQL password for the beaduser
   - `ADMIN_PASSWORD` — secure admin panel password for production

5. If credentials were provided, execute the deploy:
   - Run `bash scripts/setup-vps.sh` first (with idempotent checks — skip steps if already done)
   - Run `bash deploy.sh` with collected credentials
   - Run `bash scripts/smoke-test.sh https://$DOMAIN`
   - If any step fails, report the error clearly with remediation steps

6. Update R010 requirement validation with the deployment result:
   - If deployed successfully: mark R010 as validated with production URL
   - If VPS not accessible: update R010 notes with "deploy scripts ready, awaiting VPS credentials"

## Observability Impact

This task adds runtime-inspection surfaces for the deployed application:

- **`scripts/smoke-test.sh`** — Post-deploy health check that verifies all 16 routes respond correctly (200/302/401). This is the primary inspection surface after deploy — any agent or operator can run it to verify deployment health.
- **PM2 status/logs** — `pm2 status bead-designer` and `pm2 logs bead-designer` on the VPS provide process health and error visibility (created in T02, exercised in deploy step).
- **Nginx access/error logs** — `/var/log/nginx/access.log` and `/var/log/nginx/error.log` capture HTTP-level failures (502 if Next.js is down, SSL errors).
- **Build verification** — `npm run build` output confirms all 16 routes compile successfully. Failed routes appear as build errors, making missing/misconfigured routes immediately visible.
- **Failure visibility** — If deploy fails, `deploy.sh` exits immediately (set -euo pipefail) with [N/8] step prefix indicating which step failed. PM2 auto-restarts crashed processes with error timestamps.

## Must-Haves

- [ ] `npm run build` succeeds with `.next/standalone/` directory present
- [ ] All 16 routes confirmed in build output
- [ ] `scripts/smoke-test.sh` exists and passes `bash -n` syntax check
- [ ] `DEPLOY.md` exists with complete deployment instructions
- [ ] R010 requirement updated with deployment status

## Verification

- `npm run build` — succeeds, exit code 0
- `test -d .next/standalone` — standalone output directory exists
- `test -f scripts/smoke-test.sh && bash -n scripts/smoke-test.sh` — smoke test script exists and is valid
- `test -f DEPLOY.md && wc -l DEPLOY.md | awk '{print $1 >= 30}'` — deploy guide exists with substantial content
- If deployed: `bash scripts/smoke-test.sh https://$DOMAIN` — all routes return 200/302/401 as expected

## Inputs

- `prisma/schema.prisma` — PostgreSQL schema (from T01)
- `src/lib/prisma.ts` — PrismaPg adapter (from T01)
- `next.config.ts` — standalone output config (from T01)
- `deploy.sh` — deploy script (from T02)
- `scripts/setup-vps.sh` — VPS provisioning script (from T02)
- `ecosystem.config.cjs` — PM2 config (from T02)
- `.env.production` — production env template (from T01)

## Expected Output

- `scripts/smoke-test.sh` — post-deploy health check script
- `DEPLOY.md` — complete deployment guide
- R010 requirement — updated validation status
- `.next/standalone/` — verified production build
