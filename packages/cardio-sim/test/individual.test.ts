import {describe, expect, it} from "vitest";
import {
  AGE_RANGE, bodyParameters, cardiacOutput, clampAge, clampWeight, flowScale, individualOf,
  referenceBody, renalFactor, WEIGHT_RANGE,
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

  it("spans the bodies these tables are asked about, whatever the age is", () => {
    // The three numbers of a person are chosen one by one: the range of the weight is the
    // range of human bodies and not the range of an age, so moving the age moves nothing.
    expect(WEIGHT_RANGE.min).toBe(3);
    // A grown up reaches strong obesity, which is a body these models are asked about.
    expect(WEIGHT_RANGE.max).toBe(150);
    expect(clampWeight(200)).toBe(WEIGHT_RANGE.max);
    expect(clampWeight(1)).toBe(WEIGHT_RANGE.min);
    expect(clampWeight(82.34)).toBe(82.3);
    // A weight which is no number at all falls back to the one it is given.
    expect(clampWeight(Number.NaN, 19)).toBe(19);
  });

  it("keeps the weight a visitor set, whatever the age of the body is", () => {
    // A body of four years which weighs eighty kilograms is not a body the physiology was
    // written for, but it is the body the visitor asked for, and the tables solve what they
    // are given rather than quietly moving a dial back.
    expect(individualOf(4, "female", 80).weight).toBe(80);
    expect(individualOf(80, "male", 12).weight).toBe(12);
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
