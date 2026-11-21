import {describe, expect, it} from "vitest";

import {
  PERFUSION_COLUMNS, PERFUSION_CONTROLS, parametersOf, perfusionRequest, REFERENCE_SETTINGS,
} from "../src/index.ts";

describe("the settings of the machine", () => {
  it("gives the model the parameter of every setting, in the unit of the model", () => {
    const values = Object.fromEntries(parametersOf({flow: 3, oxygen: 50, temperature: 37}));
    // The dial is read in millilitres a minute; the model is in litres a minute.
    expect(values["Q_pump"]).toBeCloseTo(0.003, 9);
    expect(values["pO2_target"]).toBe(50);
    expect(values["T"]).toBe(37);
  });

  it("falls back to the reference perfusion for whatever is not set", () => {
    const values = Object.fromEntries(parametersOf({oxygen: 20}));
    expect(values["pO2_target"]).toBe(20);
    expect(values["Q_pump"]).toBeCloseTo(REFERENCE_SETTINGS.flow * 0.001, 9);
  });

  it("keeps every setting inside the range its dial offers", () => {
    for (const control of Object.values(PERFUSION_CONTROLS)) {
      expect(control.min).toBeLessThan(control.value);
      expect(control.value).toBeLessThanOrEqual(control.max);
    }
  });
});

describe("the request of one perfusion", () => {
  it("sets the machine before the initial values are resolved", () => {
    const request = perfusionRequest({temperature: 20});
    // The temperature drives initial assignments of the model, so a change would not reach them.
    expect(request.changes).toEqual([]);
    expect(Object.fromEntries(request.preinit)["T"]).toBe(20);
  });

  it("asks for the columns the table reads, over six hours", () => {
    const request = perfusionRequest();
    expect(request.selections).toEqual(PERFUSION_COLUMNS);
    expect(request.start).toBe(0);
    expect(request.end).toBe(360);
    expect(request.output.times.at(-1)).toBe(360);
  });
});
