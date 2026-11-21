import {describe, expect, it} from "vitest";
import {
  describeArc, formatDelta, formatFactor, formatNumber, mixHex, organRadius, perfusionColor,
  PERFUSION_HIGH, PERFUSION_LOW, PERFUSION_NEUTRAL, polarPoint, vesselWidth,
} from "../src/format.ts";

describe("polarPoint", () => {
  it("measures degrees clockwise from up", () => {
    expect(polarPoint(0, 0, 10, 0)).toEqual({x: 0, y: -10});
    const right = polarPoint(0, 0, 10, 90);
    expect(right.x).toBeCloseTo(10, 9);
    expect(right.y).toBeCloseTo(0, 9);
    const down = polarPoint(0, 0, 10, 180);
    expect(down.y).toBeCloseTo(10, 9);
  });
});

describe("describeArc", () => {
  it("sweeps clockwise for a rising angle and back for a falling one", () => {
    expect(describeArc(0, 0, 10, 0, 90)).toMatch(/A 10 10 0 0 1 /);
    expect(describeArc(0, 0, 10, 0, -90)).toMatch(/A 10 10 0 0 0 /);
  });

  it("marks an arc of more than half a turn as the large one", () => {
    expect(describeArc(0, 0, 10, 0, 200)).toMatch(/A 10 10 0 1 1 /);
  });
});

describe("formatNumber", () => {
  it("drops the decimals a large number does not need", () => {
    expect(formatNumber(6.5)).toBe("6.50");
    expect(formatNumber(12.34)).toBe("12.3");
    expect(formatNumber(123.4)).toBe("123");
    expect(formatNumber(Number.NaN)).toBe("-");
  });
});

describe("formatFactor and formatDelta", () => {
  it("writes a factor with its sign of magnitude", () => {
    expect(formatFactor(1)).toBe("1.00x");
    expect(formatFactor(12.5)).toBe("12.5x");
  });

  it("writes a change only when there is one", () => {
    expect(formatDelta(10, 10)).toBe("");
    expect(formatDelta(12, 10)).toBe("+2.0");
    expect(formatDelta(8, 10)).toBe("-2.0");
  });
});

describe("mixHex", () => {
  it("returns the ends and the middle", () => {
    expect(mixHex("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mixHex("#000000", "#ffffff", 1)).toBe("#ffffff");
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  it("clamps outside the unit interval", () => {
    expect(mixHex("#000000", "#ffffff", 4)).toBe("#ffffff");
  });
});

describe("perfusionColor", () => {
  it("is neutral at the reference flow", () => {
    expect(perfusionColor(1)).toBe(PERFUSION_NEUTRAL);
  });

  it("reaches the ends of the ramp at a doubling in either direction", () => {
    expect(perfusionColor(2)).toBe(PERFUSION_HIGH);
    expect(perfusionColor(0.5)).toBe(PERFUSION_LOW);
    expect(perfusionColor(16)).toBe(PERFUSION_HIGH);
    expect(perfusionColor(0)).toBe(PERFUSION_LOW);
  });
});

describe("vesselWidth and organRadius", () => {
  it("grow with the square root of the flow and stay within their bounds", () => {
    expect(vesselWidth(0)).toBe(0.3);
    expect(vesselWidth(1)).toBeCloseTo(1.25, 9);
    expect(vesselWidth(100)).toBe(4.2);
    expect(organRadius(0)).toBe(1.1);
    expect(organRadius(1)).toBeCloseTo(3.5, 9);
    expect(organRadius(100)).toBe(7);
  });
});
