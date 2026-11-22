/**
 * The request of one glimepiride course. The individual is set before the initial values are
 * resolved, which is how an oral dose is given: the tablet is in the intestine when the clock
 * starts.
 */

import {linspace} from "@pkpdsim-tui/core-runtime";
import type {SimulationRequest, TimedChange} from "@pkpdsim-tui/core-runtime";
import {GLIMEPIRIDE_CONTROLS, heightOf, parametersOf} from "./individual.ts";
import type {GlimepirideIndividual} from "./individual.ts";

/**
 * The columns the table reads: the plasma, what leaves in the urine and in the faeces, and the
 * amount of the drug in every part of the body, which is in millimoles because the species of
 * the model are. A part which is a whole organ in the model is read as its own states: the
 * lumen of the gut is the tablet which has not been taken up, the liver is the hepatocytes and
 * the plasma of the organ together.
 */
export const GLIMEPIRIDE_COLUMNS: readonly string[] = [
  "time", "[Cve_gli]", "[Cve_m1]", "[Cve_m2]", "[Cve_m1_m2]", "Aurine_m1_m2", "Afeces_gli",
  "PODOSE_gli", "Mr_gli", "Afeces_m1", "Afeces_m2",
  "GU__gli_stomach",
  // Only the tablet is swallowed, so only it has a stomach to dissolve in.
  ...["gli", "m1", "m2"].flatMap(drug => [
    `GU__${drug}_lumen`, `Cgu_plasma_${drug}`,
    `LI__${drug}`, `Cli_plasma_${drug}`, `Cki_plasma_${drug}`,
    `Clu_${drug}`, `Clu_plasma_${drug}`, `Cre_${drug}`, `Cre_plasma_${drug}`,
    `Cve_${drug}`, `Car_${drug}`, `Cpo_${drug}`, `Chv_${drug}`,
  ]),
];

/** How many daily tablets the table can give, which is one object of it. */
export const GLIMEPIRIDE_DOSES = {min: 1, max: 10, value: 1} as const;

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

/**
 * One course of the individual: a tablet every morning for as many mornings as asked for, and
 * one more day after the last of them, which is where a course of a drug is read. A further
 * tablet is the dose put back into the stomach on that day, which is what swallowing one is.
 */
export function glimepirideRequest(
  individual: Partial<GlimepirideIndividual> = {},
  height: number = heightOf(),
  columns: readonly string[] = GLIMEPIRIDE_COLUMNS,
  doses: number = GLIMEPIRIDE_DOSES.value,
): SimulationRequest {
  const {start} = GLIMEPIRIDE_SIMULATION;
  const days = Math.min(
    GLIMEPIRIDE_DOSES.max, Math.max(GLIMEPIRIDE_DOSES.min, Math.round(doses)));
  const day = 24 * 60;
  const end = (days + 1) * day;
  // Enough points for the peak of the first hours, and not so many that ten days of them are
  // a path the surface has to draw twice a second.
  const points = Math.min(721, Math.max(241, (days + 1) * 72));
  const dose = individual.dose ?? GLIMEPIRIDE_CONTROLS.dose.value;
  const changes: TimedChange[] = Array.from({length: days - 1}, (_unused, index) => ({
    time: (index + 1) * day,
    values: [[GLIMEPIRIDE_CONTROLS.dose.parameter, dose] as const],
  }));
  return {
    contract: "simulation/1",
    start,
    end,
    output: {times: linspace(start, end, points - 1)},
    preinit: parametersOf(individual, height),
    changes,
    steady_state: null,
    selections: columns,
    settings: SOLVER_SETTINGS,
  };
}
