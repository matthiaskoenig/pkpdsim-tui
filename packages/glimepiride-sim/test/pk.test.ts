import {describe, expect, it} from "vitest";
import {finalValue, pharmacokinetics} from "../src/pk.ts";

/** A one compartment course with a known peak, exposure and half life. */
function course(halflife: number, points = 301, end = 3000): Record<string, number[]> {
  const ka = 0.05;
  const ke = Math.LN2 / halflife;
  const time: number[] = [];
  const concentration: number[] = [];
  for (let index = 0; index < points; index++) {
    const t = (end * index) / (points - 1);
    time.push(t);
    concentration.push((ka / (ka - ke)) * (Math.exp(-ke * t) - Math.exp(-ka * t)));
  }
  return {time, concentration};
}

describe("pharmacokinetics", () => {
  const series = course(300);
  const result = pharmacokinetics(series, "concentration");

  it("finds the peak of the course and when it happens", () => {
    const ka = 0.05;
    const ke = Math.LN2 / 300;
    expect(result.tmax).toBeCloseTo(Math.log(ka / ke) / (ka - ke), -1);
    expect(result.cmax).toBeGreaterThan(0.7);
  });

  it("reads the half life off the terminal part", () => {
    expect(result.halflife).toBeCloseTo(300, 0);
  });

  it("integrates the exposure over the window", () => {
    expect(result.auc).toBeGreaterThan(0);
    expect(result.auc).toBeCloseTo(
      pharmacokinetics(series, "concentration", {factor: 2}).auc / 2, 9);
  });

  it("scales every concentration with the factor of the unit", () => {
    const scaled = pharmacokinetics(series, "concentration", {factor: 1000});
    expect(scaled.cmax).toBeCloseTo(result.cmax * 1000, 6);
    expect(scaled.tmax).toBe(result.tmax);
    expect(scaled.halflife).toBeCloseTo(result.halflife, 6);
  });

  it("is empty for a course that is not there", () => {
    expect(pharmacokinetics({}, "concentration")).toEqual({
      cmax: 0, tmax: Number.NaN, auc: 0, halflife: Number.NaN,
    });
  });

  it("has no half life when the course does not fall", () => {
    const flat = {time: [0, 10, 20, 30], concentration: [1, 1, 1, 1]};
    expect(pharmacokinetics(flat, "concentration").halflife).toBeNaN();
  });
});

describe("finalValue", () => {
  it("is what has accumulated at the end of the course", () => {
    expect(finalValue({time: [0, 1], amount: [0, 2.5]}, "amount", 1000)).toBe(2500);
  });

  it("is zero for a column the course does not have", () => {
    expect(finalValue({}, "amount")).toBe(0);
  });
});
