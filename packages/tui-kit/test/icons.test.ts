import {describe, expect, it} from "vitest";

import {fillOf, ICONS, vesselPaths} from "../src/icons.mjs";
import type {GlyphKind} from "../src/icons.d.mts";

/** The pictures the table draws, which the surface of the simulator draws from the same file. */
const KINDS: readonly GlyphKind[] = [
  "vessel", "heart", "tablet", "enzyme", "liver", "kidney", "body", "clamp", "scalpel", "clock",
  "pump", "bubble", "thermometer",
];

describe("the pictures of the objects", () => {
  it("has an outline for everything but the vessel, which is its own shape", () => {
    expect(Object.keys(ICONS).sort()).toEqual([...KINDS].sort());
    for (const kind of KINDS) {
      const paths = ICONS[kind];
      if (kind === "vessel") {
        expect(paths).toEqual([]);
        continue;
      }
      expect(paths.length, kind).toBeGreaterThan(0);
      for (const path of paths) expect(path, kind).toMatch(/^M /);
    }
  });

  it("fills a picture from the bottom, except the two which carry their own value", () => {
    expect(fillOf("tablet", 0.4)).toBeCloseTo(0.4, 9);
    expect(fillOf("tablet", 2)).toBe(1);
    expect(fillOf("tablet", -1)).toBe(0);
    // A vessel is its own opening and a clock says the value with its hand.
    expect(fillOf("vessel", 0.2)).toBe(1);
    expect(fillOf("clock", 0.8)).toBe(0);
  });

  it("opens the vessel with its level", () => {
    const shut = vesselPaths(0);
    const open = vesselPaths(1);
    expect(shut.walls).toEqual(open.walls);
    expect(shut.lumen).toBe("M -24 -1.5 H 24 V 1.5 H -24 Z");
    expect(open.lumen).toBe("M -24 -11.0 H 24 V 11.0 H -24 Z");
  });
});
