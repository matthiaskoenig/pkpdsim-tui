/**
 * What the table says to somebody who walked up to it: whose circulation this is and what the
 * objects did to it. The numbers at the edges stay as they are; this is the sentence that says
 * what they mean.
 */

import {DEFAULT_HEART_CONTROLS} from "@pkpdsim-tui/cardio-sim";
import type {HeartControls, HeartSummary} from "@pkpdsim-tui/cardio-sim";
import {formatNumber} from "@pkpdsim-tui/tui-kit";

export const CARDIO_TITLE = "The circulation";

/** The note behind the title: what this table is, for the visitor who asks. */
export const CARDIO_ABOUT = "The heart pushes five to six litres of blood through the body every "
  + "minute. Narrow a vessel or change the beat, and the pressures and the flows of the whole "
  + "body settle somewhere new within a few beats. Every number here is solved from the "
  + "circulation model of pkpdsim while you turn the objects.";

export const CARDIO_TRIES: readonly string[] = [
  "Turn 1 up: the blood cannot leave the liver, and the pressure in front of it rises.",
  "Turn 5 up: the heart beats faster, and the ventricle empties and fills with it.",
];

/** How a blood pressure is spoken about: the two numbers of a cuff. */
export function bloodPressure(summary: HeartSummary): string {
  return `${formatNumber(summary.arterial_systolic, 0)}/`
    + `${formatNumber(summary.arterial_diastolic, 0)} mmHg`;
}

/**
 * The sentence under the title: whose heart this is, what was done to the circulation, and what
 * the body made of it.
 */
export function cardioReading(
  controls: HeartControls,
  sex: "male" | "female",
  summary: HeartSummary,
  reference: HeartSummary,
): string {
  const body = sex === "female" ? "A woman of 60 kg" : "A man of 73 kg";
  const done: string[] = [];
  if (controls.hepatic > 1.05) done.push("the liver cannot let the blood out");
  if (controls.hepatic < 0.95) done.push("the liver lets the blood out more easily");
  if (controls.portal > 1.05) done.push("the portal vein is narrowed");
  if (controls.systemic > 1.05) done.push("the vessels of the body are narrowed");
  if (controls.systemic < 0.95) done.push("the vessels of the body are wide open");
  if (controls.renal > 1.05) done.push("the kidneys get less blood");
  if (Math.abs(controls.heartRate - DEFAULT_HEART_CONTROLS.heartRate) > 1) {
    done.push(`the heart beats ${formatNumber(controls.heartRate, 0)} times a minute`);
  }
  if (controls.contractility < 0.95) done.push("the heart squeezes weakly");
  if (controls.contractility > 1.05) done.push("the heart squeezes harder");

  const pressure = `${bloodPressure(summary)}, `
    + `${formatNumber(summary.mean_cardiac_output, 1)} litres a minute.`;
  if (done.length === 0) return `${body} at rest: ${pressure}`;
  // Two things at once are as much as a sentence carries; the objects on the table say the rest.
  const first = done.slice(0, 2);
  const sentence = first.length === 1 ? first[0] : `${first[0]} and ${first[1]}`;
  // What a visitor should take away from an obstructed liver: the blood backs up in front of
  // it. The portal pressure is the number that says so, and a few mmHg above the reference is
  // where a clinician starts calling it portal hypertension.
  const portal = summary.mean_portal_pressure;
  const liver = portal > reference.mean_portal_pressure + 4
    ? ` The blood backs up in front of the liver: ${formatNumber(portal, 0)} mmHg in the portal `
      + "vein, which is portal hypertension."
    : "";
  return `${body} in whom ${sentence}: ${pressure}${liver}`;
}
