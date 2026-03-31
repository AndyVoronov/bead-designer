# Bead Designer — Deployment Guide

## Prerequisites

- **VPS** with SSH access (Ubuntu 20.04+ or Debian 11+)
- **Domain** pointing to VPS IP address (A record)
- **Local machine** with Node.js 20+, npm, rsync, ssh

## First-Time VPS Setup

Run the provisioning script on the VPS or from your local machine with SSH:

```bash
# Option A: Run directly on the VPS
ssh root@<VPS_IP>
DB_PASSWORD=<your_secure_password> bash setup-vps.sh

# Option B: Run from local (copies script to VPS)
scp scripts/setup-vps.sh root@<VPS_IP>:/tmp/
ssh root@<VPS_IP> "DB_PASSWORD=<your_secure_password> bash /tmp/setup-vps.sh"
```

This installs:
- Node.js 20.x (via NodeSource)
- PostgreSQL 16 (creates `beaduser` / `beaddesigner` database)
- Nginx (reverse proxy)
- Certbot (Let's Encrypt SSL)
- PM2 (process manager)

The script is idempotent — re-running it skips already-completed steps.

## Environment Variables

Create `.env.production` in the project root:

| Variable        | Description                    | Example                                      |
|-----------------|--------------------------------|----------------------------------------------|
| `DATABASE_URL`  | PostgreSQL connection string   | `postgresql://beaduser:PASS@localhost:5432/beaddesigner` |
| `ADMIN_PASSWORD`| Admin panel password           | `your_secure_password`                        |
| `NODE_ENV`      | Node environment               | `production`                                  |

**Important:** `.env.production` is excluded from git via `.gitignore`. Never commit secrets.

## Deploy

```bash
DEPLOY_HOST=<VPS_IP> \
DOMAIN=<your-domain.com> \
bash deploy.sh
```

Optional variables:

| Variable      | Default            | Description          |
|---------------|--------------------|----------------------|
| `DEPLOY_USER` | `root`             | SSH username         |
| `DEPLOY_PATH` | `/opt/bead-designer` | App path on VPS   |

The deploy script:
1. Builds Next.js standalone locally (`npm run build`)
2. Syncs standalone output, static assets, and public files via rsync
3. Syncs Prisma schema, PM2 config, and `.env.production`
4. Runs `prisma db push` and `prisma db seed` on VPS
5. Configures Nginx and reloads
6. Starts/restarts the PM2 process

## Post-Deploy Verification

Run the smoke test:

```bash
bash scripts/smoke-test.sh https://<your-domain.com>
```

Expected: all routes pass (200 for public pages, 302 for admin auth guards, 401 for admin API).

You can also verify manually:
- `curl -I https://<domain>` — HTTP 200
- `curl https://<domain>/api/templates` — JSON response
- `curl -I https://<domain>/admin` — 302 redirect to `/admin/login`

## Maintenance

### Logs
```bash
# PM2 application logs
ssh root@<VPS_IP> "pm2 logs bead-designer"

# Nginx access/error logs
ssh root@<VPS_IP> "tail -f /var/log/nginx/access.log"
ssh root@<VPS_IP> "tail -f /var/log/nginx/error.log"
```

### Restart
```bash
ssh root@<VPS_IP> "cd /opt/bead-designer && npx pm2 restart bead-designer"
```

### Update Nginx config
```bash
# After editing nginx.conf locally:
DEPLOY_HOST=<VPS_IP> DOMAIN=<domain> bash deploy.sh
```

### Database migrations
```bash
ssh root@<VPS_IP> "cd /opt/bead-designer && npx prisma db push"
```

## Troubleshooting

### Database connection errors
```
PrismaClientInitializationError: Can't reach database server
```
- Check PostgreSQL is running: `systemctl status postgresql`
- Verify `DATABASE_URL` in `.env.production` on VPS
- Test connection: `psql -U beaduser -d beaddesigner -h localhost`

### Port 3000 in use
```bash
# Check what's using port 3000
ssh root@<VPS_IP> "lsof -i :3000"

# Restart PM2 to clear stale processes
ssh root@<VPS_IP> "npx pm2 stop bead-designer && npx pm2 start ecosystem.config.cjs"
```

### 502 Bad Gateway
- Next.js is not running: `ssh root@<VPS_IP> "pm2 status bead-designer"`
- Check PM2 error logs: `ssh root@<VPS_IP> "cat ~/.pm2/logs/bead-designer-error.log"`
- Restart: `ssh root@<VPS_IP> "npx pm2 restart bead-designer"`

### SSL certificate issues
```bash
# Check cert expiry
ssh root@<VPS_IP> "certbot certificates"

# Force renewal
ssh root@<VPS_IP> "certbot renew --force-renewal && systemctl reload nginx"
```

### Build fails locally
```bash
# Clear Next.js cache and rebuild
rm -rf .next
npm run build
```

## Architecture Overview

```
Internet → Nginx (443/SSL) → Next.js (PM2, port 3000) → PostgreSQL (5432)
```

- **Nginx**: SSL termination, gzip, static asset caching, reverse proxy
- **PM2**: Process management, auto-restart on crash, log rotation
- **Next.js**: Standalone output, server.js entry point
- **PostgreSQL**: Persistent data store (templates, orders, beads)
