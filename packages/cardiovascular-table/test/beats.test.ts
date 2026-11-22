/** The scale of the strip charts of the heart, which rises and never falls. */

import {describe, expect, it} from "vitest";
import {ceilingOf} from "../src/beats.ts";

describe("ceilingOf", () => {
  it("keeps the ceiling where it is while the curve stays under it", () => {
    expect(ceilingOf(200, 150)).toBe(200);
    expect(ceilingOf(200, 200)).toBe(200);
  });

  it("raises it to a round number above what the table showed", () => {
    expect(ceilingOf(160, 161)).toBe(200);
    expect(ceilingOf(160, 230)).toBe(250);
    expect(ceilingOf(2.5, 2.6)).toBe(3);
    expect(ceilingOf(16, 17)).toBe(20);
  });

  it("never falls again, which is what makes the scale readable", () => {
    let top = 2.5;
    for (const needed of [2.1, 3.4, 2.2, 1.0, 3.5]) top = ceilingOf(top, needed);
    expect(top).toBe(4);
  });
});
