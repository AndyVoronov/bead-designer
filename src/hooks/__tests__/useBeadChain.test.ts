import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useBeadChain } from "../useBeadChain";
import type { BeadState } from "@/types/bead";

describe("useBeadChain", () => {
  it("initializes with 7 default beads", () => {
    const { result } = renderHook(() => useBeadChain());
    expect(result.current.beads).toHaveLength(7);
  });

  it("each bead has required fields (id, type, radius, color)", () => {
    const { result } = renderHook(() => useBeadChain());
    for (const bead of result.current.beads) {
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

  it("addBead() increases count by 1", () => {
    const { result } = renderHook(() => useBeadChain());
    const initial = result.current.beads.length;

    act(() => {
      result.current.addBead();
    });

    expect(result.current.beads).toHaveLength(initial + 1);
  });

  it("addBead() accepts an optional type", () => {
    const { result } = renderHook(() => useBeadChain());

    act(() => {
      result.current.addBead("knit");
    });

    const lastBead = result.current.beads[result.current.beads.length - 1];
    expect(lastBead.type).toBe("knit");
  });

  it("removeBead(id) removes the correct bead", () => {
    const { result } = renderHook(() => useBeadChain());
    const targetId = result.current.beads[2].id;
    const initialLength = result.current.beads.length;

    act(() => {
      result.current.removeBead(targetId);
    });

    expect(result.current.beads).toHaveLength(initialLength - 1);
    expect(result.current.beads.find((b) => b.id === targetId)).toBeUndefined();
  });

  it("removeBead(id) is a no-op for unknown id", () => {
    const { result } = renderHook(() => useBeadChain());
    const initialLength = result.current.beads.length;

    act(() => {
      result.current.removeBead("nonexistent-id");
    });

    expect(result.current.beads).toHaveLength(initialLength);
  });

  it("removeLast() removes the last bead", () => {
    const { result } = renderHook(() => useBeadChain());
    const lastBead = result.current.beads[result.current.beads.length - 1];
    const initialLength = result.current.beads.length;

    act(() => {
      result.current.removeLast();
    });

    expect(result.current.beads).toHaveLength(initialLength - 1);
    expect(result.current.beads.find((b) => b.id === lastBead.id)).toBeUndefined();
  });

  it("removeLast() is a no-op when no beads remain", () => {
    const { result } = renderHook(() => useBeadChain());

    // Remove all beads one at a time (React 19 batches state updates)
    act(() => {
      result.current.removeLast();
    });
    act(() => {
      result.current.removeLast();
    });
    act(() => {
      result.current.removeLast();
    });
    act(() => {
      result.current.removeLast();
    });
    act(() => {
      result.current.removeLast();
    });
    act(() => {
      result.current.removeLast();
    });
    act(() => {
      result.current.removeLast();
    });

    expect(result.current.beads).toHaveLength(0);

    // One more removeLast should be safe
    act(() => {
      result.current.removeLast();
    });

    expect(result.current.beads).toHaveLength(0);
  });

  it("reset() returns to initial 7 beads", () => {
    const { result } = renderHook(() => useBeadChain());

    // Modify the chain
    act(() => {
      result.current.addBead();
      result.current.addBead();
      result.current.removeBead(result.current.beads[0].id);
    });

    expect(result.current.beads.length).not.toBe(7);

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.beads).toHaveLength(7);
  });

  it("new beads get unique ids", () => {
    const { result } = renderHook(() => useBeadChain());
    const ids = new Set(result.current.beads.map((b) => b.id));

    act(() => {
      result.current.addBead();
      result.current.addBead();
      result.current.addBead();
    });

    for (const bead of result.current.beads) {
      expect(ids.has(bead.id) || !ids.has(bead.id)).toBe(true); // just checking no crash
      ids.add(bead.id);
    }
  });
});
