/**
 * The tangible vocabulary of the glimepiride table: one object per property of the individual,
 * and one dial for the hours after the dose.
 *
 * Every dial reads absolutely, so the orientation of the object is the value and a printed scale
 * around it tells the truth. Where the reference individual sits at one end of the range, for
 * example a creatinine clearance that cannot be better than normal, the dial has half a span and
 * the table draws only that half.
 */

import {GLIMEPIRIDE_CONTROLS} from "@pkpdsim-tui/glimepiride-sim";
import type {GlimepirideControl} from "@pkpdsim-tui/glimepiride-sim";
import type {TokenRole} from "@pkpdsim-tui/tuio-input";

/** The marker of the dial of the hours, which is the only object that is not a property. */
export const HOUR_MARKER = 8;

function dial(control: GlimepirideControl, marker: number, description: string): TokenRole {
  return {
    id: control.id, label: control.label, unit: control.unit, markers: [marker], description,
    min: control.min, max: control.max, reference: control.value,
    mode: "absolute", scale: "linear", turns: 1,
  };
}

export const INDIVIDUAL_ROLES: readonly TokenRole[] = [
  dial(GLIMEPIRIDE_CONTROLS.dose, 1,
    "The tablet the individual takes. The table gives the reference dose while the object is off the surface."),
  dial(GLIMEPIRIDE_CONTROLS.cyp2c9, 2,
    "The activity of CYP2C9, which makes M1 out of glimepiride. Turning it down is a poor metabolizer."),
  dial(GLIMEPIRIDE_CONTROLS.cirrhosis, 3,
    "How cirrhotic the liver is, from healthy to Child-Pugh C."),
  dial(GLIMEPIRIDE_CONTROLS.renal, 4,
    "What the kidneys still clear. The metabolites leave in the urine, so impairment holds them back."),
  dial(GLIMEPIRIDE_CONTROLS.weight, 5,
    "The body weight, which scales the organs and the blood flows of the individual."),
];

/**
 * The dial of the hours. It is relative and starts at the end of the course wherever it is put
 * down, so it is wound backwards towards the dose. Half a turn covers the whole course.
 */
export function hourRole(hours: number): TokenRole {
  return {
    id: "hour", label: "Hours after the dose", unit: "h", markers: [HOUR_MARKER],
    description: "Turn it back to walk from the end of the course to the moment of the dose.",
    min: 0, max: hours, reference: hours, mode: "relative", scale: "linear", turns: 1,
  };
}

export function glimepirideRoles(hours: number): readonly TokenRole[] {
  return [...INDIVIDUAL_ROLES, hourRole(hours)];
}
