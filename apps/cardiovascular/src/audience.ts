/**
 * What the table says to somebody who walked up to it: whose circulation this is and what the
 * objects did to it. The numbers at the edges stay as they are; this is the sentence that says
 * what they mean.
 */

import {DEFAULT_HEART_CONTROLS} from "@pkpdsim-tui/cardio-sim";
import type {HeartControls, HeartSummary} from "@pkpdsim-tui/cardio-sim";
import {formatNumber} from "@pkpdsim-tui/tui-kit";

export const CARDIO_TITLE = "The circulation, beat by beat";

export const CARDIO_ABOUT = "The heart pushes five to six litres of blood through the body every "
  + "minute. Narrow a vessel or change the beat, and the pressures and the flows settle "
  + "somewhere new within a few beats.";

export const CARDIO_TRIES: readonly string[] = [
  "Turn the hepatic outflow up: the blood cannot leave the liver, and the pressure in front of it rises.",
  "Turn the heart rate dial and watch the ventricle beside the heart empty and fill faster.",
  "Take the contractility down to a failing heart and see how much blood a beat still moves.",
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
  if (controls.hepatic > 1.05) {
    done.push(`the veins which drain the liver are ${formatNumber(controls.hepatic, 1)} times as narrow`);
  }
  if (controls.hepatic < 0.95) done.push("the veins which drain the liver are wider than normal");
  if (controls.portal > 1.05) {
    done.push(`the portal vein is ${formatNumber(controls.portal, 1)} times as narrow`);
  }
  if (controls.systemic > 1.05) done.push("the vessels of the body are narrowed");
  if (controls.systemic < 0.95) done.push("the vessels of the body are wide open");
  if (controls.renal > 1.05) done.push("the kidneys are getting less blood");
  if (Math.abs(controls.heartRate - DEFAULT_HEART_CONTROLS.heartRate) > 1) {
    done.push(`the heart beats ${formatNumber(controls.heartRate, 0)} times a minute instead of `
      + `${formatNumber(DEFAULT_HEART_CONTROLS.heartRate, 0)}`);
  }
  if (controls.contractility < 0.95) done.push("the heart squeezes more weakly");
  if (controls.contractility > 1.05) done.push("the heart squeezes harder");

  const pressure = `The blood pressure is ${bloodPressure(summary)} and the heart moves `
    + `${formatNumber(summary.mean_cardiac_output, 1)} litres a minute.`;
  if (done.length === 0) {
    return `${body} at rest. ${pressure} Put an object on the table and turn it to change `
      + "the circulation.";
  }
  const sentence = done.length === 1
    ? done[0]
    : `${done.slice(0, -1).join(", ")} and ${done.at(-1)}`;
  // What a visitor should take away from an obstructed liver: the blood backs up in front of
  // it. The portal pressure is the number that says so, and a few mmHg above the reference is
  // where a clinician starts calling it portal hypertension.
  const portal = summary.mean_portal_pressure;
  const liver = portal > reference.mean_portal_pressure + 4
    ? " The blood is backing up in front of the liver: the pressure in the vein which feeds it "
      + `is ${formatNumber(portal, 0)} mmHg instead of `
      + `${formatNumber(reference.mean_portal_pressure, 0)}, which is portal hypertension.`
    : "";
  return `${body} in whom ${sentence}. ${pressure}${liver}`;
}
