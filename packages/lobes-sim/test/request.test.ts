import {describe, expect, it} from "vitest";
import {DOSE_PARAMETER, lobeRequest, normalizeControls} from "../src/request.ts";
import {parseLobeConfig} from "../src/parse.ts";

const config = parseLobeConfig({
  species: "human",
  columns: ["time", "Vli_lobes", "f_remnant"],
  start: 0,
  end: 7200,
  points: 121,
  dose: 10,
  settings: {relative_tolerance: 1e-8},
  sbml_sha256: "abc",
});

describe("normalizeControls", () => {
  it("fills in the defaults of the exported runs", () => {
    expect(normalizeControls()).toEqual({habrGain: 0.255, growth: 0.0005, surgery: 0});
  });

  it("refuses a control outside its range", () => {
    expect(() => normalizeControls({habrGain: 2})).toThrow(RangeError);
    expect(() => normalizeControls({surgery: -1})).toThrow(RangeError);
    expect(() => normalizeControls({growth: Number.NaN})).toThrow(RangeError);
  });
});

describe("lobeRequest", () => {
  it("applies a surgery at time zero before the initial values", () => {
    const request = lobeRequest({}, {g_po_sg8: 0}, config);
    expect(request.contract).toBe("simulation/1");
    expect(request.preinit).toContainEqual([DOSE_PARAMETER, 10]);
    expect(request.preinit).toContainEqual(["g_po_sg8", 0]);
    expect(request.changes).toEqual([]);
    expect(request.selections).toEqual(config.columns);
  });

  it("applies a later surgery to the running model", () => {
    const request = lobeRequest({surgery: 1}, {g_po_sg8: 0}, config);
    expect(request.preinit).not.toContainEqual(["g_po_sg8", 0]);
    expect(request.changes).toEqual([{time: 1440, values: [["g_po_sg8", 0]]}]);
    expect(request.output.times).toContain(1440);
  });

  it("asks for the points of the configuration over its whole span", () => {
    const request = lobeRequest({}, {}, config);
    expect(request.output.times).toHaveLength(config.points);
    expect(request.output.times[0]).toBe(0);
    expect(request.output.times.at(-1)).toBe(7200);
  });

  it("carries the settings and the gains of the controls", () => {
    const request = lobeRequest({habrGain: 0.3, growth: 0.001}, {}, config);
    expect(request.preinit).toContainEqual(["habr_gain", 0.3]);
    expect(request.preinit).toContainEqual(["k_growth", 0.001]);
    expect(request.settings).toEqual(config.settings);
  });
});
