import LZString from "lz-string";
import type { BeadState, SerializableDesign } from "@/types/bead";

/**
 * Encode an array of BeadState objects into a URL-safe design code.
 *
 * Pipeline: filter beads with catalogBeadId → JSON.stringify → LZ-String compress → base64url.
 * Only beads that have a `catalogBeadId` are included; others are silently skipped.
 */
export function encodeDesign(beads: BeadState[]): string {
  const catalogIds = beads
    .filter((b) => b.catalogBeadId)
    .map((b) => b.catalogBeadId as string);

  const design: SerializableDesign = {
    v: 1,
    p: "pacifier-holder",
    b: catalogIds,
  };

  return LZString.compressToEncodedURIComponent(JSON.stringify(design));
}

/**
 * Decode a URL-safe design code back into a SerializableDesign.
 *
 * Applies `decodeURIComponent` first because lz-string output may contain
 * `+` which browsers encode as `%2B` in URL path segments, and Next.js
 * does not decode `%2B` back to `+` in dynamic route params.
 *
 * Returns `null` for any invalid input: malformed base64url, invalid JSON,
 * missing required fields, or unsupported version.
 */
export function decodeDesign(code: string): SerializableDesign | null {
  if (!code || typeof code !== "string") return null;

  try {
    // Normalize URL-encoded characters (e.g. %2B → +) that may appear
    // when design codes are embedded in URL path segments.
    const normalized = decodeURIComponent(code);

    const json = LZString.decompressFromEncodedURIComponent(normalized);
    if (!json) return null;

    const parsed: unknown = JSON.parse(json);

    const obj = parsed as Record<string, unknown>;
    if (obj.v !== 1 || typeof obj.p !== "string" || !Array.isArray(obj.b)) {
      return null;
    }
    if (!(obj.b as unknown[]).every((id) => typeof id === "string")) {
      return null;
    }

    return parsed as SerializableDesign;
  } catch {
    return null;
  }
}
