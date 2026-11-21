import {describe, expect, it} from "vitest";
import reference from "./fixtures/pressure-reference.json" with {type: "json"};
import {defaultControls, solvePressure} from "../src/pressure.ts";
import {parseCardiovascularData, parsePressureReference} from "../src/parse.ts";
import type {PressureReference} from "../src/types.ts";

const pressure = parsePressureReference(reference);

describe("solvePressure at the reference", () => {
  const solution = solvePressure(pressure, defaultControls(pressure));

  it("reproduces the exported portal and hepatic pressures", () => {
    expect(solution.ppo).toBeCloseTo(pressure.portal_pressure, 9);
    expect(solution.pli).toBeCloseTo(pressure.hepatic_pressure, 9);
  });

  it("reproduces the exported cardiac output", () => {
    expect(solution.co).toBeCloseTo(pressure.cardiac_output, 9);
  });

  it("reproduces every exported organ flow", () => {
    expect(solution.flows).toHaveLength(pressure.organs.length);
    for (const [index, organ] of pressure.organs.entries()) {
      expect(solution.flows[index]?.id).toBe(organ.id);
      expect(solution.flows[index]?.flow).toBeCloseTo(organ.flow, 9);
    }
  });

  it("conserves flow at the portal and hepatic nodes", () => {
    expect(Math.abs(solution.portalResidual)).toBeLessThan(1e-9);
    expect(Math.abs(solution.hepaticResidual)).toBeLessThan(1e-9);
  });

  it("splits the cardiac output into the systemic, portal and hepatic arterial parts", () => {
    expect(solution.systemicFlow + solution.qpo + solution.qha).toBeCloseTo(solution.co, 9);
  });
});

describe("solvePressure away from the reference", () => {
  it("raises the portal pressure when the hepatic outflow is obstructed", () => {
    const controls = {...defaultControls(pressure), hepatic: 4};
    const solution = solvePressure(pressure, controls);
    expect(solution.ppo).toBeGreaterThan(pressure.portal_pressure);
    expect(solution.pli).toBeGreaterThan(pressure.hepatic_pressure);
    expect(solution.qh).toBeLessThan(solvePressure(pressure, defaultControls(pressure)).qh);
  });

  it("lowers the renal flow when the renal resistance rises", () => {
    const base = solvePressure(pressure, defaultControls(pressure));
    const solution = solvePressure(pressure, {...defaultControls(pressure), renal: 2});
    const kidney = (s: typeof base) => s.flows.find(organ => organ.id === "ki")?.flow ?? 0;
    expect(kidney(solution)).toBeLessThan(kidney(base));
  });

  it("refuses a resistance factor of zero or less", () => {
    expect(() => solvePressure(pressure, {...defaultControls(pressure), systemic: 0}))
      .toThrow(RangeError);
    expect(() => solvePressure(pressure, {...defaultControls(pressure), portal: -1}))
      .toThrow(RangeError);
  });

  it("refuses an arterial pressure at or below the venous pressure", () => {
    expect(() => solvePressure(pressure, {...defaultControls(pressure), arterial: 5, venous: 5}))
      .toThrow(RangeError);
  });

  it("refuses a control that is not a number", () => {
    expect(() => solvePressure(pressure, {...defaultControls(pressure), hepatic: Number.NaN}))
      .toThrow(RangeError);
  });
});

describe("parsePressureReference", () => {
  it("accepts the exported reference", () => {
    expect(pressure.organs).toHaveLength(14);
    expect(pressure.organs.map(organ => organ.id)).toContain("li");
    expect(pressure.organs.filter(organ => organ.portal).length).toBeGreaterThan(0);
  });

  it("refuses a payload that is not a reference", () => {
    expect(() => parsePressureReference(null)).toThrow(TypeError);
    expect(() => parsePressureReference({organs: []})).toThrow(TypeError);
    const broken = {...(reference as unknown as PressureReference), organs: [{id: "li"}]};
    expect(() => parsePressureReference(broken)).toThrow(TypeError);
  });
});

describe("parseCardiovascularData", () => {
  it("refuses a payload without a pressure block", () => {
    expect(() => parseCardiovascularData({schema_version: 1, cases: []})).toThrow(TypeError);
  });

  it("accepts a payload with the pressure block and the cases", () => {
    const data = parseCardiovascularData({
      schema_version: 1,
      provenance: {generator: "test"},
      pressure: reference,
      cases: [],
    });
    expect(data.pressure.organs).toHaveLength(14);
    expect(data.cases).toHaveLength(0);
  });
});
