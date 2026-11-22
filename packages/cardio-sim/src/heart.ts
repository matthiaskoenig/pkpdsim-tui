/**
 * The beating heart: the request of one run of the compiled cardiovascular model and the
 * summary of the beats it produced, ported from `cardiovascular-solver.mjs` of the pkpdsim
 * documentation without changing what it asks for or how it is read.
 *
 * The run is one continuous integration of the whole circulation. It starts at the reference
 * physiology, the controls of the table are applied at the moment of the intervention, and the
 * beats before and after it are summarized separately, so the table can say what changed rather
 * than only what is. Time is in minutes, which is the unit of the model.
 */

import {linspace} from "@pkpdsim-tui/core-runtime";
import type {SimulationRequest, SimulationResult} from "@pkpdsim-tui/core-runtime";
import type {HeartCase, HeartSummary, Series} from "./types.ts";

/** The parameter of the model each control writes. */
export const HEART_PARAMETERS = {
  hepatic: "CV_fR_hepatic",
  systemic: "CV_fR_systemic",
  portal: "CV_fR_portal",
  renal: "CV_fR_ki",
  heartRate: "CV_HR",
  contractility: "CV_contractility",
} as const;

export type HeartControls = {-readonly [K in keyof typeof HEART_PARAMETERS]: number};

/** The heart of the reference physiology, which is what every run starts from. */
export const DEFAULT_HEART_CONTROLS: HeartControls = {
  hepatic: 1, systemic: 1, portal: 1, renal: 1, heartRate: 75, contractility: 1,
};

/** What the model was built for. A rate outside it is not a heart the equations describe. */
export const HEART_RATE_RANGE = {min: 40, max: 150} as const;

/** What the exported `config.json` of the compiled heart carries. */
export interface HeartConfig {
  readonly columns: readonly string[];
  readonly start: number;
  readonly end: number;
  /** When the controls of the table are applied, in minutes. */
  readonly intervention: number;
  readonly initial_heart_rate: number;
  /** How many beats before and after the intervention are summarized. */
  readonly summary_beats: number;
  /** The resolution of those beats, in seconds. */
  readonly summary_step_seconds: number;
  /**
   * How many points the whole run is read at. The export reads it at 15000, which is what a
   * published case is drawn from; a table which only shows the beats asks for fewer, because
   * every point is a row of 34 numbers the worker has to hand back.
   */
  readonly course_points?: number;
  /**
   * What is set before the model is initialised: the body weight and the height of the person
   * the table is solved for, which the organ volumes and the blood flows of the model follow.
   */
  readonly preinit?: readonly (readonly [string, number])[];
  readonly sbml_sha256?: string;
  readonly settings?: Readonly<Record<string, unknown>>;
}

/** The resolution of the whole run of a published case. */
export const COURSE_POINTS = 15000;

/** The controls with every value checked and the reference filled in for whatever is missing. */
export function normalizeHeartControls(controls: Partial<HeartControls> = {}): HeartControls {
  const values = {...DEFAULT_HEART_CONTROLS, ...controls} as HeartControls;
  for (const key of Object.keys(HEART_PARAMETERS) as (keyof HeartControls)[]) {
    const value = Number(values[key]);
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`The heart control ${key} must be finite and positive.`);
    }
    values[key] = value;
  }
  if (values.heartRate < HEART_RATE_RANGE.min || values.heartRate > HEART_RATE_RANGE.max) {
    throw new RangeError(
      `The heart rate must be between ${HEART_RATE_RANGE.min} and ${HEART_RATE_RANGE.max}/min.`,
    );
  }
  return values;
}

/**
 * The request of one run. The intervention sits at the end of a whole beat of the reference
 * heart, and the run ends after a whole number of beats of the new one, so neither stretch of
 * beats is cut in the middle. The output grid is coarse over the whole run and dense over the
 * two stretches that are summarized, which is what keeps the result small enough to post back.
 */
export function heartRequest(controls: Partial<HeartControls>, config: HeartConfig): SimulationRequest {
  const values = normalizeHeartControls(controls);
  const beforeStart = config.intervention - config.summary_beats / config.initial_heart_rate;
  const finalBeats = Math.floor((config.end - config.intervention) * values.heartRate + 1e-9);
  const end = config.intervention + finalBeats / values.heartRate;
  const afterStart = end - config.summary_beats / values.heartRate;
  const beforeSteps = Math.ceil((config.intervention - beforeStart) * 60 / config.summary_step_seconds);
  const afterSteps = Math.ceil((end - afterStart) * 60 / config.summary_step_seconds);
  const times = [...new Set([
    ...linspace(0, end, config.course_points ?? COURSE_POINTS),
    ...linspace(beforeStart, config.intervention, beforeSteps),
    ...linspace(afterStart, end, afterSteps),
    ...linspace(afterStart, end, 600),
    beforeStart, config.intervention, afterStart, end,
  ])].sort((left, right) => left - right);
  return {
    contract: "simulation/1",
    start: 0,
    end,
    output: {times},
    preinit: (config.preinit ?? []).map(([id, value]) => [id, value] as [string, number]),
    changes: [{
      time: config.intervention,
      values: (Object.keys(HEART_PARAMETERS) as (keyof HeartControls)[])
        .map(key => [HEART_PARAMETERS[key], values[key]] as const),
    }],
    steady_state: null,
    selections: config.columns,
    ...(config.settings === undefined ? {} : {settings: config.settings}),
  };
}

