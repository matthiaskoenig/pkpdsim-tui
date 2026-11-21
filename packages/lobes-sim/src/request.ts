/**
 * The request of one run of a lobed liver, ported from `lobes-solver.mjs` of the pkpdsim
 * documentation without changing what it asks for.
 *
 * A surgery at time zero is applied before the initial values are resolved, which is how a study
 * that simulates only the days after an operation sets it up. A later one is a change of the
 * running model, which is a surgery at a time point.
 */

import {linspace} from "@pkpdsim-tui/core-runtime";
import type {SimulationRequest, TimedChange, ValueChange} from "@pkpdsim-tui/core-runtime";
import type {LobeConfig} from "./types.ts";

/** The marker drug the exported runs give the individual. */
export const DOSE_PARAMETER = "IVDOSE_drg";

export interface LobeControl {
  readonly parameter: string | null;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly value: number;
}

export const LOBE_CONTROLS = {
  habrGain: {parameter: "habr_gain", label: "buffer response gain", min: 0, max: 0.6, step: 0.005, value: 0.255},
  growth: {parameter: "k_growth", label: "growth constant [1/min]", min: 0, max: 0.002, step: 0.00005, value: 0.0005},
  surgery: {parameter: null, label: "time of the surgery [days]", min: 0, max: 4, step: 0.25, value: 0},
} as const satisfies Record<string, LobeControl>;

export type LobeControls = {-readonly [K in keyof typeof LOBE_CONTROLS]: number};

/** The controls with every value checked and the defaults filled in. */
export function normalizeControls(controls: Partial<LobeControls> = {}): LobeControls {
  const values = {} as LobeControls;
  for (const [key, control] of Object.entries(LOBE_CONTROLS) as [keyof LobeControls, LobeControl][]) {
    const value = Number(controls[key] ?? control.value);
    if (!Number.isFinite(value)) throw new RangeError(`The control ${key} must be a finite number.`);
    if (value < control.min || value > control.max) {
      throw new RangeError(`The control ${key} must be between ${control.min} and ${control.max}.`);
    }
    values[key] = value;
  }
  return values;
}

export function lobeRequest(
  controls: Partial<LobeControls>,
  changes: Readonly<Record<string, number>>,
  config: LobeConfig,
): SimulationRequest {
  const values = normalizeControls(controls);
  const surgery = values.surgery * 24 * 60;
  const settings: ValueChange[] = [
    [LOBE_CONTROLS.habrGain.parameter, values.habrGain],
    [LOBE_CONTROLS.growth.parameter, values.growth],
  ];
  const intervention: ValueChange[] = Object.entries(changes);
  const times = [...new Set([
    ...linspace(config.start, config.end, Math.max(config.points - 1, 1)),
    ...(surgery > config.start && surgery < config.end ? [surgery, surgery * (1 + 1e-9)] : []),
  ])].sort((left, right) => left - right);
  const timed: TimedChange[] = surgery > config.start && intervention.length > 0
    ? [{time: surgery, values: intervention}]
    : [];
  return {
    contract: "simulation/1",
    start: config.start,
    end: config.end,
    output: {times},
    preinit: [
      [DOSE_PARAMETER, config.dose],
      ...settings,
      ...(surgery <= config.start ? intervention : []),
    ],
    changes: timed,
    steady_state: null,
    selections: config.columns,
    settings: config.settings,
  };
}
