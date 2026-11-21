import {describe, expect, it} from "vitest";
import {hitTest} from "../src/hit-test.ts";

const anchors = [
  {id: "li", x: 0.4, y: 0.5},
  {id: "ki", x: 0.6, y: 0.5},
];

describe("hitTest", () => {
  it("returns the nearest anchor within the radius", () => {
    expect(hitTest(anchors, {x: 0.42, y: 0.5}, 0.1)).toBe("li");
    expect(hitTest(anchors, {x: 0.58, y: 0.5}, 0.1)).toBe("ki");
  });

  it("returns undefined beyond the radius", () => {
    expect(hitTest(anchors, {x: 0.5, y: 0.9}, 0.1)).toBeUndefined();
  });

  it("returns undefined without anchors", () => {
    expect(hitTest([], {x: 0.5, y: 0.5}, 1)).toBeUndefined();
  });
});
