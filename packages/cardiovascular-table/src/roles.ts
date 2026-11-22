/**
 * The tangible vocabulary of the cardiovascular table: which object does what, over which range,
 * and how the objects on the surface become the controls of the model.
 */

import {DEFAULT_HEART_CONTROLS, defaultControls, HEART_RATE_RANGE} from "@pkpdsim-tui/cardio-sim";
import type {HeartControls, PressureControls, PressureReference} from "@pkpdsim-tui/cardio-sim";
import {namedRole} from "@pkpdsim-tui/tui-kit";
import type {Voice} from "@pkpdsim-tui/tui-kit";
import {valuesFromTokens} from "@pkpdsim-tui/tuio-input";
import type {TableToken, TokenRole} from "@pkpdsim-tui/tuio-input";
import {CARDIO_TEXT} from "./text.ts";

/**
 * Every object of this table, in the words of the visitor and in the order they are picked up:
 * the heart on 1 and 2, the vessels of the whole body on 3, and the liver, the kidneys and the
 * gut on 4 to 6. The angle of an object is the
 * factor on the reference value, the scale of a resistance is logarithmic because it is a ratio,
 * and the rate is linear because a rate is read off a scale in beats a minute.
 */
export function cardiovascularRoles(voice: Voice): readonly TokenRole[] {
  const copy = voice.pick(CARDIO_TEXT).roles;
  const dial = (
    id: keyof typeof copy, markers: readonly number[], unit: string,
    min: number, max: number, reference: number, scale: "log" | "linear",
  ): TokenRole => namedRole(
    copy[id], voice, {id, unit, markers, min, max, reference}, {scale});
  // The heart first, because it is what drives everything else, then the vessels of the whole
  // body. Three objects, and each of them changes the whole picture: how fast the heart beats,
  // how hard it squeezes, and how open the vessels of the body are. The resistances of single
  // organs were the ones nobody turned without being told to.
  return [
    dial("heartRate", [1], "/min", HEART_RATE_RANGE.min, HEART_RATE_RANGE.max,
      DEFAULT_HEART_CONTROLS.heartRate, "linear"),
    dial("contractility", [2], "x", 0.4, 1.6, DEFAULT_HEART_CONTROLS.contractility, "log"),
    dial("systemic", [3], "x", 0.5, 2, 1, "log"),
  ];
}

/** The markers this table reads, which the input layer needs before a word is said. */
export const CARDIOVASCULAR_MARKERS: readonly number[] = [1, 2, 3];

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
    hepatic: DEFAULT_HEART_CONTROLS.hepatic,
    systemic: values.get("systemic") ?? DEFAULT_HEART_CONTROLS.systemic,
    portal: DEFAULT_HEART_CONTROLS.portal,
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
    hepatic: base.hepatic,
    systemic: values.get("systemic") ?? base.systemic,
    portal: base.portal,
    renal: values.get("renal") ?? base.renal,
    arterial: base.arterial,
    venous: base.venous,
  };
}
