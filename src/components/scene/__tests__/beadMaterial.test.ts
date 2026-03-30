import { describe, it, expect } from "vitest";
import type { BeadType } from "@/types/bead";
import {
  BEAD_MATERIAL_CONFIGS,
  getBeadMaterialConfig,
} from "@/lib/beadMaterialConfig";

const BEAD_TYPES: BeadType[] = ["wood", "silicone", "knit", "plastic"];

describe("BEAD_MATERIAL_CONFIGS", () => {
  it("has a config for every BeadType", () => {
    for (const type of BEAD_TYPES) {
      expect(BEAD_MATERIAL_CONFIGS[type]).toBeDefined();
    }
  });

  it("every config has roughness in [0, 1] and metalness in [0, 1]", () => {
    for (const type of BEAD_TYPES) {
      const config = BEAD_MATERIAL_CONFIGS[type];
      expect(config.roughness).toBeGreaterThanOrEqual(0);
      expect(config.roughness).toBeLessThanOrEqual(1);
      expect(config.metalness).toBeGreaterThanOrEqual(0);
      expect(config.metalness).toBeLessThanOrEqual(1);
    }
  });

  it("wood is rougher than silicone", () => {
    expect(BEAD_MATERIAL_CONFIGS.wood.roughness).toBeGreaterThan(
      BEAD_MATERIAL_CONFIGS.silicone.roughness,
    );
  });

  it("knit is the roughest type", () => {
    const knitRoughness = BEAD_MATERIAL_CONFIGS.knit.roughness;
    for (const type of BEAD_TYPES) {
      if (type !== "knit") {
        expect(knitRoughness).toBeGreaterThanOrEqual(
          BEAD_MATERIAL_CONFIGS[type].roughness,
        );
      }
    }
  });

  it("silicone has the lowest roughness", () => {
    const siliconeRoughness = BEAD_MATERIAL_CONFIGS.silicone.roughness;
    for (const type of BEAD_TYPES) {
      if (type !== "silicone") {
        expect(siliconeRoughness).toBeLessThanOrEqual(
          BEAD_MATERIAL_CONFIGS[type].roughness,
        );
      }
    }
  });

  it("all four types have distinct roughness values", () => {
    const roughnessValues = BEAD_TYPES.map(
      (t) => BEAD_MATERIAL_CONFIGS[t].roughness,
    );
    const uniqueValues = new Set(roughnessValues);
    expect(uniqueValues.size).toBe(4);
  });
});

describe("getBeadMaterialConfig", () => {
  it("returns the correct config for a given type", () => {
    const woodConfig = getBeadMaterialConfig("wood");
    expect(woodConfig).toBe(BEAD_MATERIAL_CONFIGS.wood);
    expect(woodConfig.roughness).toBe(0.75);
  });
});
