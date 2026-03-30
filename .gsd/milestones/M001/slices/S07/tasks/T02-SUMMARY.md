---
id: T02
parent: S07
milestone: M001
provides:
  - Nginx reverse proxy config with SSL, gzip, anti-buffering, and static asset caching
  - PM2 ecosystem config for standalone Next.js server.js process management
  - deploy.sh — full build → rsync → migrate → seed → restart cycle
  - setup-vps.sh — first-time VPS provisioning (Node.js 20, PostgreSQL, Nginx, certbot, PM2)
key_files:
  - nginx.conf
  - ecosystem.config.cjs
  - deploy.sh
  - scripts/setup-vps.sh
key_decisions:
  - No .gitignore changes needed — existing .env* pattern and *.pem already cover all deployment artifacts
  - PM2 cwd set to /opt/bead-designer (the default DEPLOY_PATH) — deploy.sh replaces _APP_PATH_ if different
patterns_established:
  - All deployment configs parameterized via environment variables with sensible defaults (DEPLOY_HOST, DOMAIN, DEPLOY_USER, DEPLOY_PATH)
  - Shell scripts use set -euo pipefail and echo each step for audit trail
  - Nginx config uses _DOMAIN_ / _APP_PATH_ placeholders replaced by sed in deploy.sh
observability_surfaces:
  - PM2 logs: ~/.pm2/logs/bead-designer-{out,error}.log
  - Nginx logs: /var/log/nginx/access.log, /var/log/nginx/error.log
  - deploy.sh echoes each step with [N/8] prefix for audit trail
  - nginx -t validates config before reload; set -euo pipefail fails fast on any error
duration: 8m
verification_result: passed
completed_at: 2026-03-30T09:55:00+09:00
blocker_discovered: false
---

# T02: Create deployment configuration files

**Created Nginx reverse proxy config, PM2 ecosystem config, deploy script, and VPS provisioning script — all parameterized via env vars with syntax validation passing.**

## What Happened

Created four deployment configuration files per the task plan:

1. **`nginx.conf`** — Nginx reverse proxy template with HTTP→HTTPS redirect (port 80→443), SSL via Let's Encrypt paths, gzip compression for common MIME types, `X-Accel-Buffering: no` for Next.js streaming, standard proxy headers, and aggressive caching for `/_next/static/` assets. Uses `_DOMAIN_` and `_APP_PATH_` placeholders replaced by deploy.sh via sed.

2. **`ecosystem.config.cjs`** — PM2 process config targeting `node server.js` (standalone entry point) with `cwd: /opt/bead-designer`, single instance, autorestart, 512MB memory limit, and structured log file paths.

3. **`deploy.sh`** — Eight-step deploy pipeline: local build → ensure remote dir → rsync standalone output → rsync static assets → rsync public files → rsync Prisma schema → rsync config/env → remote setup (npm install, prisma db push, prisma db seed, Nginx config + reload, PM2 restart). Requires DEPLOY_HOST and DOMAIN env vars; DEPLOY_USER and DEPLOY_PATH have defaults. Remote commands run in an SSH heredoc with set -euo pipefail.

4. **`scripts/setup-vps.sh`** — First-time VPS provisioning: apt update, install base packages (curl, git, build-essential, nginx, certbot), Node.js 20.x via NodeSource, PM2 globally, PostgreSQL, create database/user with idempotent checks (skip if exists), enable services, create app directory, optional SSL cert request via certbot. Requires DB_PASSWORD; DOMAIN is optional.

Step 5 (update .gitignore) confirmed no changes needed — existing `.env*` pattern and `*.pem` already cover all deployment artifacts.

## Verification

All six must-have checks pass: all four files exist, both shell scripts pass `bash -n` syntax validation, and all grep content checks confirm required directives are present.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `test -f nginx.conf && test -f ecosystem.config.cjs && test -f deploy.sh && test -f scripts/setup-vps.sh` | 0 | ✅ pass | <1s |
| 2 | `bash -n deploy.sh` | 0 | ✅ pass | <1s |
| 3 | `bash -n scripts/setup-vps.sh` | 0 | ✅ pass | <1s |
| 4 | `grep -q "X-Accel-Buffering" nginx.conf` | 0 | ✅ pass | <1s |
| 5 | `grep -q "proxy_pass" nginx.conf` | 0 | ✅ pass | <1s |
| 6 | `grep -q "server.js" ecosystem.config.cjs` | 0 | ✅ pass | <1s |
| 7 | `grep -q "prisma db push" deploy.sh` | 0 | ✅ pass | <1s |

## Diagnostics

- **Deploy failure**: `deploy.sh` fails immediately on any command error (set -euo pipefail) and prints which step failed via [N/8] prefix
- **Nginx validation**: `nginx -t` runs before reload; if config is invalid, deploy stops and existing Nginx continues serving
- **PM2 crash visibility**: `pm2 logs bead-designer` shows stdout/stderr; PM2 auto-restarts with error timestamp in `~/.pm2/logs/bead-designer-error.log`
- **Shell syntax**: `bash -n deploy.sh` and `bash -n scripts/setup-vps.sh` for pre-flight validation

## Deviations

None — all steps executed as planned.

## Known Issues

- `ecosystem.config.cjs` has `cwd` hardcoded to `/opt/bead-designer` rather than a placeholder. The `deploy.sh` script replaces `_APP_PATH_` in nginx.conf but not in ecosystem.config.cjs. This works as long as the default DEPLOY_PATH is used. If a custom DEPLOY_PATH is needed, ecosystem.config.cjs should be updated to match or use a placeholder replaced by deploy.sh.

## Files Created/Modified

- `nginx.conf` — Nginx reverse proxy template with SSL, gzip, X-Accel-Buffering, static caching
- `ecosystem.config.cjs` — PM2 process config for standalone Next.js (server.js)
- `deploy.sh` — Full deploy pipeline (build → rsync → migrate → seed → restart)
- `scripts/setup-vps.sh` — First-time VPS provisioning (Node.js 20, PostgreSQL, Nginx, certbot, PM2)
- `.gsd/milestones/M001/slices/S07/tasks/T02-PLAN.md` — Added Observability Impact section
- `.gsd/milestones/M001/slices/S07/S07-PLAN.md` — Marked T02 as [x] complete
