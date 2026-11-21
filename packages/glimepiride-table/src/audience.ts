/**
 * What the table says to somebody who walked up to it: who this person is and why the same
 * tablet does something different to them. The numbers at the edges stay as they are; this is
 * the sentence that says what they mean.
 */

import type {GlimepirideIndividual, Sex} from "@pkpdsim-tui/glimepiride-sim";
import {formatNumber} from "@pkpdsim-tui/tui-kit";
import {categoryOf} from "./cards.ts";
import type {GlimepirideReadout} from "./cards.ts";

export const GLIMEPIRIDE_TITLE = "One tablet, two people";

/** The note behind the title: what this table is, for the visitor who asks. */
export const GLIMEPIRIDE_ABOUT = "Glimepiride lowers blood sugar in type 2 diabetes. The liver "
  + "takes it apart into M1 and M2, and the kidneys wash those out. Set who the person is, and "
  + "the same tablet does something else. The course is solved from the glimepiride model of "
  + "pkpdsim for the person on the table.";

export const GLIMEPIRIDE_TRIES: readonly string[] = [
  "Turn 2 down: this person breaks the drug down slowly, and it piles up.",
  "Wind dial 8 back through the first hours after the tablet.",
];

/** How far from the reference a number is, in the words somebody uses about their own dose. */
function times(value: number, reference: number): string {
  if (reference <= 0) return "";
  const factor = value / reference;
  if (factor > 1.8) return `${formatNumber(factor, 1)} times as much`;
  if (factor > 1.25) return "noticeably more";
  if (factor < 0.55) return "about half as much";
  if (factor < 0.8) return "noticeably less";
  return "about as much";
}

/**
 * The sentence under the title: who is on the table, and what the drug does to them against the
 * person nothing was changed about.
 */
export function glimepirideReading(
  individual: GlimepirideIndividual,
  sex: Sex,
  current: GlimepirideReadout,
  reference: GlimepirideReadout,
  referenceIndividual: GlimepirideIndividual,
): string {
  const who: string[] = [];
  if (individual.cyp2c9 < referenceIndividual.cyp2c9) {
    who.push(`breaks glimepiride down slowly (${categoryOf("cyp2c9", individual.cyp2c9)})`);
  }
  if (individual.cirrhosis > 0.02) {
    who.push(`has a cirrhotic liver (${categoryOf("cirrhosis", individual.cirrhosis)})`);
  }
  if (individual.renal < referenceIndividual.renal - 1) {
    who.push(`has kidneys that clear ${formatNumber(individual.renal, 0)} ml/min `
      + `(${categoryOf("renal", individual.renal)})`);
  }
  if (Math.abs(individual.weight - referenceIndividual.weight) > 1) {
    who.push(`weighs ${formatNumber(individual.weight, 0)} kg`);
  }
  const dose = Math.abs(individual.dose - referenceIndividual.dose) > 0.05
    ? `takes ${formatNumber(individual.dose, 1)} mg instead of `
      + `${formatNumber(referenceIndividual.dose, 0)} mg`
    : "";
  const body = `A ${sex === "female" ? "woman" : "man"} of `
    + `${formatNumber(referenceIndividual.weight, 0)} kg`;
  if (who.length === 0 && dose === "") {
    return `${body} takes ${formatNumber(individual.dose, 0)} mg of glimepiride.`;
  }
  // Two things at once are as much as a sentence carries; the objects on the table say the rest.
  const parts = [...(dose === "" ? [] : [dose]), ...who].slice(0, 2);
  const sentence = parts.length === 1 ? parts[0] : `${parts[0]} and ${parts[1]}`;
  const exposure = times(current.pk.auc, reference.pk.auc);
  // The model is solved in minutes, and a half life is spoken about in hours.
  const half = current.pk.halflife > reference.pk.halflife * 1.2
    ? ` It also stays in the blood longer: half of it is gone after `
      + `${formatNumber(current.pk.halflife / 60, 0)} hours instead of `
      + `${formatNumber(reference.pk.halflife / 60, 0)}.`
    : "";
  return `${body} who ${sentence}: ${exposure} of the drug in the blood as the person nobody `
    + `changed.${half}`;
}

/** The body of the individual, as the switch in the panel offers it. */
export const BODY_CHOICES = {
  id: "sex", label: "Body",
  options: [{id: "male", label: "Male"}, {id: "female", label: "Female"}],
} as const;
