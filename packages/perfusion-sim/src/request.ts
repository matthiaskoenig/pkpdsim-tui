/**
 * The request of one perfusion. The temperature is an initial assignment of the model, which is
 * why every setting is given before the initial values are resolved rather than as a change.
 */

import {linspace} from "@pkpdsim-tui/core-runtime";
import type {SimulationRequest} from "@pkpdsim-tui/core-runtime";
import {parametersOf} from "./settings.ts";
import type {PerfusionSettings} from "./settings.ts";

/** What the table reads out of a perfusion. */
export const PERFUSION_COLUMNS: readonly string[] = [
  "time", "pO2_in", "pO2_out", "pO2_pp", "pO2_pc", "bile_rate", "f_alive_z1", "f_alive_z2",
  "f_alive_z3", "f_alive_z4", "f_alive_pc", "alt_act_res", "[lac_res]", "[glc_res]", "pH_res",
];

/** Six hours of perfusion, in minutes, which is a long run on a machine. */
export const PERFUSION_SIMULATION = {start: 0, end: 360, points: 181} as const;

/** The settings of the solver, the same ones the exported examples of pkpdsim are run with. */
export const SOLVER_SETTINGS: Readonly<Record<string, unknown>> = {
  absolute_tolerance: {scalar: 1e-10},
  relative_tolerance: 1e-8,
  maximum_num_steps: 1_000_000,
  initial_time_step: 0,
  maximum_time_step: 0,
  stiff: true,
  linear_solver: "auto",
  jacobian: "auto",
};

export function perfusionRequest(
  settings: Partial<PerfusionSettings> = {},
  columns: readonly string[] = PERFUSION_COLUMNS,
): SimulationRequest {
  const {start, end, points} = PERFUSION_SIMULATION;
  return {
    contract: "simulation/1",
    start,
    end,
    output: {times: linspace(start, end, points - 1)},
    preinit: parametersOf(settings),
    changes: [],
    steady_state: null,
    selections: columns,
    settings: SOLVER_SETTINGS,
  };
}
