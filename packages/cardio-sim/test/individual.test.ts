import {describe, expect, it} from "vitest";
import {
  AGE_RANGE, bodyParameters, cardiacOutput, clampAge, clampWeight, flowScale, individualOf,
  referenceBody, renalFactor, weightRange,
} from "../src/individual.ts";

describe("the reference body of an age", () => {
  it("is the reference adult of ICRP 89 at thirty-five years", () => {
    expect(referenceBody(35, "male")).toEqual({weight: 73, height: 176});
    expect(referenceBody(35, "female")).toEqual({weight: 60, height: 163});
  });

  it("is the reference child of ICRP 89 at the ages it tabulates", () => {
    expect(referenceBody(5, "male")).toEqual({weight: 19, height: 109});
    expect(referenceBody(10, "female")).toEqual({weight: 32, height: 138});
    expect(referenceBody(15, "female")).toEqual({weight: 53, height: 161});
  });

  it("goes linearly between the tabulated ages, as the library does", () => {
    // Halfway from the five year old of 19 kg to the ten year old of 32 kg.
    expect(referenceBody(7.5, "male").weight).toBeCloseTo(25.5, 9);
  });

  it("stays the adult from thirty-five years on", () => {
    expect(referenceBody(80, "female")).toEqual(referenceBody(35, "female"));
    expect(referenceBody(120, "male")).toEqual(referenceBody(35, "male"));
  });

  it("holds an age outside the years of the tables", () => {
    expect(clampAge(1)).toBe(AGE_RANGE.min);
    expect(clampAge(500)).toBe(AGE_RANGE.max);
    expect(clampAge(Number.NaN)).toBe(AGE_RANGE.value);
  });
});

describe("the weight of a body", () => {
  it("opens at the reference of the age and the body", () => {
    expect(individualOf(35, "female").weight).toBe(60);
    expect(individualOf(5, "male").weight).toBe(19);
  });

  it("stays inside what the physiology of that age is written for", () => {
    const range = weightRange(35, "female");
    expect(range.min).toBeCloseTo(39, 6);
    // A grown up reaches strong obesity, which is a body these models are asked about.
    expect(range.max).toBeCloseTo(150, 6);
    expect(clampWeight(200, 35, "female")).toBe(range.max);
    expect(clampWeight(1, 35, "female")).toBe(range.min);
    // A child carries the share of that their age can: the top of the dial grows with them.
    expect(weightRange(6, "female").max).toBeCloseTo(
      Math.round(referenceBody(6, "female").weight * 1.6 * 10) / 10, 6);
    expect(weightRange(15, "female").max).toBeGreaterThan(
      referenceBody(15, "female").weight * 1.6);
    expect(weightRange(15, "female").max).toBeLessThan(150);
  });

  it("is the body and the height of every human model", () => {
    expect(bodyParameters(individualOf(35, "female"))).toEqual([["BW", 60], ["HEIGHT", 163]]);
  });
});

describe("what the years do to a body", () => {
  it("leaves the kidneys of a young body alone", () => {
    expect(renalFactor(8, "female")).toBe(1);
    expect(renalFactor(35, "male")).toBe(1);
  });

  it("lets the kidneys fall with the years, and the women faster", () => {
    expect(renalFactor(50, "male")).toBeCloseTo(0.9169, 4);
    expect(renalFactor(100, "male")).toBeCloseTo(0.578, 4);
    expect(renalFactor(100, "female")).toBeCloseTo(0.484, 4);
    expect(renalFactor(120, "female")).toBeCloseTo(0.484, 4);
  });

  it("moves less blood through a smaller body", () => {
    expect(cardiacOutput(individualOf(35, "female"))).toBeCloseTo(5.9, 6);
    expect(cardiacOutput(individualOf(5, "female"))).toBeCloseTo(3.4, 6);
    expect(flowScale(individualOf(35, "male"))).toBeCloseTo(1, 9);
    expect(flowScale(individualOf(5, "female"))).toBeCloseTo(3.4 / 5.9, 6);
  });

  it("carries a heavier body with the three quarter power of its mass", () => {
    const heavy = individualOf(35, "male", 90);
    expect(cardiacOutput(heavy)).toBeCloseTo(6.5 * (90 / 73) ** 0.75, 3);
  });
});
