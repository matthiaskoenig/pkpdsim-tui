/**
 * The objects of the perfusion table: the three settings of the machine, and the dial which
 * walks through the hours of the perfusion.
 *
 * Every setting reads absolutely, so the orientation of the object is the value; the hours are
 * relative and start at the end of the run wherever the object is put down.
 */

import {PERFUSION_CONTROLS} from "@pkpdsim-tui/perfusion-sim";
import type {PerfusionControl} from "@pkpdsim-tui/perfusion-sim";
import type {TokenRole} from "@pkpdsim-tui/tuio-input";

/** The dial of the hours, which is the only object that is not a setting of the machine. */
export const HOUR_MARKER = 4;

function dial(control: PerfusionControl, marker: number, description: string): TokenRole {
  return {
    id: control.id, label: control.label, unit: control.unit, markers: [marker], description,
    min: control.min, max: control.max, reference: control.value,
    mode: "absolute", scale: "linear", turns: 1,
  };
}

export function perfusionRoles(hours: number): readonly TokenRole[] {
  return [
    dial(PERFUSION_CONTROLS.flow, 1,
      "The pump, which pushes the perfusate through the organ. Too little, and the cells "
      + "furthest from the inflow are starved of oxygen."),
    dial(PERFUSION_CONTROLS.oxygen, 2,
      "How much oxygen the oxygenator puts into the fluid. It is the only oxygen the organ "
      + "gets: there are no red blood cells in the circuit."),
    dial(PERFUSION_CONTROLS.temperature, 3,
      "How warm the circuit is kept. Warm means the organ works and has to be fed; cold slows "
      + "everything down, which is how an organ is carried to a transplant."),
    {
      id: "hour", label: "Hours on the machine", unit: "h", markers: [HOUR_MARKER],
      description: "Turn it back to walk through the perfusion, from the end to the moment the "
        + "organ was mounted.",
      min: 0, max: hours, reference: hours, mode: "relative", scale: "linear", turns: 1,
    },
  ];
}
