/**
 * The tangible vocabulary of the glimepiride table: one object per property of the individual,
 * and one dial for how many daily tablets are taken.
 *
 * Every dial reads absolutely, so the orientation of the object is the value and a printed scale
 * around it tells the truth. Where the reference individual sits at one end of the range, for
 * example a creatinine clearance that cannot be better than normal, the dial has half a span and
 * the table draws only that half.
 */

import {individualOf, renalFactor} from "@pkpdsim-tui/cardio-sim";
import {
  GLIMEPIRIDE_CONTROLS, GLIMEPIRIDE_DOSE_STEPS, GLIMEPIRIDE_DOSES, NORMAL_CRCL, startingDose,
} from "@pkpdsim-tui/glimepiride-sim";
import type {GlimepirideControl} from "@pkpdsim-tui/glimepiride-sim";
import {namedRole} from "@pkpdsim-tui/tui-kit";
import type {TableIndividual, Voice} from "@pkpdsim-tui/tui-kit";
import type {TokenRole} from "@pkpdsim-tui/tuio-input";
import {GLIMEPIRIDE_TEXT} from "./text.ts";

/** The marker of the dial of the tablets, which is the only object that is not a property. */
export const DOSE_COUNT_MARKER = 3;

/** One dial of the individual, in the words of the visitor. */
function dial(
  control: GlimepirideControl, marker: number,
  id: "dose" | "absorption" | "cyp2c9" | "cirrhosis" | "renal",
  voice: Voice, steps?: readonly number[],
): TokenRole {
  return namedRole(voice.pick(GLIMEPIRIDE_TEXT).roles[id], voice, {
    id: control.id, unit: control.unit,
    min: control.min, max: control.max, reference: control.value, markers: [marker],
  }, steps === undefined ? {} : {steps});
}

/**
 * The dials of the individual, for the person at the table. They walk the drug through the
 * body in the order it takes: the tablet and how fast it dissolves, then the liver which takes
 * it apart, then the kidneys which wash the pieces out. The body itself is no object here, it
 * is the person the whole collection is set to.
 *
 * Two of the dials rest where that person puts them: the dose is what a body of their weight
 * is started on, and the clearance of the kidneys rests where the years have left it, because
 * the kidneys of a body of ninety are not the kidneys of a body of thirty.
 */
export function individualRoles(
  voice: Voice, person: TableIndividual = individualOf(),
): readonly TokenRole[] {
  const roles: readonly TokenRole[] = [
    dial({...GLIMEPIRIDE_CONTROLS.dose, value: startingDose(person.weight)}, 1, "dose", voice,
      GLIMEPIRIDE_DOSE_STEPS),
    dial(GLIMEPIRIDE_CONTROLS.absorption, 2, "absorption", voice),
    dial(GLIMEPIRIDE_CONTROLS.cyp2c9, 4, "cyp2c9", voice),
    dial(GLIMEPIRIDE_CONTROLS.cirrhosis, 5, "cirrhosis", voice),
    dial({
      ...GLIMEPIRIDE_CONTROLS.renal,
      value: NORMAL_CRCL * renalFactor(person.age, person.sex),
    }, 6, "renal", voice),
  ];
  return roles;
}

/**
 * The dial of the tablets: one every morning, for up to ten mornings. It reads absolutely, so
 * the orientation of the object is how long the person is on the drug.
 */
export function doseCountRole(voice: Voice): TokenRole {
  return namedRole(voice.pick(GLIMEPIRIDE_TEXT).roles.doses, voice, {
    id: "doses", unit: "", markers: [DOSE_COUNT_MARKER],
    min: GLIMEPIRIDE_DOSES.min, max: GLIMEPIRIDE_DOSES.max, reference: GLIMEPIRIDE_DOSES.value,
  });
}

/** The objects of the table, in the order of their markers, which is how the panel lists them. */
export function glimepirideRoles(
  voice: Voice, person: TableIndividual = individualOf(),
): readonly TokenRole[] {
  const [dose, absorption, ...rest] = individualRoles(voice, person);
  return [...(dose === undefined ? [] : [dose]),
    ...(absorption === undefined ? [] : [absorption]),
    doseCountRole(voice), ...rest];
}

/** The markers this table reads, which the input layer needs before a word is said. */
export const GLIMEPIRIDE_MARKERS: readonly number[] = [1, 2, DOSE_COUNT_MARKER, 4, 5, 6];
