import {describe, expect, it} from "vitest";
import {ABSOLUTE_SPAN, angleForValue, roleForMarker, valueFromAngle} from "../src/roles.ts";
import type {TokenRole} from "../src/roles.ts";

const TWO_PI = Math.PI * 2;

function role(overrides: Partial<TokenRole> = {}): TokenRole {
  return {
    id: "hepatic", label: "Hepatic outflow", description: "", unit: "x",
    markers: [1], min: 1, max: 8, reference: 1,
    mode: "absolute", scale: "linear", turns: 1, ...overrides,
  };
}

describe("roleForMarker", () => {
  const roles = [role(), role({id: "portal", markers: [3, 13]})];

  it("finds the role of a marker", () => {
    expect(roleForMarker(roles, 1)?.id).toBe("hepatic");
    expect(roleForMarker(roles, 13)?.id).toBe("portal");
  });

  it("returns undefined for a marker no role claims", () => {
    expect(roleForMarker(roles, 99)).toBeUndefined();
  });
});

describe("valueFromAngle, absolute", () => {
  it("reads the reference with the token pointing up", () => {
    expect(valueFromAngle(role({min: 0.5, max: 2, reference: 1}), 0)).toBeCloseTo(1, 12);
  });

  it("reaches the maximum at the clockwise stop and holds it in the dead band", () => {
    const r = role({min: 0.5, max: 2, reference: 1});
    expect(valueFromAngle(r, ABSOLUTE_SPAN * Math.PI)).toBeCloseTo(2, 12);
    expect(valueFromAngle(r, 0.99 * Math.PI)).toBeCloseTo(2, 12);
  });

  it("reaches the minimum at the counter clockwise stop", () => {
    const r = role({min: 0.5, max: 2, reference: 1});
    expect(valueFromAngle(r, TWO_PI - ABSOLUTE_SPAN * Math.PI)).toBeCloseTo(0.5, 12);
  });

  it("is monotone and halves the span halfway, on a linear scale", () => {
    const r = role({min: 0.5, max: 2, reference: 1});
    expect(valueFromAngle(r, 0.5 * ABSOLUTE_SPAN * Math.PI)).toBeCloseTo(1.5, 12);
  });

  it("uses the geometric middle halfway, on a log scale", () => {
    const r = role({min: 1, max: 16, reference: 4, scale: "log"});
    expect(valueFromAngle(r, 0.5 * ABSOLUTE_SPAN * Math.PI)).toBeCloseTo(8, 12);
    expect(valueFromAngle(r, -0.5 * ABSOLUTE_SPAN * Math.PI)).toBeCloseTo(2, 12);
  });

  // An object whose reference is one end of its range used to carry that end over the whole
  // half of the turn below it, so half of the object did nothing.
  it("spends the whole turn on the range when the reference is an end", () => {
    const r = role({min: 0, max: 4, reference: 0});
    expect(valueFromAngle(r, TWO_PI - ABSOLUTE_SPAN * Math.PI)).toBeCloseTo(0, 12);
    expect(valueFromAngle(r, -0.5 * ABSOLUTE_SPAN * Math.PI)).toBeCloseTo(1, 12);
    expect(valueFromAngle(r, 0)).toBeCloseTo(2, 12);
    expect(valueFromAngle(r, 0.5 * ABSOLUTE_SPAN * Math.PI)).toBeCloseTo(3, 12);
    expect(valueFromAngle(r, ABSOLUTE_SPAN * Math.PI)).toBeCloseTo(4, 12);
  });

  it("spends the whole turn on the range when the reference is the maximum", () => {
    const r = role({min: 1, max: 9, reference: 9});
    expect(valueFromAngle(r, TWO_PI - ABSOLUTE_SPAN * Math.PI)).toBeCloseTo(1, 12);
    expect(valueFromAngle(r, 0)).toBeCloseTo(5, 12);
    expect(valueFromAngle(r, ABSOLUTE_SPAN * Math.PI)).toBeCloseTo(9, 12);
  });

  it("is the inverse of angleForValue over a range the reference ends", () => {
    const r = role({min: 0, max: 4, reference: 0});
    for (const value of [0, 1, 2.5, 4]) {
      expect(valueFromAngle(r, angleForValue(r, value))).toBeCloseTo(value, 9);
    }
  });

  it("is the inverse of angleForValue", () => {
    const r = role({min: 1, max: 8, reference: 1, scale: "log"});
    for (const value of [1, 1.5, 3, 8]) {
      expect(valueFromAngle(r, angleForValue(r, value))).toBeCloseTo(value, 9);
    }
  });
});

describe("valueFromAngle, relative", () => {
  const r = role({mode: "relative", min: 0.5, max: 2, reference: 1, turns: 1});

  it("starts at the reference where the token was put down", () => {
    expect(valueFromAngle(r, 4.2, 4.2)).toBeCloseTo(1, 12);
  });

  it("gives the same value for the same offset after two turns", () => {
    const quarter = valueFromAngle(r, 0.25 * TWO_PI, 0);
    expect(valueFromAngle(r, 0.25 * TWO_PI + 2 * TWO_PI, 2 * TWO_PI)).toBeCloseTo(quarter, 12);
    expect(quarter).toBeCloseTo(1.5, 12);
  });

  it("clamps beyond the range", () => {
    expect(valueFromAngle(r, 10 * TWO_PI, 0)).toBeCloseTo(2, 12);
    expect(valueFromAngle(r, -10 * TWO_PI, 0)).toBeCloseTo(0.5, 12);
  });
});

// A relative object carries its reference wherever it is put down, whether that reference is
// an end of its range or not: the turn from there is the change.
describe("valueFromAngle, relative with the reference at an end", () => {
  const r = role({min: 0, max: 10, reference: 10, mode: "relative"});

  it("reads the reference where it was put down", () => {
    expect(valueFromAngle(r, 3.2, 3.2)).toBeCloseTo(10, 12);
  });

  it("turns down from there", () => {
    expect(valueFromAngle(r, 3.2 - TWO_PI / 4, 3.2)).toBeCloseTo(5, 12);
  });
});

describe("a role that carries its value in its position", () => {
  const instrument: TokenRole = {
    id: "clamp", label: "Clamp", description: "Closes the branch under it.", unit: "",
    markers: [5], min: 0, max: 1, reference: 0, mode: "position", scale: "linear", turns: 1,
  };

  it("has no value in its angle", () => {
    expect(() => valueFromAngle(instrument, 1)).toThrow(RangeError);
  });

  it("is still found by its marker", () => {
    expect(roleForMarker([instrument], 5)).toBe(instrument);
  });
});
