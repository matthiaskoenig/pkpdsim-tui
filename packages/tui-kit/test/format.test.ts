import {describe, expect, it} from "vitest";
import {
  describeArc, formatDelta, formatFactor, formatNumber, mixHex, organRadius, perfusionColor,
  PERFUSION_HIGH, PERFUSION_LOW, PERFUSION_NEUTRAL, polarPoint, vesselWidth,
} from "../src/format.ts";
import {cardRotation, trackSpan} from "../src/tokens.ts";
import {ABSOLUTE_SPAN} from "@pkpdsim-tui/tuio-input";
import type {TokenRole} from "@pkpdsim-tui/tuio-input";

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

describe("cardRotation", () => {
  it("turns a card to the nearest edge of the table", () => {
    expect(cardRotation(0.5, 0.9)).toBe(0);
    expect(cardRotation(0.5, 0.1)).toBe(180);
    expect(cardRotation(0.1, 0.5)).toBe(90);
    expect(cardRotation(0.9, 0.5)).toBe(-90);
  });

  it("faces the near edge in the middle of the table", () => {
    expect(cardRotation(0.5, 0.5)).toBe(0);
  });

  it("picks one edge in a corner", () => {
    expect([0, 90]).toContain(cardRotation(0.08, 0.92));
  });
});

describe("trackSpan", () => {
  const role = (min: number, max: number, reference: number): TokenRole => ({
    id: "r", label: "r", description: "", unit: "", markers: [1],
    min, max, reference, mode: "absolute", scale: "linear", turns: 1,
  });

  it("covers both halves of the dial when the reference sits between the ends", () => {
    const {start, end} = trackSpan(role(0, 10, 5));
    expect(start).toBeCloseTo(-ABSOLUTE_SPAN * 180, 6);
    expect(end).toBeCloseTo(ABSOLUTE_SPAN * 180, 6);
  });

  it("covers one half when the reference is one end of the range", () => {
    expect(trackSpan(role(0, 10, 0)).start).toBeCloseTo(0, 6);
    expect(trackSpan(role(0, 10, 10)).end).toBeCloseTo(0, 6);
  });

  it("gives a relative dial the whole span, because it has no stop", () => {
    const {start, end} = trackSpan({...role(0, 10, 10), mode: "relative"});
    expect(end - start).toBeCloseTo(2 * ABSOLUTE_SPAN * 180, 6);
  });
});
