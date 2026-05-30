import { NextRequest } from "next/server";
import crypto from "crypto";

const ADMIN_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check admin_token cookie (set by /api/admin/auth login).
 * Returns true if the request is authenticated as admin.
 *
 * Token is HMAC-signed: cookie value = "signed-<hex-sig>.<timestamp>.<payload>"
 * - HMAC signature verified via timingSafeEqual
 * - Timestamp must be within 24 hours
 * - ADMIN_COOKIE_SECRET must be set (no legacy fallback)
 */
export function isAdmin(request: NextRequest): boolean {
  const token = request.cookies.get("admin_token")?.value;
  if (!token) return false;

  const secret = process.env.ADMIN_COOKIE_SECRET;
  if (!secret) return false; // No secret configured = deny all

  // Expected format: "signed-<hex-signature>.<timestamp>.<payload>"
  const parts = token.split(".");
  if (parts.length < 2) return false;

  const signature = parts[0].replace(/^signed-/, "");
  const payload = parts.slice(1).join(".");

  // Recompute HMAC
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  // Timing-safe comparison
  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length) return false;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return false;
  } catch {
    return false;
  }

  // Check token expiry (timestamp is first part of payload)
  const timestampStr = parts[1];
  if (!timestampStr) return false;
  // Timestamp is base36-encoded milliseconds
  const timestamp = parseInt(timestampStr, 36);
  if (isNaN(timestamp) || Date.now() - timestamp > ADMIN_TOKEN_MAX_AGE_MS) return false;

  return true;
}
