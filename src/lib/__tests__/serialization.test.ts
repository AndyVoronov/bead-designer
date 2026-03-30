import { describe, it, expect } from "vitest";
import { encodeDesign, decodeDesign } from "../serialization";
import type { BeadState } from "@/types/bead";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeBead(catalogBeadId: string, overrides?: Partial<BeadState>): BeadState {
  return {
    id: `test-${Math.random().toString(36).slice(2, 8)}`,
    type: "wood",
    radius: 0.2,
    color: "#D4A574",
    catalogBeadId,
    ...overrides,
  };
}

// ── Round-trip tests ────────────────────────────────────────────────────────

describe("encodeDesign / decodeDesign — round-trip", () => {
  it("round-trips 1 bead", () => {
    const beads = [makeBead("cb-001")];
    const code = encodeDesign(beads);
    const decoded = decodeDesign(code);

    expect(decoded).not.toBeNull();
    expect(decoded!.b).toEqual(["cb-001"]);
  });

  it("round-trips 7 beads preserving order", () => {
    const ids = ["cb-001", "cb-026", "cb-051", "cb-076", "cb-010", "cb-050", "cb-100"];
    const beads = ids.map((id) => makeBead(id));
    const code = encodeDesign(beads);
    const decoded = decodeDesign(code);

    expect(decoded).not.toBeNull();
    expect(decoded!.b).toEqual(ids);
  });

  it("round-trips 40 beads", () => {
    const ids = Array.from({ length: 40 }, (_, i) => `cb-${String(i + 1).padStart(3, "0")}`);
    const beads = ids.map((id) => makeBead(id));
    const code = encodeDesign(beads);
    const decoded = decodeDesign(code);

    expect(decoded).not.toBeNull();
    expect(decoded!.b).toEqual(ids);
  });
});

// ── Error handling ──────────────────────────────────────────────────────────

describe("decodeDesign — invalid input returns null", () => {
  it("returns null for a random string", () => {
    expect(decodeDesign("this-is-not-a-valid-design-code")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(decodeDesign("")).toBeNull();
  });

  it("returns null for truncated base64url", () => {
    const code = encodeDesign([makeBead("cb-001")]);
    // Truncate to half
    expect(decodeDesign(code.slice(0, Math.floor(code.length / 2)))).toBeNull();
  });

  it("returns null for null/undefined-like input", () => {
    // TypeScript wouldn't allow this but test the runtime guard
    expect(decodeDesign(null as unknown as string)).toBeNull();
    expect(decodeDesign(undefined as unknown as string)).toBeNull();
  });
});

// ── Encoding edge cases ─────────────────────────────────────────────────────

describe("encodeDesign — filtering", () => {
  it("skips beads without catalogBeadId", () => {
    const beads: BeadState[] = [
      makeBead("cb-001"),
      { id: "manual-1", type: "wood", radius: 0.2, color: "#FF0000" }, // no catalogBeadId
      makeBead("cb-026"),
    ];
    const code = encodeDesign(beads);
    const decoded = decodeDesign(code);

    expect(decoded).not.toBeNull();
    expect(decoded!.b).toEqual(["cb-001", "cb-026"]);
  });

  it("returns valid code for empty bead array", () => {
    const code = encodeDesign([]);
    const decoded = decodeDesign(code);

    expect(decoded).not.toBeNull();
    expect(decoded!.b).toEqual([]);
  });
});

// ── Structure validation ────────────────────────────────────────────────────

describe("SerializableDesign structure", () => {
  it("version field is 1", () => {
    const code = encodeDesign([makeBead("cb-001")]);
    const decoded = decodeDesign(code);

    expect(decoded!.v).toBe(1);
  });

  it("productType is pacifier-holder", () => {
    const code = encodeDesign([makeBead("cb-001")]);
    const decoded = decodeDesign(code);

    expect(decoded!.p).toBe("pacifier-holder");
  });

  it("encoded code is URL-safe (no +, /, = characters)", () => {
    const code = encodeDesign([makeBead("cb-001")]);
    expect(code).not.toMatch(/[+/=]/);
  });

  it("encoded code is non-empty", () => {
    const code = encodeDesign([makeBead("cb-001")]);
    expect(code.length).toBeGreaterThan(0);
  });
});
