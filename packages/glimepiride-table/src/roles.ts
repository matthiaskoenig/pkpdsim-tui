/**
 * The tangible vocabulary of the glimepiride table: one object per property of the individual,
 * and one dial for how many daily tablets are taken.
 *
 * Every dial reads absolutely, so the orientation of the object is the value and a printed scale
 * around it tells the truth. Where the reference individual sits at one end of the range, for
 * example a creatinine clearance that cannot be better than normal, the dial has half a span and
 * the table draws only that half.
 */

import {GLIMEPIRIDE_CONTROLS, GLIMEPIRIDE_DOSES, REFERENCE_BODIES} from "@pkpdsim-tui/glimepiride-sim";
import type {GlimepirideControl, Sex} from "@pkpdsim-tui/glimepiride-sim";
import type {Voice} from "@pkpdsim-tui/tui-kit";
import type {TokenRole} from "@pkpdsim-tui/tuio-input";
import {GLIMEPIRIDE_TEXT} from "./text.ts";

/** The marker of the dial of the tablets, which is the only object that is not a property. */
export const DOSE_COUNT_MARKER = 3;

/** One dial of the individual, in the words of the visitor. */
function dial(
  control: GlimepirideControl, marker: number, id: "dose" | "cyp2c9" | "cirrhosis" | "renal" | "weight",
  voice: Voice,
): TokenRole {
  const copy = voice.pick(GLIMEPIRIDE_TEXT);
  return {
    id: control.id, label: voice.say(copy.roles[id].label), unit: control.unit, markers: [marker],
    description: voice.say(copy.roles[id].info),
    min: control.min, max: control.max, reference: control.value,
    mode: "absolute", scale: "linear", turns: 1,
  };
}

/** The dials of the individual. The body of the reference moves the detent of the weight dial. */
export function individualRoles(voice: Voice, sex: Sex = "male"): readonly TokenRole[] {
  const roles: readonly TokenRole[] = [
    dial(GLIMEPIRIDE_CONTROLS.dose, 1, "dose", voice),
    dial(GLIMEPIRIDE_CONTROLS.weight, 2, "weight", voice),
    dial(GLIMEPIRIDE_CONTROLS.cyp2c9, 4, "cyp2c9", voice),
    dial(GLIMEPIRIDE_CONTROLS.cirrhosis, 5, "cirrhosis", voice),
    dial(GLIMEPIRIDE_CONTROLS.renal, 6, "renal", voice),
  ];
  return roles.map(role => (role.id === GLIMEPIRIDE_CONTROLS.weight.id
    ? {...role, reference: REFERENCE_BODIES[sex].weight}
    : role));
}

/**
 * The dial of the tablets: one every morning, for up to ten mornings. It reads absolutely, so
 * the orientation of the object is how long the person is on the drug.
 */
export function doseCountRole(voice: Voice): TokenRole {
  const copy = voice.pick(GLIMEPIRIDE_TEXT).roles.doses;
  return {
    id: "doses", label: voice.say(copy.label), unit: "", markers: [DOSE_COUNT_MARKER],
    description: voice.say(copy.info),
    min: GLIMEPIRIDE_DOSES.min, max: GLIMEPIRIDE_DOSES.max, reference: GLIMEPIRIDE_DOSES.value,
    mode: "absolute", scale: "linear", turns: 1,
  };
}

/** The objects of the table, in the order of their markers, which is how the panel lists them. */
export function glimepirideRoles(voice: Voice, sex: Sex = "male"): readonly TokenRole[] {
  const [dose, weight, ...rest] = individualRoles(voice, sex);
  return [...(dose === undefined ? [] : [dose]), ...(weight === undefined ? [] : [weight]),
    doseCountRole(voice), ...rest];
}

/** The markers this table reads, which the input layer needs before a word is said. */
export const GLIMEPIRIDE_MARKERS: readonly number[] = [1, 2, DOSE_COUNT_MARKER, 4, 5, 6];
