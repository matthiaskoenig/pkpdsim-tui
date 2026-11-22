/**
 * What the table says to somebody who walked up to it: who this person is and why the same
 * tablet does something different to them. The numbers at the edges stay as they are; this is
 * the sentence that says what they mean.
 */

import type {GlimepirideIndividual, Sex} from "@pkpdsim-tui/glimepiride-sim";
import {formatNumber, words} from "@pkpdsim-tui/tui-kit";
import type {Voice} from "@pkpdsim-tui/tui-kit";
import {GLIMEPIRIDE_TEXT} from "./text.ts";
import type {GlimepirideFacts} from "./text.ts";
import {categoryOf} from "./cards.ts";
import type {GlimepirideReadout} from "./cards.ts";

/** How far from the reference a number is, as a key the three languages each say their way. */
function times(value: number, reference: number): GlimepirideFacts["exposure"] {
  if (reference <= 0) return "same";
  const factor = value / reference;
  if (factor > 1.8) return "times";
  if (factor > 1.25) return "more";
  if (factor < 0.55) return "half";
  if (factor < 0.8) return "less";
  return "same";
}

/**
 * The sentence under the title: who is on the table, and what the drug does to them against the
 * person nothing was changed about.
 */
export function glimepirideReading(
  voice: Voice,
  individual: GlimepirideIndividual,
  sex: Sex,
  current: GlimepirideReadout,
  reference: GlimepirideReadout,
  referenceIndividual: GlimepirideIndividual,
  doses: number,
): string {
  const copy = voice.pick(GLIMEPIRIDE_TEXT);
  const who: string[] = [];
  if (individual.cyp2c9 < referenceIndividual.cyp2c9) {
    who.push(copy.slowly(categoryOf(voice, "cyp2c9", individual.cyp2c9)));
  }
  if (individual.cirrhosis > 0.02) {
    who.push(copy.cirrhotic(categoryOf(voice, "cirrhosis", individual.cirrhosis)));
  }
  if (individual.renal < referenceIndividual.renal - 1) {
    who.push(copy.kidneys(
      formatNumber(individual.renal, 0), categoryOf(voice, "renal", individual.renal)));
  }
  if (Math.abs(individual.weight - referenceIndividual.weight) > 1) {
    who.push(copy.weighs(formatNumber(individual.weight, 0)));
  }
  const factor = reference.pk.auc <= 0 ? 1 : current.pk.auc / reference.pk.auc;
  return copy.reading({
    sex: sex === "female" ? "female" : "male",
    weight: formatNumber(referenceIndividual.weight, 0),
    who,
    dose: Math.abs(individual.dose - referenceIndividual.dose) > 0.05
      ? copy.takesInstead(
        formatNumber(individual.dose, 1), formatNumber(referenceIndividual.dose, 0))
      : undefined,
    referenceDose: formatNumber(individual.dose, 0),
    exposure: times(current.pk.auc, reference.pk.auc),
    factor: formatNumber(factor, 1),
    // The model is solved in minutes, and a half life is spoken about in hours.
    half: current.pk.halflife > reference.pk.halflife * 1.2
      ? {
        now: formatNumber(current.pk.halflife / 60, 0),
        reference: formatNumber(reference.pk.halflife / 60, 0),
      }
      : undefined,
    doses,
  });
}

/** The body of the individual, as the switch in the panel offers it. */
export function bodyChoices(voice: Voice): {
  id: string; label: string; options: readonly {id: string; label: string}[];
} {
  const kit = words(voice);
  return {
    id: "sex", label: kit.bodySwitch,
    options: [{id: "female", label: kit.female}, {id: "male", label: kit.male}],
  };
}
