/**
 * The tangible vocabulary of the lobed liver: three instruments that act on whatever segment
 * they lie on, and one dial that winds the days after the operation.
 *
 * An instrument carries its meaning in its place, not in its angle, so there is nothing to read
 * off a dial and nothing to calibrate: the object lies on a segment, and that segment is the one
 * it acts on. Lifting it undoes what it did.
 */

import type {LobeState} from "@pkpdsim-tui/lobes-sim";
import type {Voice} from "@pkpdsim-tui/tui-kit";
import type {TokenRole} from "@pkpdsim-tui/tuio-input";
import {LOBE_TEXT} from "./text.ts";

/** The marker of the dial that winds the days, which is the only object with an angle. */
export const DAY_MARKER = 8;

/** The three instruments, which carry their meaning in their place and not in their angle. */
export function instrumentRoles(voice: Voice): readonly TokenRole[] {
  const copy = voice.pick(LOBE_TEXT).roles;
  const instrument = (id: "portal" | "arterial" | "resect", marker: number): TokenRole => ({
    id, label: voice.say(copy[id].label), description: voice.say(copy[id].info),
    unit: "", markers: [marker], min: 0, max: 1, reference: 0,
    mode: "position", scale: "linear", turns: 1,
  });
  return [instrument("portal", 5), instrument("arterial", 6), instrument("resect", 7)];
}

/** What the instrument of a role does to the segment it lies on. */
export const INSTRUMENT_STATES: Readonly<Record<string, LobeState>> = {
  portal: "portal",
  arterial: "arterial",
  resect: "resected",
};

/**
 * The dial of the days. It is relative and reads the day of the last time point where it is put
 * down, so the table starts at the end of the simulated course and the dial is wound backwards
 * to the operation. Half a turn covers the whole course.
 */
export function dayRole(days: number, voice: Voice): TokenRole {
  const copy = voice.pick(LOBE_TEXT).roles.day;
  return {
    id: "day", label: voice.say(copy.label), unit: "d", markers: [DAY_MARKER],
    description: voice.say(copy.info),
    min: 0, max: days, reference: days, mode: "relative", scale: "linear", turns: 1,
  };
}

export function lobeRoles(days: number, voice: Voice): readonly TokenRole[] {
  return [...instrumentRoles(voice), dayRole(days, voice)];
}

/** The markers this table reads, which the input layer needs before a word is said. */
export const LOBE_MARKERS: readonly number[] = [5, 6, 7, DAY_MARKER];
