#!/usr/bin/env bash
# setup-vps.sh — First-time VPS provisioning
#
# Run this ONCE on a fresh Ubuntu/Debian VPS to install all dependencies.
#
# Required env vars:
#   DB_PASSWORD   — PostgreSQL user password
#
# Optional env vars (shown with defaults):
#   DOMAIN        — Domain name for SSL cert   (default: unset, skip certbot)
#   APP_USER      — System/database user       (default: beaduser)
#   DB_NAME       — Database name              (default: beaddesigner)
#   DB_USER       — Database user              (default: beaduser)
#
# Usage (run on the VPS directly):
#   DB_PASSWORD=mys3cret bash setup-vps.sh
#   DB_PASSWORD=mys3cret DOMAIN=example.com bash setup-vps.sh

set -euo pipefail

# --- Configuration ---
APP_USER="${APP_USER:-beaduser}"
DB_NAME="${DB_NAME:-beaddesigner}"
DB_USER="${DB_USER:-beaduser}"

if [[ -z "${DB_PASSWORD:-}" ]]; then
  echo "ERROR: DB_PASSWORD is not set. Usage: DB_PASSWORD=mys3cret bash setup-vps.sh" >&2
  exit 1
fi

echo "=== Bead Designer — VPS Setup ==="
echo "App user:   $APP_USER"
echo "Database:   $DB_NAME (user: $DB_USER)"
echo "Domain:     ${DOMAIN:-<not set, SSL will be skipped>}"
echo ""

# --- Step 1: Update system ---
echo "[1/8] Updating system packages..."
apt update && apt upgrade -y

# --- Step 2: Install base packages ---
echo "[2/8] Installing base packages (curl, git, build-essential, nginx, certbot)..."
apt install -y curl git build-essential nginx certbot python3-certbot-nginx

# --- Step 3: Install Node.js 20.x ---
echo "[3/8] Installing Node.js 20.x..."
if command -v node &>/dev/null && node --version | grep -q "v20"; then
  echo "  → Node.js 20.x already installed: $(node --version)"
else
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
  echo "  → Installed: $(node --version)"
fi

# --- Step 4: Install PM2 globally ---
echo "[4/8] Installing PM2..."
npm install -g pm2
echo "  → PM2 $(pm2 --version) installed."

# --- Step 5: Install PostgreSQL ---
echo "[5/8] Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl enable --now postgresql
echo "  → PostgreSQL installed and started."

# --- Step 6: Create database and user ---
echo "[6/8] Creating database '$DB_NAME' and user '$DB_USER'..."
sudo -u postgres psql --command="SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q "1" && \
  echo "  → User '$DB_USER' already exists." || \
  sudo -u postgres createuser -P "$DB_USER" <<<"$DB_PASSWORD"$'\n'"$DB_PASSWORD"
sudo -u postgres psql --command="SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q "1" && \
  echo "  → Database '$DB_NAME' already exists." || \
  sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
echo "  → Database ready."

# --- Step 7: Enable and start services ---
echo "[7/8] Enabling services..."
systemctl enable --now nginx
systemctl enable --now postgresql
echo "  → Nginx and PostgreSQL enabled."

# --- Step 8: Create app directory + optional SSL ---
echo "[8/8] Creating app directory..."
mkdir -p /opt/bead-designer
chown "$APP_USER:$APP_USER" /opt/bead-designer 2>/dev/null || true
echo "  → /opt/bead-designer created."

if [[ -n "${DOMAIN:-}" ]]; then
  echo "  → Requesting SSL certificate for $DOMAIN..."
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" || \
    echo "  → WARNING: SSL cert request failed (domain may not point here yet). Run certbot manually later."
else
  echo "  → DOMAIN not set — skipping SSL certificate. Run 'certbot --nginx -d <domain>' manually later."
fi

# --- Configure PM2 startup ---
echo "Configuring PM2 startup..."
pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" 2>/dev/null || \
  pm2 startup systemd 2>/dev/null || \
  echo "  → PM2 startup configured (run 'pm2 save' after first deploy)."

echo ""
echo "=== VPS Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. On your LOCAL machine, set env vars and run deploy.sh:"
echo "     DEPLOY_HOST=<VPS_IP> DOMAIN=${DOMAIN:-<your-domain>} bash deploy.sh"
echo ""
echo "  2. Or set DOMAIN now and re-run this script to get SSL:"
echo "     DB_PASSWORD=$DB_PASSWORD DOMAIN=example.com bash setup-vps.sh"
