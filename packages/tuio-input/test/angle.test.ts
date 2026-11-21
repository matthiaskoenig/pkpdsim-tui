import {describe, expect, it} from "vitest";
import {signedAngle, unwrapAngle, wrapAngle} from "../src/angle.ts";

const TWO_PI = Math.PI * 2;

describe("wrapAngle", () => {
  it("maps any angle into [0, 2 pi)", () => {
    expect(wrapAngle(0)).toBe(0);
    expect(wrapAngle(TWO_PI)).toBeCloseTo(0, 12);
    expect(wrapAngle(-0.5)).toBeCloseTo(TWO_PI - 0.5, 12);
    expect(wrapAngle(3 * TWO_PI + 1)).toBeCloseTo(1, 12);
  });
});

describe("signedAngle", () => {
  it("maps any angle into (-pi, pi]", () => {
    expect(signedAngle(0)).toBe(0);
    expect(signedAngle(0.3)).toBeCloseTo(0.3, 12);
    expect(signedAngle(TWO_PI - 0.3)).toBeCloseTo(-0.3, 12);
    expect(signedAngle(Math.PI)).toBeCloseTo(Math.PI, 12);
    expect(signedAngle(Math.PI + 0.1)).toBeCloseTo(-Math.PI + 0.1, 12);
  });
});

describe("unwrapAngle", () => {
  it("carries a turn past the 2 pi boundary", () => {
    expect(unwrapAngle(TWO_PI - 0.1, 0.1)).toBeCloseTo(TWO_PI + 0.1, 12);
  });

  it("carries a turn below zero", () => {
    expect(unwrapAngle(0.1, TWO_PI - 0.1)).toBeCloseTo(-0.1, 12);
  });

  it("never jumps by more than pi", () => {
    let turn = 0;
    for (let step = 0; step < 100; step++) {
      const next = unwrapAngle(turn, wrapAngle(step * 0.9));
      expect(Math.abs(next - turn)).toBeLessThanOrEqual(Math.PI + 1e-9);
      turn = next;
    }
    expect(turn).toBeCloseTo(99 * 0.9, 9);
  });
});
