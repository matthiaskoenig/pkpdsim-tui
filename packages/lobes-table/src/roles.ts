/**
 * The tangible vocabulary of the lobed liver: three instruments that act on whatever segment
 * they lie on, and one dial that winds the days after the operation.
 *
 * An instrument carries its meaning in its place, not in its angle, so there is nothing to read
 * off a dial and nothing to calibrate: the object lies on a segment, and that segment is the one
 * it acts on. Lifting it undoes what it did.
 */

import type {LobeState} from "@pkpdsim-tui/lobes-sim";
import type {TokenRole} from "@pkpdsim-tui/tuio-input";

/** The marker of the dial that winds the days, which is the only object with an angle. */
export const DAY_MARKER = 8;

export const INSTRUMENT_ROLES: readonly TokenRole[] = [
  {
    id: "portal", label: "Portal clamp", unit: "", markers: [5],
    description: "Closes the portal branch of the segment under it, which is a portal vein ligation.",
    min: 0, max: 1, reference: 0, mode: "position", scale: "linear", turns: 1,
  },
  {
    id: "arterial", label: "Arterial clamp", unit: "", markers: [6],
    description: "Closes the hepatic artery of the segment under it.",
    min: 0, max: 1, reference: 0, mode: "position", scale: "linear", turns: 1,
  },
  {
    id: "resect", label: "Scalpel", unit: "", markers: [7],
    description: "Takes the segment under it away, which is a resection.",
    min: 0, max: 1, reference: 0, mode: "position", scale: "linear", turns: 1,
  },
];

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
export function dayRole(days: number): TokenRole {
  return {
    id: "day", label: "Day after the operation", unit: "d", markers: [DAY_MARKER],
    description: "Turn it back to walk from the end of the course to the operation.",
    min: 0, max: days, reference: days, mode: "relative", scale: "linear", turns: 1,
  };
}

export function lobeRoles(days: number): readonly TokenRole[] {
  return [...INSTRUMENT_ROLES, dayRole(days)];
}