/** The first row at or after `target`, by binary search on a column that only grows. */
function lowerBound(values: ArrayLike<number>, target: number, column: number, width: number): number {
  let left = 0;
  let right = values.length / width;
  while (left < right) {
    const middle = Math.floor((left + right) / 2);
    if ((values[middle * width + column] ?? 0) < target - 1e-12) left = middle + 1;
    else right = middle;
  }
  return Math.min(left, values.length / width - 1);
}

/**
 * The summary of the beats between `start` and `end`. A mean is the integral over the stretch
 * divided by its length, not the mean of the samples, because the output grid is not uniform.
 */
function summarize(
  result: SimulationResult, start: number, end: number, heartRate: number, before: boolean,
): HeartSummary {
  const width = result.columns.length;
  const time = result.columns.indexOf("time");
  const first = lowerBound(result.values, start, time, width);
  let last = lowerBound(result.values, end, time, width);
  if (!before) {
    while (last + 1 < result.nRows
      && Math.abs((result.values[(last + 1) * width + time] ?? 0) - end) < 1e-12) last += 1;
  }
  const index = Object.fromEntries(result.columns.map((name, column) => [name, column]));
  const at = (row: number, name: string): number => result.values[row * width + (index[name] ?? 0)] ?? 0;
  const mean = (name: string): number => {
    let integral = 0;
    for (let row = first + 1; row <= last; row += 1) {
      const step = at(row, "time") - at(row - 1, "time");
      integral += 0.5 * step * (at(row, name) + at(row - 1, name));
    }
    return integral / (end - start);
  };
  let systolic = -Infinity;
  let diastolic = Infinity;
  for (let row = first; row <= last; row += 1) {
    const pressure = at(row, "CV_P_ar");
    systolic = Math.max(systolic, pressure);
    diastolic = Math.min(diastolic, pressure);
  }
  const flows = result.columns
    .filter(name => name === "CO" || name.startsWith("Q") || name.startsWith("CV_Q_"));
  return {
    arterial_systolic: systolic,
    arterial_diastolic: diastolic,
    mean_arterial_pressure: mean("CV_P_ar"),
    mean_portal_pressure: mean("CV_P_po"),
    mean_hepatic_pressure: mean("CV_P_li"),
    mean_cardiac_output: mean("CO"),
    mean_lung_flow: mean("Qlu"),
    stroke_volume: 1000 * mean("CO") / heartRate,
    heart_rate: heartRate,
    mean_hepatic_flow: mean("Qh"),
    mean_portal_flow: mean("Qpo"),
    mean_flows: Object.fromEntries(flows.map(name => [name, mean(name)])),
  };
}

/**
 * The case of one run, in the shape the exported cases have: the two summaries, the whole course
 * and the last beats. The times of a table are seconds and its ventricular volumes millilitres,
 * which is how they are read at the table, while the run itself is in minutes and litres.
 */
export function heartCase(
  result: SimulationResult, controls: Partial<HeartControls>, config: HeartConfig,
): HeartCase {
  const values = normalizeHeartControls(controls);
  const width = result.columns.length;
  const time = result.columns.indexOf("time");
  const end = result.values[(result.nRows - 1) * width + time] ?? config.end;
  const afterStart = end - config.summary_beats / values.heartRate;
  const table = (times: readonly number[], includeEvent = false): Series => {
    const rows = new Set(times.map(moment => lowerBound(result.values, moment, time, width)));
    if (includeEvent) {
      let event = lowerBound(result.values, config.intervention, time, width);
      while (event < result.nRows
        && Math.abs((result.values[event * width + time] ?? 0) - config.intervention) < 1e-12) {
        rows.add(event);
        event += 1;
      }
    }
    return {
      columns: result.columns,
      values: [...rows].sort((left, right) => left - right).map(row => result.columns.map((name, column) => {
        const value = result.values[row * width + column] ?? 0;
        const factor = name === "time" ? 60 : name === "CV_V_lv" || name === "CV_V_rv" ? 1000 : 1;
        return Number((value * factor).toFixed(5));
      })),
    };
  };
  const blood = result.columns.indexOf("CV_V_blood_total");
  const initial = result.values[blood] ?? 0;
  let error = 0;
  for (let row = 0; row < result.nRows; row += 1) {
    error = Math.max(error, Math.abs((result.values[row * width + blood] ?? 0) - initial));
  }
  return {
    id: "live",
    label: "The objects on the table",
    description: "The resistances, the rate and the contractility of the objects on the surface, "
      + "solved with SUNDIALS IDA on the compiled model.",
    changes: Object.fromEntries((Object.keys(HEART_PARAMETERS) as (keyof HeartControls)[])
      .map(key => [HEART_PARAMETERS[key], values[key]])),
    heart_rate: values.heartRate,
    series: table(linspace(0, end, 500), true),
    beats: table(linspace(afterStart, end, 600)),
    summary: {
      before: summarize(
        result, config.intervention - config.summary_beats / config.initial_heart_rate,
        config.intervention, config.initial_heart_rate, true,
      ),
      after: summarize(result, afterStart, end, values.heartRate, false),
      maximum_blood_volume_error: error,
    },
  };
}

/** One column of a table, which is how a course is plotted. */
export function heartColumn(table: Series, name: string): number[] {
  const column = table.columns.indexOf(name);
  if (column < 0) throw new Error(`The run has no column "${name}".`);
  return table.values.map(row => row[column] ?? 0);
}
