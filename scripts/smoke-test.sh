#!/usr/bin/env bash
# smoke-test.sh — Post-deploy health check for Bead Designer
#
# Usage:
#   bash scripts/smoke-test.sh [BASE_URL]
#   BASE_URL=https://example.com bash scripts/smoke-test.sh
#
# Checks all public routes (expect 200), admin auth guards (expect 302/401),
# and prints a pass/fail summary.

set -euo pipefail

BASE_URL="${1:-${BASE_URL:-https://localhost:3000}}"

echo "=== Bead Designer Smoke Test ==="
echo "Target: $BASE_URL"
echo ""

PASS=0
FAIL=0
TOTAL=0

check() {
  local label="$1"
  local url="$2"
  local expected_code="$3"

  TOTAL=$((TOTAL + 1))

  local status
  status=$(curl -sk -o /dev/null -w "%{http_code}" -L --max-time 10 "$url" 2>/dev/null) || true

  if [[ "$status" == "$expected_code" ]]; then
    echo "  ✅ $label → $status (expected $expected_code)"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $label → $status (expected $expected_code)"
    FAIL=$((FAIL + 1))
  fi
}

echo "--- Public pages (expect 200) ---"
check "Main page"         "$BASE_URL/"              "200"
check "Editor page"       "$BASE_URL/editor"        "200"
check "Design page"       "$BASE_URL/design/test"    "200"

echo ""
echo "--- Public API routes (expect 200) ---"
check "Templates list"    "$BASE_URL/api/templates"        "200"
check "Template by code"  "$BASE_URL/api/templates/test"   "200"

echo ""
echo "--- Admin auth guards ---"
check "Admin dashboard"   "$BASE_URL/admin"                 "302"
check "Admin login page"  "$BASE_URL/admin/login"           "200"
check "Admin API (401)"   "$BASE_URL/api/admin/templates"   "401"

echo ""
echo "--- Admin pages (expect 200 or redirect) ---"
check "Admin templates"   "$BASE_URL/admin/templates"       "302"
check "Admin orders"      "$BASE_URL/admin/orders"          "302"
check "Admin beads"       "$BASE_URL/admin/beads"           "302"

echo ""
echo "============================="
echo "Results: $PASS/$TOTAL passed, $FAIL failed"
echo "============================="

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
