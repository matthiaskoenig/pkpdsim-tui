/**
 * The beating heart, held to what pkpdsim exported. The port may not read a run differently
 * from the script that produced the cases: the summary of the exported beats of a case has to
 * reproduce the summary that case carries.
 */

import {describe, expect, it} from "vitest";

import cases from "./fixtures/heart-cases.json" with {type: "json"};
import {
  DEFAULT_HEART_CONTROLS, HEART_PARAMETERS, heartCase, heartColumn, heartRequest,
  normalizeHeartControls,
} from "../src/heart.ts";
import type {HeartConfig, HeartControls} from "../src/heart.ts";
import type {SimulationResult} from "@pkpdsim-tui/core-runtime";

const config = cases.config as unknown as HeartConfig;

interface Fixture {
  readonly id: string;
  readonly changes: Readonly<Record<string, number>>;
  readonly heart_rate: number;
  readonly summary: {readonly before: Record<string, number>; readonly after: Record<string, number>};
  readonly beats?: {readonly columns: string[]; readonly values: number[][]};
}

const fixtures = cases.cases as unknown as readonly Fixture[];

function fixture(id: string): Fixture {
  const found = fixtures.find(entry => entry.id === id);
  if (found === undefined) throw new Error(`The fixture has no case "${id}".`);
  return found;
}

/** The controls of a case, which are the reference heart with what the case changed on top. */
function controlsOf(entry: Fixture): HeartControls {
  const values = {...DEFAULT_HEART_CONTROLS};
  for (const [key, parameter] of Object.entries(HEART_PARAMETERS) as [keyof HeartControls, string][]) {
    const change = entry.changes[parameter];
    if (change !== undefined) values[key] = change;
  }
  return values;
}

/**
 * The exported beats of a case as the result of a run: the table carries seconds and
 * millilitres, which is how a table reads them, while a run is in minutes and litres.
 */
function resultOf(entry: Fixture): SimulationResult {
  const beats = entry.beats;
  if (beats === undefined) throw new Error(`The fixture of "${entry.id}" has no beats.`);
  const values: number[] = [];
  for (const row of beats.values) {
    for (const [column, name] of beats.columns.entries()) {
      const value = row[column] ?? 0;
      values.push(name === "time" ? value / 60 : name === "CV_V_lv" ? value / 1000 : value);
    }
  }
  return {columns: beats.columns, values, nRows: beats.values.length};
}

describe("the controls of the beating heart", () => {
  it("is the reference heart when nothing is on the table", () => {
    expect(normalizeHeartControls()).toEqual({
      hepatic: 1, systemic: 1, portal: 1, renal: 1, heartRate: 75, contractility: 1,
    });
  });

  it("refuses a rate the model was not built for, and a factor that is not positive", () => {
    expect(() => normalizeHeartControls({heartRate: 39})).toThrow(RangeError);
    expect(() => normalizeHeartControls({heartRate: 151})).toThrow(RangeError);
    expect(() => normalizeHeartControls({hepatic: 0})).toThrow(RangeError);
    expect(() => normalizeHeartControls({systemic: Number.NaN})).toThrow(RangeError);
    expect(normalizeHeartControls({heartRate: 40}).heartRate).toBe(40);
  });
});

describe("the request of one run", () => {
  it("writes every control as the parameter of the model at the intervention", () => {
    const request = heartRequest({hepatic: 4, heartRate: 100}, config);
    expect(request.changes).toHaveLength(1);
    const change = request.changes[0];
    expect(change?.time).toBe(config.intervention);
    expect(Object.fromEntries(change?.values ?? [])).toEqual({
      CV_fR_hepatic: 4, CV_fR_systemic: 1, CV_fR_portal: 1, CV_fR_ki: 1, CV_HR: 100,
      CV_contractility: 1,
    });
  });

  it("reproduces the parameter changes of every exported case", () => {
    for (const entry of fixtures) {
      const change = heartRequest(controlsOf(entry), config).changes[0];
      const written = Object.fromEntries(change?.values ?? []);
      for (const [parameter, value] of Object.entries(entry.changes)) {
        expect(written[parameter]).toBeCloseTo(value, 12);
      }
    }
  });

  it("ends after a whole number of beats of the heart it was given", () => {
    for (const rate of [40, 60, 75, 100, 150]) {
      const request = heartRequest({heartRate: rate}, config);
      const beats = (request.end - config.intervention) * rate;
      expect(beats).toBeCloseTo(Math.round(beats), 9);
      expect(request.end).toBeLessThanOrEqual(config.end + 1e-9);
      expect(request.end).toBeGreaterThan(config.intervention);
    }
  });

  it("asks for the moments the two summaries are read at", () => {
    const request = heartRequest({heartRate: 100}, config);
    const times = request.output.times;
    const beforeStart = config.intervention - config.summary_beats / config.initial_heart_rate;
    const afterStart = request.end - config.summary_beats / 100;
    for (const moment of [0, beforeStart, config.intervention, afterStart, request.end]) {
      expect(times.some(time => Math.abs(time - moment) < 1e-12)).toBe(true);
    }
    expect(times).toEqual([...times].sort((left, right) => left - right));
    expect(new Set(times).size).toBe(times.length);
  });

  it("selects the columns of the compiled model and keeps its solver settings", () => {
    const request = heartRequest({}, config);
    expect(request.selections).toEqual(config.columns);
    expect(request.settings).toEqual(config.settings);
    expect(request.contract).toBe("simulation/1");
    expect(request.start).toBe(0);
    expect(request.steady_state).toBeNull();
    expect(request.preinit).toEqual([]);
  });
});

