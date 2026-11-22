/**
 * The objects of the perfusion table: the three settings of the machine, and the dial which
 * walks through the hours of the perfusion.
 *
 * Every setting reads absolutely, so the orientation of the object is the value; the hours are
 * relative and start at the end of the run wherever the object is put down.
 */

import {PERFUSION_CONTROLS} from "@pkpdsim-tui/perfusion-sim";
import type {PerfusionControl} from "@pkpdsim-tui/perfusion-sim";
import {namedRole} from "@pkpdsim-tui/tui-kit";
import type {Voice} from "@pkpdsim-tui/tui-kit";
import type {TokenRole} from "@pkpdsim-tui/tuio-input";
import {PERFUSION_TEXT} from "./text.ts";

/** The dial of the hours, which is the only object that is not a setting of the machine. */
export const HOUR_MARKER = 4;

/** One setting of the machine, in the words of the visitor. */
function dial(
  control: PerfusionControl, marker: number, id: "flow" | "oxygen" | "temperature", voice: Voice,
): TokenRole {
  return namedRole(voice.pick(PERFUSION_TEXT).roles[id], voice, {
    id: control.id, unit: control.unit,
    min: control.min, max: control.max, reference: control.value, markers: [marker],
  });
}

export function perfusionRoles(hours: number, voice: Voice): readonly TokenRole[] {
  const copy = voice.pick(PERFUSION_TEXT);
  return [
    dial(PERFUSION_CONTROLS.flow, 1, "flow", voice),
    dial(PERFUSION_CONTROLS.oxygen, 2, "oxygen", voice),
    dial(PERFUSION_CONTROLS.temperature, 3, "temperature", voice),
    // The hours start at the end of the run wherever the object is put down, so this one dial
    // reads relatively while every setting of the machine reads absolutely.
    namedRole(copy.roles.hour, voice,
      {id: "hour", unit: "h", min: 0, max: hours, reference: hours, markers: [HOUR_MARKER]},
      {mode: "relative"}),
  ];
}

/** The markers this table reads, which the input layer needs before a word is said. */
export const PERFUSION_MARKERS: readonly number[] = [1, 2, 3, HOUR_MARKER];
