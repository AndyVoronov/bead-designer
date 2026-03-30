#!/usr/bin/env bash
# deploy.sh — Build locally and deploy to VPS
#
# Required env vars:
#   DEPLOY_HOST   — VPS IP address or hostname
#   DOMAIN        — Domain name for Nginx SSL
#
# Optional env vars (shown with defaults):
#   DEPLOY_USER   — SSH user           (default: root)
#   DEPLOY_PATH   — App path on VPS    (default: /opt/bead-designer)
#
# Usage:
#   DEPLOY_HOST=1.2.3.4 DOMAIN=example.com bash deploy.sh

set -euo pipefail

# --- Configuration ---
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/bead-designer}"

if [[ -z "${DEPLOY_HOST:-}" ]]; then
  echo "ERROR: DEPLOY_HOST is not set. Usage: DEPLOY_HOST=1.2.3.4 DOMAIN=example.com bash deploy.sh" >&2
  exit 1
fi

if [[ -z "${DOMAIN:-}" ]]; then
  echo "ERROR: DOMAIN is not set. Usage: DEPLOY_HOST=1.2.3.4 DOMAIN=example.com bash deploy.sh" >&2
  exit 1
fi

REMOTE="$DEPLOY_USER@$DEPLOY_HOST"

echo "=== Bead Designer Deploy ==="
echo "Host:  $REMOTE"
echo "Path:  $DEPLOY_PATH"
echo "Domain: $DOMAIN"
echo ""

# --- Step 1: Build locally ---
echo "[1/8] Building Next.js standalone..."
npm run build

# --- Step 2: Ensure remote directory exists ---
echo "[2/8] Ensuring remote directory exists..."
ssh "$REMOTE" "mkdir -p $DEPLOY_PATH/.next/static $DEPLOY_PATH/public $DEPLOY_PATH/prisma"

# --- Step 3: Sync standalone output ---
echo "[3/8] Syncing standalone build..."
rsync -avz --delete ".next/standalone/" "$REMOTE:$DEPLOY_PATH/"

# --- Step 4: Sync static assets ---
echo "[4/8] Syncing static assets..."
rsync -avz ".next/static/" "$REMOTE:$DEPLOY_PATH/.next/static/"

# --- Step 5: Sync public files ---
echo "[5/8] Syncing public files..."
rsync -avz "public/" "$REMOTE:$DEPLOY_PATH/public/"

# --- Step 6: Sync Prisma schema ---
echo "[6/8] Syncing Prisma schema..."
rsync -avz "prisma/" "$REMOTE:$DEPLOY_PATH/prisma/"

# --- Step 7: Sync config and env ---
echo "[7/8] Syncing PM2 config and environment..."
rsync -avz "ecosystem.config.cjs" "$REMOTE:$DEPLOY_PATH/"
if [[ -f ".env.production" ]]; then
  rsync -avz ".env.production" "$REMOTE:$DEPLOY_PATH/.env"
else
  echo "WARNING: .env.production not found — skipping. The VPS .env will be unchanged." >&2
fi

# --- Step 8: Remote setup (Nginx + DB + PM2) ---
echo "[8/8] Running remote setup..."
ssh "$REMOTE" bash -s <<REMOTE_SCRIPT
set -euo pipefail

APP_PATH="$DEPLOY_PATH"
DOMAIN="$DOMAIN"

cd "\$APP_PATH"

# --- Install npm dependencies for standalone ---
echo "  → Installing production dependencies..."
npm install --omit=dev

# --- Push Prisma schema and seed ---
echo "  → Applying database schema..."
npx prisma db push
echo "  → Seeding database..."
npx prisma db seed

# --- Configure Nginx ---
echo "  → Configuring Nginx..."
sed -e "s|_DOMAIN_|\$DOMAIN|g" \
    -e "s|_APP_PATH_|\$APP_PATH|g" \
    "nginx.conf" > "/etc/nginx/sites-available/bead-designer"

ln -sf /etc/nginx/sites-available/bead-designer /etc/nginx/sites-enabled/bead-designer

nginx -t && systemctl reload nginx
echo "  → Nginx reloaded."

# --- Start/restart PM2 process ---
echo "  → Restarting PM2 process..."
npx pm2 restart ecosystem.config.cjs || npx pm2 start ecosystem.config.cjs
npx pm2 save

echo "  → Remote setup complete."
REMOTE_SCRIPT

echo ""
echo "=== Deploy complete ==="
echo "  https://$DOMAIN"
echo "  pm2 status (on VPS: ssh $REMOTE pm2 status)"