describe("the summary of a run", () => {
  /** The beats of a case, read back as a run of exactly those beats. */
  const summaryOf = (id: string) => {
    const entry = fixture(id);
    const result = resultOf(entry);
    const beats = entry.beats as {columns: string[]; values: number[][]};
    const end = (beats.values.at(-1)?.[0] ?? 0) / 60;
    const rate = entry.heart_rate;
    const live = heartCase(result, {...controlsOf(entry), heartRate: rate}, {
      ...config, intervention: end - config.summary_beats / rate, initial_heart_rate: rate,
    });
    return {live, exported: entry.summary.after};
  };

  it("reproduces the exported pressures of the reference heart", () => {
    const {live, exported} = summaryOf("baseline");
    expect(live.summary.after.arterial_systolic).toBeCloseTo(exported.arterial_systolic ?? 0, 1);
    expect(live.summary.after.arterial_diastolic).toBeCloseTo(exported.arterial_diastolic ?? 0, 1);
    expect(live.summary.after.mean_arterial_pressure).toBeCloseTo(exported.mean_arterial_pressure ?? 0, 1);
    expect(live.summary.after.mean_portal_pressure).toBeCloseTo(exported.mean_portal_pressure ?? 0, 2);
    expect(live.summary.after.mean_hepatic_pressure).toBeCloseTo(exported.mean_hepatic_pressure ?? 0, 2);
  });

  /**
   * A flow of the heart is a peaked waveform: it is zero while a valve is shut and a spike while
   * it is open. The exported summary integrated it over a grid of 0.2 ms and these beats are
   * kept at 4 ms, so the trapezoid misses a little of every peak. A per cent is that difference;
   * a unit, a window or a column read wrongly would be orders away from it.
   */
  const RESOLUTION = 0.01;

  it("reproduces the exported flows and the stroke volume of the reference heart", () => {
    const {live, exported} = summaryOf("baseline");
    const relative = (value: number, reference: number) => Math.abs(value - reference) / reference;
    expect(relative(live.summary.after.mean_cardiac_output, exported.mean_cardiac_output ?? 0))
      .toBeLessThan(RESOLUTION);
    expect(relative(live.summary.after.mean_portal_flow, exported.mean_portal_flow ?? 0))
      .toBeLessThan(RESOLUTION);
    expect(relative(live.summary.after.mean_hepatic_flow, exported.mean_hepatic_flow ?? 0))
      .toBeLessThan(RESOLUTION);
    expect(relative(live.summary.after.stroke_volume, exported.stroke_volume ?? 0))
      .toBeLessThan(RESOLUTION);
    expect(live.summary.after.heart_rate).toBe(75);
  });

  it("reproduces the exported summary of an obstructed hepatic outflow", () => {
    const {live, exported} = summaryOf("hepatic-4");
    expect(live.summary.after.mean_portal_pressure).toBeCloseTo(exported.mean_portal_pressure ?? 0, 2);
    expect(Math.abs(live.summary.after.mean_portal_flow - (exported.mean_portal_flow ?? 0))
      / (exported.mean_portal_flow ?? 1)).toBeLessThan(RESOLUTION);
    expect(live.summary.after.mean_arterial_pressure).toBeCloseTo(exported.mean_arterial_pressure ?? 0, 1);
    // The obstruction is what the case is about: the portal pressure has to be the higher one.
    const reference = fixture("baseline").summary.after.mean_portal_pressure ?? 0;
    expect(live.summary.after.mean_portal_pressure).toBeGreaterThan(reference + 1);
  });

  it("reads a course in the units of a table: seconds and millilitres", () => {
    const {live} = summaryOf("baseline");
    const time = heartColumn(live.beats, "time");
    expect(time[0]).toBeCloseTo(45.6, 3);
    expect(time.at(-1)).toBeCloseTo(48, 3);
    const volume = heartColumn(live.beats, "CV_V_lv");
    expect(Math.max(...volume)).toBeGreaterThan(50);
    expect(Math.max(...volume)).toBeLessThan(400);
  });

  it("names itself as the run of the objects on the table", () => {
    const {live} = summaryOf("baseline");
    expect(live.id).toBe("live");
    expect(live.changes["CV_HR"]).toBe(75);
    expect(live.summary.maximum_blood_volume_error).toBeGreaterThanOrEqual(0);
  });
});
