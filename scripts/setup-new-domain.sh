#!/usr/bin/env bash
# setup-new-domain.sh — Configure 5minutesofsilence.ru on VPS
# Run after DNS propagation is confirmed
#
# Usage:
#   bash setup-new-domain.sh

set -euo pipefail

DOMAIN="5minutesofsilence.ru"
LEGACY="thekidsdream.ru"
VPS_IP="82.38.60.189"

echo "=== Domain Setup: $DOMAIN ==="

# --- 1. Verify DNS resolves ---
echo "[1/5] Checking DNS..."
if ! nslookup "$DOMAIN" 8.8.8.8 > /dev/null 2>&1; then
    echo "  ⚠ DNS not yet propagated for $DOMAIN on Google DNS"
    echo "  Trying direct Reg.ru NS..."
    if ! nslookup "$DOMAIN" ns1.hosting.reg.ru > /dev/null 2>&1; then
        echo "  ✗ DNS not resolving at all. Aborting."
        exit 1
    fi
    echo "  ✓ DNS resolves on Reg.ru NS (Google DNS will follow)"
    echo "  Note: SSL cert may fail — retry after full propagation"
fi
echo "  ✓ DNS OK"

# --- 2. Get SSL certificate ---
echo "[2/5] Getting SSL certificate for $DOMAIN..."
if certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
    echo "  ✓ SSL cert already exists"
else
    certbot --nginx \
        -d "$DOMAIN" -d "www.$DOMAIN" \
        --non-interactive --agree-tos \
        --email "admin@$DOMAIN" \
        --redirect 2>&1
    echo "  ✓ SSL cert obtained"
fi

# --- 3. Deploy nginx config ---
echo "[3/5] Deploying Nginx config..."
# The nginx.conf in /opt/bead-designer already has both domains configured
# Just copy and reload
if [ -f /opt/bead-designer/nginx.conf ]; then
    cp /opt/bead-designer/nginx.conf /etc/nginx/sites-available/bead-designer
    ln -sf /etc/nginx/sites-available/bead-designer /etc/nginx/sites-enabled/bead-designer
    nginx -t && systemctl reload nginx
    echo "  ✓ Nginx reloaded"
else
    echo "  ✗ nginx.conf not found in /opt/bead-designer/"
    exit 1
fi

# --- 4. Update .env on VPS ---
echo "[4/5] Updating .env..."
cd /opt/bead-designer

# Update NEXTAUTH_URL to new primary domain
if grep -q "NEXTAUTH_URL" .env; then
    sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=https://$DOMAIN|" .env
else
    echo "NEXTAUTH_URL=https://$DOMAIN" >> .env
fi

# Ensure AUTH_TRUST_HOST is set
if ! grep -q "AUTH_TRUST_HOST" .env; then
    echo "AUTH_TRUST_HOST=true" >> .env
fi

echo "  ✓ .env updated"

# --- 5. Restart PM2 ---
echo "[5/5] Restarting PM2..."
pm2 restart bead-designer --update-env
sleep 4

# --- Verify ---
echo ""
echo "=== Verification ==="

# Check HTTP status
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: $DOMAIN" http://localhost:3000/)
echo "  Next.js status: $STATUS (expected 200)"

# Check legacy redirect
LEGACY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: $LEGACY" http://localhost:3000/)
echo "  Legacy domain: $LEGACY_STATUS (expected 200, nginx will 301 to $DOMAIN)"

# Check auth
CSRF=$(curl -s -H "Host: $DOMAIN" http://localhost:3000/api/auth/csrf 2>/dev/null)
if echo "$CSRF" | grep -q "csrfToken"; then
    echo "  Auth CSRF: ✓ OK"
else
    echo "  Auth CSRF: ✗ FAILED — $CSRF"
fi

echo ""
echo "=== Done ==="
echo "  https://$DOMAIN"
echo "  https://$LEGACY → redirects to $DOMAIN"
echo ""
echo "⚠ Don't forget to update OAuth callback URLs:"
echo "  Yandex: https://oauth.yandex.ru → Callback URL → https://$DOMAIN/api/auth/callback/yandex"
