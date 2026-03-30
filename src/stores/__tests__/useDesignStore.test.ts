import { describe, it, expect, beforeEach } from "vitest";
import { useDesignStore } from "../useDesignStore";
import { CATALOG_BEADS } from "@/data/catalogBeads";

describe("useDesignStore", () => {
  beforeEach(() => {
    useDesignStore.getState().resetDesign();
  });

  it("initializes with 7 beads, selectedBeadId null, productType pacifier-holder", () => {
    const state = useDesignStore.getState();
    expect(state.beads).toHaveLength(7);
    expect(state.selectedBeadId).toBeNull();
    expect(state.productType).toBe("pacifier-holder");
  });

  it("all default beads have required fields (id, type, radius, color)", () => {
    const { beads } = useDesignStore.getState();
    for (const bead of beads) {
      expect(bead).toHaveProperty("id");
      expect(bead).toHaveProperty("type");
      expect(bead).toHaveProperty("radius");
      expect(bead).toHaveProperty("color");
      expect(typeof bead.id).toBe("string");
      expect(bead.id).toBeTruthy();
      expect(["wood", "silicone", "knit", "plastic"]).toContain(bead.type);
      expect(typeof bead.radius).toBe("number");
      expect(bead.radius).toBeGreaterThan(0);
      expect(typeof bead.color).toBe("string");
      expect(bead.color).toBeTruthy();
    }
  });

  it("addBead(catalogBeadId) increases bead count by 1", () => {
    // Use a real catalog bead id
    const catalogId = CATALOG_BEADS[0].id;
    const before = useDesignStore.getState().beads.length;

    useDesignStore.getState().addBead(catalogId);

    expect(useDesignStore.getState().beads).toHaveLength(before + 1);
  });

  it("addBead(catalogBeadId) correctly converts CatalogBead → BeadState", () => {
    const catalogBead = CATALOG_BEADS[0];
    useDesignStore.getState().addBead(catalogBead.id);

    const lastBead = useDesignStore.getState().beads.at(-1)!;
    expect(lastBead.catalogBeadId).toBe(catalogBead.id);
    expect(lastBead.type).toBe(catalogBead.material);
    expect(lastBead.color).toBe(catalogBead.color);
    // radius = catalog size * 0.8 (from catalogBeadToBeadState)
    expect(lastBead.radius).toBeCloseTo(catalogBead.size * 0.8, 5);
    expect(typeof lastBead.id).toBe("string");
    expect(lastBead.id).toBeTruthy();
  });

  it("addBead('nonexistent') is a no-op", () => {
    const before = useDesignStore.getState().beads.length;
    useDesignStore.getState().addBead("nonexistent");
    expect(useDesignStore.getState().beads).toHaveLength(before);
  });

  it("addBead beyond max (40) is a no-op", () => {
    // Reset to 7 default, add beads until we reach 40
    useDesignStore.getState().resetDesign();
    const firstCatalogId = CATALOG_BEADS[0].id;

    // Add 33 more beads to reach exactly 40 (7 + 33 = 40)
    for (let i = 0; i < 33; i++) {
      useDesignStore.getState().addBead(firstCatalogId);
    }
    expect(useDesignStore.getState().beads).toHaveLength(40);

    // This one should be a no-op
    useDesignStore.getState().addBead(firstCatalogId);
    expect(useDesignStore.getState().beads).toHaveLength(40);
  });

  it("removeBead(id) decreases count and removes correct bead", () => {
    const targetId = useDesignStore.getState().beads[2].id;
    const before = useDesignStore.getState().beads.length;

    useDesignStore.getState().removeBead(targetId);

    const after = useDesignStore.getState();
    expect(after.beads).toHaveLength(before - 1);
    expect(after.beads.find((b) => b.id === targetId)).toBeUndefined();
  });

  it("removeBead with unknown id is a no-op", () => {
    const before = useDesignStore.getState().beads.length;
    useDesignStore.getState().removeBead("nonexistent-id");
    expect(useDesignStore.getState().beads).toHaveLength(before);
  });

  it("selectBead('id') sets selectedBeadId", () => {
    const beadId = useDesignStore.getState().beads[0].id;
    useDesignStore.getState().selectBead(beadId);
    expect(useDesignStore.getState().selectedBeadId).toBe(beadId);
  });

  it("selectBead(null) clears selection", () => {
    const beadId = useDesignStore.getState().beads[0].id;
    useDesignStore.getState().selectBead(beadId);
    expect(useDesignStore.getState().selectedBeadId).toBe(beadId);

    useDesignStore.getState().selectBead(null);
    expect(useDesignStore.getState().selectedBeadId).toBeNull();
  });

  it("removeSelected() removes the selected bead and clears selection", () => {
    const beadId = useDesignStore.getState().beads[0].id;
    useDesignStore.getState().selectBead(beadId);
    const before = useDesignStore.getState().beads.length;

    useDesignStore.getState().removeSelected();

    const after = useDesignStore.getState();
    expect(after.beads).toHaveLength(before - 1);
    expect(after.selectedBeadId).toBeNull();
    expect(after.beads.find((b) => b.id === beadId)).toBeUndefined();
  });

  it("removeSelected() with no selection is a no-op", () => {
    const before = useDesignStore.getState();
    expect(before.selectedBeadId).toBeNull();
    const count = before.beads.length;

    useDesignStore.getState().removeSelected();

    expect(useDesignStore.getState().beads).toHaveLength(count);
    expect(useDesignStore.getState().selectedBeadId).toBeNull();
  });

  it("resetDesign() returns to 7 default beads and clears selection", () => {
    // Modify the state
    useDesignStore.getState().addBead(CATALOG_BEADS[0].id);
    useDesignStore.getState().addBead(CATALOG_BEADS[1].id);
    useDesignStore.getState().selectBead(useDesignStore.getState().beads[0].id);

    expect(useDesignStore.getState().beads.length).not.toBe(7);
    expect(useDesignStore.getState().selectedBeadId).not.toBeNull();

    // Reset
    useDesignStore.getState().resetDesign();

    const after = useDesignStore.getState();
    expect(after.beads).toHaveLength(7);
    expect(after.selectedBeadId).toBeNull();
    // Verify default beads are restored
    expect(after.beads[0].id).toBe("bead-1");
    expect(after.beads[6].id).toBe("bead-7");
  });

  it("removeBead clears selection if removed bead was selected", () => {
    const beadId = useDesignStore.getState().beads[3].id;
    useDesignStore.getState().selectBead(beadId);
    expect(useDesignStore.getState().selectedBeadId).toBe(beadId);

    useDesignStore.getState().removeBead(beadId);

    expect(useDesignStore.getState().selectedBeadId).toBeNull();
  });

  it("removeBead does not clear selection for a different bead", () => {
    const selectedId = useDesignStore.getState().beads[0].id;
    const otherId = useDesignStore.getState().beads[1].id;
    useDesignStore.getState().selectBead(selectedId);

    useDesignStore.getState().removeBead(otherId);

    expect(useDesignStore.getState().selectedBeadId).toBe(selectedId);
  });
});
