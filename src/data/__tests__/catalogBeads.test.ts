import { describe, it, expect } from "vitest";
import { CATALOG_BEADS, getCatalogBead } from "@/data/catalogBeads";
import { catalogBeadToBeadState } from "@/lib/catalogUtils";
import type { BeadShape } from "@/types/bead";

describe("CATALOG_BEADS", () => {
  it("contains at least 100 entries", () => {
    expect(CATALOG_BEADS.length).toBeGreaterThanOrEqual(100);
  });

  it("each entry has all required fields", () => {
    const validShapes: BeadShape[] = ["sphere", "disc", "star", "heart", "cylinder", "oblate", "buckyball"];
    const validMaterials = ["wood", "silicone", "knit", "plastic"];

    for (const bead of CATALOG_BEADS) {
      expect(bead.id).toBeTruthy();
      expect(bead.name).toBeTruthy();
      expect(bead.nameRu).toBeTruthy();
      expect(validShapes).toContain(bead.shape);
      expect(bead.size).toBeGreaterThanOrEqual(0.15);
      expect(bead.size).toBeLessThanOrEqual(0.28);
      expect(validMaterials).toContain(bead.material);
      expect(bead.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("has ~25 beads per material", () => {
    const counts = { wood: 0, silicone: 0, knit: 0, plastic: 0 };
    for (const bead of CATALOG_BEADS) {
      counts[bead.material]++;
    }
    for (const [mat, count] of Object.entries(counts)) {
      expect(count).toBeGreaterThanOrEqual(20);
      expect(count).toBeLessThanOrEqual(30);
    }
  });

  it("all ids are unique", () => {
    const ids = new Set(CATALOG_BEADS.map((b) => b.id));
    expect(ids.size).toBe(CATALOG_BEADS.length);
  });

  it("includes a mix of shapes (not all spheres)", () => {
    const shapes = new Set(CATALOG_BEADS.map((b) => b.shape));
    expect(shapes.size).toBeGreaterThanOrEqual(3);
    expect(shapes.has("sphere")).toBe(true);
  });

  it("ids follow cb-NNN pattern", () => {
    for (const bead of CATALOG_BEADS) {
      expect(bead.id).toMatch(/^cb-\d{3}$/);
    }
  });
});

describe("getCatalogBead", () => {
  it("returns a bead for a valid id", () => {
    const bead = getCatalogBead("cb-001");
    expect(bead).toBeDefined();
    expect(bead!.nameRu).toBe("Берёза");
  });

  it("returns undefined for an unknown id", () => {
    const bead = getCatalogBead("cb-999");
    expect(bead).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    const bead = getCatalogBead("");
    expect(bead).toBeUndefined();
  });
});

describe("catalogBeadToBeadState", () => {
  it("maps all required fields correctly", () => {
    const catalogBead = CATALOG_BEADS[0];
    const state = catalogBeadToBeadState(catalogBead);

    expect(state.catalogBeadId).toBe(catalogBead.id);
    expect(state.type).toBe(catalogBead.material);
    expect(state.radius).toBeCloseTo(catalogBead.size * 0.8, 5);
    expect(state.color).toBe(catalogBead.color);
    expect(typeof state.id).toBe("string");
    expect(state.id).toBeTruthy();
  });

  it("generates unique ids for consecutive calls", () => {
    const catalogBead = CATALOG_BEADS[0];
    const ids = new Set(Array.from({ length: 50 }, () => catalogBeadToBeadState(catalogBead).id));
    expect(ids.size).toBe(50);
  });

  it("id starts with 'bead-'", () => {
    const state = catalogBeadToBeadState(CATALOG_BEADS[0]);
    expect(state.id).toMatch(/^bead-/);
  });
});
