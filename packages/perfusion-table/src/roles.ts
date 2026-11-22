/**
 * The objects of the perfusion table: the three settings of the machine, and the dial which
 * walks through the hours of the perfusion.
 *
 * Every setting reads absolutely, so the orientation of the object is the value; the hours are
 * relative and start at the end of the run wherever the object is put down.
 */

import {PERFUSION_CONTROLS} from "@pkpdsim-tui/perfusion-sim";
import type {PerfusionControl} from "@pkpdsim-tui/perfusion-sim";
import type {Voice} from "@pkpdsim-tui/tui-kit";
import type {TokenRole} from "@pkpdsim-tui/tuio-input";
import {PERFUSION_TEXT} from "./text.ts";

/** The dial of the hours, which is the only object that is not a setting of the machine. */
export const HOUR_MARKER = 4;

/** One setting of the machine, in the words of the visitor. */
function dial(
  control: PerfusionControl, marker: number, id: "flow" | "oxygen" | "temperature", voice: Voice,
): TokenRole {
  const copy = voice.pick(PERFUSION_TEXT);
  const more = copy.roles[id].more;
  return {
    id: control.id, label: voice.say(copy.roles[id].label), unit: control.unit, markers: [marker],
    description: voice.say(copy.roles[id].info),
    min: control.min, max: control.max, reference: control.value,
    mode: "absolute", scale: "linear", turns: 1,
    ...(more === undefined ? {} : {background: voice.say(more)}),
  };
}

export function perfusionRoles(hours: number, voice: Voice): readonly TokenRole[] {
  const copy = voice.pick(PERFUSION_TEXT);
  return [
    dial(PERFUSION_CONTROLS.flow, 1, "flow", voice),
    dial(PERFUSION_CONTROLS.oxygen, 2, "oxygen", voice),
    dial(PERFUSION_CONTROLS.temperature, 3, "temperature", voice),
    {
      id: "hour", label: voice.say(copy.roles.hour.label), unit: "h", markers: [HOUR_MARKER],
      description: voice.say(copy.roles.hour.info),
      min: 0, max: hours, reference: hours, mode: "relative", scale: "linear", turns: 1,
      ...(copy.roles.hour.more === undefined
        ? {} : {background: voice.say(copy.roles.hour.more)}),
    },
  ];
}

/** The markers this table reads, which the input layer needs before a word is said. */
export const PERFUSION_MARKERS: readonly number[] = [1, 2, 3, HOUR_MARKER];
