import {describe, expect, it} from "vitest";
import {
  CIRRHOSIS_CLASSES, GENOTYPES, nearestCategory, RENAL_CLASSES,
} from "../src/categories.ts";
import {
  GLIMEPIRIDE_CONTROLS, NORMAL_CRCL, normalizeIndividual, parametersOf, REFERENCE_BODIES,
  referenceIndividual,
} from "../src/individual.ts";
import {GLIMEPIRIDE_SIMULATION, glimepirideRequest} from "../src/request.ts";

describe("the reference individual", () => {
  it("takes four milligrams and is otherwise the reference adult of their sex", () => {
    expect(referenceIndividual()).toEqual({dose: 4, cyp2c9: 1, cirrhosis: 0, renal: 110, weight: 73});
    expect(referenceIndividual("female").weight).toBe(60);
    expect(REFERENCE_BODIES.female).toEqual({weight: 60, height: 163});
  });

  it("leaves the parameters of the model at their own defaults, apart from the dose", () => {
    expect(parametersOf()).toEqual([
      ["HEIGHT", 176], ["PODOSE_gli", 4], ["LI__f_cyp2c9", 1], ["f_cirrhosis", 0],
      ["KI__f_renal_function", 1], ["BW", 73],
    ]);
  });

  it("is the female body in its height as well as in its weight", () => {
    const parameters = new Map(parametersOf(referenceIndividual("female"), "female"));
    expect(parameters.get("HEIGHT")).toBe(163);
    expect(parameters.get("BW")).toBe(60);
  });
});

describe("normalizeIndividual", () => {
  it("fills in the reference for what is not given", () => {
    expect(normalizeIndividual({dose: 1}).weight).toBe(GLIMEPIRIDE_CONTROLS.weight.value);
  });

  it("refuses a value outside the range of its control", () => {
    expect(() => normalizeIndividual({dose: 20})).toThrow(RangeError);
    expect(() => normalizeIndividual({cyp2c9: 0})).toThrow(RangeError);
    expect(() => normalizeIndividual({weight: Number.NaN})).toThrow(RangeError);
  });
});

describe("parametersOf", () => {
  it("turns the creatinine clearance into the renal function the model takes", () => {
    const parameters = new Map(parametersOf({renal: 55}));
    expect(parameters.get("KI__f_renal_function")).toBeCloseTo(0.5, 9);
  });

  it("never clears more than the reference kidney", () => {
    const parameters = new Map(parametersOf({renal: NORMAL_CRCL}));
    expect(parameters.get("KI__f_renal_function")).toBe(1);
  });
});

describe("glimepirideRequest", () => {
  it("gives the dose before the initial values are resolved", () => {
    const request = glimepirideRequest({dose: 2});
    expect(request.preinit).toContainEqual(["PODOSE_gli", 2]);
    expect(request.changes).toEqual([]);
  });

  it("runs one day after the last tablet, at the resolution of the table", () => {
    const one = glimepirideRequest();
    expect(one.output.times.at(-1)).toBe(2 * 24 * 60);
    expect(one.output.times.length).toBeGreaterThan(200);
    expect(one.changes).toEqual([]);
    const ten = glimepirideRequest({dose: 2}, "male", undefined, 10);
    expect(ten.output.times.at(-1)).toBe(11 * 24 * 60);
    // A tablet every morning after the first one, which is the dose put back in the stomach.
    expect(ten.changes).toHaveLength(9);
    expect(ten.changes[0]).toEqual({time: 24 * 60, values: [["PODOSE_gli", 2]]});
  });

  it("asks for the plasma of the parent and of both metabolites", () => {
    expect(glimepirideRequest().selections).toContain("[Cve_gli]");
    expect(glimepirideRequest().selections).toContain("[Cve_m1]");
    expect(glimepirideRequest().selections).toContain("[Cve_m2]");
  });
});

describe("the clinical categories", () => {
  it("names the six genotypes of CYP2C9, the wild type first", () => {
    expect(GENOTYPES.map(genotype => genotype.label))
      .toEqual(["*1/*1", "*1/*2", "*2/*2", "*1/*3", "*2/*3", "*3/*3"]);
    expect(GENOTYPES[0]?.value).toBe(1);
  });

  it("finds the genotype a dial is nearest to", () => {
    expect(nearestCategory(GENOTYPES, 1).label).toBe("*1/*1");
    expect(nearestCategory(GENOTYPES, 0.24).label).toBe("*3/*3");
    expect(nearestCategory(GENOTYPES, 0.8).label).toBe("*1/*2");
  });

  it("finds the Child-Pugh class and the renal stage", () => {
    expect(nearestCategory(CIRRHOSIS_CLASSES, 0).label).toBe("healthy");
    expect(nearestCategory(CIRRHOSIS_CLASSES, 0.8).label).toBe("CPT C");
    expect(nearestCategory(RENAL_CLASSES, 110).label).toBe("normal");
    expect(nearestCategory(RENAL_CLASSES, 30).label).toBe("moderate");
  });
});
