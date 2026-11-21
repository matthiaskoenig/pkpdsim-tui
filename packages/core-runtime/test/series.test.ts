import {describe, expect, it} from "vitest";
import {column, linspace, peak, sampleAt, toSeries, trapezoid} from "../src/series.ts";
import type {SimulationResult} from "../src/types.ts";

const result: SimulationResult = {
  columns: ["time", "a", "b"],
  values: [0, 1, 10, 1, 2, 20, 2, 4, 30],
  nRows: 3,
};

describe("linspace", () => {
  it("includes both ends", () => {
    expect(linspace(0, 10, 2)).toEqual([0, 5, 10]);
    expect(linspace(0, 1, 1)).toEqual([0, 1]);
  });
});

describe("column and toSeries", () => {
  it("reads a column out of the flat result", () => {
    expect(column(result, "time")).toEqual([0, 1, 2]);
    expect(column(result, "b")).toEqual([10, 20, 30]);
  });

  it("refuses a column the result does not have", () => {
    expect(() => column(result, "missing")).toThrow(RangeError);
  });

  it("reads every column at once", () => {
    expect(toSeries(result)).toEqual({time: [0, 1, 2], a: [1, 2, 4], b: [10, 20, 30]});
  });
});

describe("sampleAt", () => {
  const series = toSeries(result);

  it("takes the row at or before the time", () => {
    expect(sampleAt(series, 0)).toEqual({time: 0, a: 1, b: 10});
    expect(sampleAt(series, 1.5)).toEqual({time: 1, a: 2, b: 20});
    expect(sampleAt(series, 99)).toEqual({time: 2, a: 4, b: 30});
  });

  it("is empty without a time column", () => {
    expect(sampleAt({a: [1, 2]}, 1)).toEqual({});
  });
});

describe("trapezoid and peak", () => {
  it("integrates a straight line exactly", () => {
    expect(trapezoid([0, 1, 2], [0, 1, 2])).toBeCloseTo(2, 12);
  });

  it("is zero for a single point", () => {
    expect(trapezoid([0], [5])).toBe(0);
  });

  it("finds the largest value and when it happens", () => {
    expect(peak([0, 1, 2], [1, 7, 3])).toEqual({value: 7, time: 1});
  });
});
