/**
 * The tangible vocabulary of the cardiovascular table: which object does what, over which range,
 * and how the objects on the surface become the controls of the model.
 */

import {DEFAULT_HEART_CONTROLS, defaultControls, HEART_RATE_RANGE} from "@pkpdsim-tui/cardio-sim";
import type {HeartControls, PressureControls, PressureReference} from "@pkpdsim-tui/cardio-sim";
import {valuesFromTokens} from "@pkpdsim-tui/tuio-input";
import type {TableToken, TokenRole} from "@pkpdsim-tui/tuio-input";

/**
 * The four resistances of the pressure network, on markers 1 to 4. The angle of the object is the
 * factor on the reference resistance: pointing up is the reference physiology, turning it to the
 * right obstructs, turning it to the left dilates. The scale is logarithmic, because a resistance
 * factor is a ratio.
 */
export const RESISTANCE_ROLES: readonly TokenRole[] = [
  {
    id: "hepatic", label: "Hepatic outflow", unit: "x", markers: [1],
    description: "Resistance of the hepatic veins. Obstruction raises the portal pressure, which is portal hypertension.",
    min: 0.5, max: 8, reference: 1, mode: "absolute", scale: "log", turns: 1,
  },
  {
    id: "systemic", label: "Systemic resistance", unit: "x", markers: [2],
    description: "Resistance of every systemic organ at once, the afterload of the heart.",
    min: 0.5, max: 2, reference: 1, mode: "absolute", scale: "log", turns: 1,
  },
  {
    id: "portal", label: "Portal vein", unit: "x", markers: [3],
    description: "Resistance of the portal vein between the splanchnic organs and the liver.",
    min: 0.5, max: 6, reference: 1, mode: "absolute", scale: "log", turns: 1,
  },
  {
    id: "renal", label: "Renal resistance", unit: "x", markers: [4],
    description: "Resistance of the kidneys, on top of the systemic resistance.",
    min: 0.5, max: 3, reference: 1, mode: "absolute", scale: "log", turns: 1,
  },
];

/**
 * The heart itself, on markers 5 and 6. These two are what the beating heart is solved with: the
 * rate it beats at and how hard the ventricles squeeze. The rate is linear, because a rate is
 * read off a scale in beats per minute and not as a ratio.
 */
export const HEART_ROLES: readonly TokenRole[] = [
  {
    id: "heartRate", label: "Heart rate", unit: "/min", markers: [5],
    description: "How often the heart beats. The beat on the table is the one the compiled heart "
      + "is solved with, so the numbers belong to that rate.",
    min: HEART_RATE_RANGE.min, max: HEART_RATE_RANGE.max,
    reference: DEFAULT_HEART_CONTROLS.heartRate, mode: "absolute", scale: "linear", turns: 1,
  },
  {
    id: "contractility", label: "Contractility", unit: "x", markers: [6],
    description: "How hard the ventricles squeeze. Turning it down is a heart which is failing: "
      + "it moves less blood with every beat.",
    min: 0.4, max: 1.6, reference: DEFAULT_HEART_CONTROLS.contractility,
    mode: "absolute", scale: "log", turns: 1,
  },
];

/** Every object of this table: the four resistances and the two of the heart. */
export const CARDIOVASCULAR_ROLES: readonly TokenRole[] = [...RESISTANCE_ROLES, ...HEART_ROLES];

/**
 * The controls the beating heart is solved with. A role without an object keeps the reference,
 * which is the heart of the individual at rest.
 */
export function heartControlsFromTokens(
  roles: readonly TokenRole[],
  tokens: ReadonlyMap<number, TableToken>,
  origins: ReadonlyMap<number, number> = new Map(),
): HeartControls {
  const values = valuesFromTokens(roles, tokens, origins);
  return {
    hepatic: values.get("hepatic") ?? DEFAULT_HEART_CONTROLS.hepatic,
    systemic: values.get("systemic") ?? DEFAULT_HEART_CONTROLS.systemic,
    portal: values.get("portal") ?? DEFAULT_HEART_CONTROLS.portal,
    renal: values.get("renal") ?? DEFAULT_HEART_CONTROLS.renal,
    heartRate: values.get("heartRate") ?? DEFAULT_HEART_CONTROLS.heartRate,
    contractility: values.get("contractility") ?? DEFAULT_HEART_CONTROLS.contractility,
  };
}

/**
 * The controls of the model under the objects on the surface. A role without an object keeps the
 * reference value, so lifting an object is how a control is undone. `origins` holds the
 * accumulated angle at which each object was put down, which only a relative role uses.
 */
export function controlsFromTokens(
  roles: readonly TokenRole[],
  tokens: ReadonlyMap<number, TableToken>,
  reference: PressureReference,
  origins: ReadonlyMap<number, number> = new Map(),
): PressureControls {
  const base = defaultControls(reference);
  const values = valuesFromTokens(roles, tokens, origins);
  return {
    hepatic: values.get("hepatic") ?? base.hepatic,
    systemic: values.get("systemic") ?? base.systemic,
    portal: values.get("portal") ?? base.portal,
    renal: values.get("renal") ?? base.renal,
    arterial: base.arterial,
    venous: base.venous,
  };
}
