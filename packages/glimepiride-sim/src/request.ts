/**
 * The request of one glimepiride course. The individual is set before the initial values are
 * resolved, which is how an oral dose is given: the tablet is in the intestine when the clock
 * starts.
 */

import {linspace} from "@pkpdsim-tui/core-runtime";
import type {SimulationRequest} from "@pkpdsim-tui/core-runtime";
import {parametersOf} from "./individual.ts";
import type {Sex} from "./individual.ts";
import type {GlimepirideIndividual} from "./individual.ts";

/** The columns the table reads: the plasma, what leaves in the urine and in the faeces. */
export const GLIMEPIRIDE_COLUMNS: readonly string[] = [
  "time", "[Cve_gli]", "[Cve_m1]", "[Cve_m2]", "[Cve_m1_m2]", "Aurine_m1_m2", "Afeces_gli",
];

/** The run the table asks for: fifty hours after the dose, read every ten minutes. */
export const GLIMEPIRIDE_SIMULATION = {
  start: 0,
  /** Fifty hours in minutes, the window the marimo application of the model uses. */
  end: 3000,
  points: 301,
} as const;

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

export function glimepirideRequest(
  individual: Partial<GlimepirideIndividual> = {},
  sex: Sex = "male",
  columns: readonly string[] = GLIMEPIRIDE_COLUMNS,
): SimulationRequest {
  const {start, end, points} = GLIMEPIRIDE_SIMULATION;
  return {
    contract: "simulation/1",
    start,
    end,
    output: {times: linspace(start, end, points - 1)},
    preinit: parametersOf(individual, sex),
    changes: [],
    steady_state: null,
    selections: columns,
    settings: SOLVER_SETTINGS,
  };
}
