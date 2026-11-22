/**
 * What the table says to somebody who walked up to it: whose circulation this is and what the
 * objects did to it. The numbers at the edges stay as they are; this is the sentence that says
 * what they mean.
 */

import {DEFAULT_HEART_CONTROLS} from "@pkpdsim-tui/cardio-sim";
import type {HeartControls, HeartSummary} from "@pkpdsim-tui/cardio-sim";
import {formatNumber, GROWN_UP} from "@pkpdsim-tui/tui-kit";
import type {TableIndividual, Voice} from "@pkpdsim-tui/tui-kit";
import {CARDIO_TEXT} from "./text.ts";
import type {CardioDone} from "./text.ts";

/** How a blood pressure is spoken about: the two numbers of a cuff. */
export function bloodPressure(summary: HeartSummary): string {
  return `${formatNumber(summary.arterial_systolic, 0)}/`
    + `${formatNumber(summary.arterial_diastolic, 0)} mmHg`;
}

/**
 * The sentence under the title: whose heart this is, what was done to the circulation, and what
 * the body made of it. What was done is collected as keys, because the three languages do not
 * build the sentence the same way.
 */
export function cardioReading(
  voice: Voice,
  controls: HeartControls,
  person: TableIndividual,
  summary: HeartSummary,
  reference: HeartSummary,
): string {
  const done: CardioDone[] = [];
  if (controls.systemic > 1.05) done.push("systemicUp");
  if (controls.systemic < 0.95) done.push("systemicDown");
  if (Math.abs(controls.heartRate - DEFAULT_HEART_CONTROLS.heartRate) > 1) done.push("rate");
  if (controls.contractility < 0.95) done.push("weak");
  if (controls.contractility > 1.05) done.push("strong");
  const copy = voice.pick(CARDIO_TEXT);
  return copy.reading({
    body: copy.body({
      sex: person.sex,
      child: person.age < GROWN_UP,
      weight: formatNumber(person.weight, person.weight < 40 ? 1 : 0),
    }),
    done,
    pressure: bloodPressure(summary),
    output: formatNumber(summary.mean_cardiac_output, 1),
    rate: formatNumber(controls.heartRate, 0),
  });
}
