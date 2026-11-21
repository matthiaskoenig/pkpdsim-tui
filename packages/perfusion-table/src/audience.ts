/** What the perfusion table says to whoever is standing at it. */

import {formatNumber} from "@pkpdsim-tui/tui-kit";
import type {PerfusionSettings} from "@pkpdsim-tui/perfusion-sim";
import {REFERENCE_SETTINGS} from "@pkpdsim-tui/perfusion-sim";
import type {PerfusionReadout} from "./cards.ts";

export const PERFUSION_TITLE = "The liver on the machine";
export const PERFUSION_ABOUT = "A liver taken out of a body stays alive if it is perfused: warm "
  + "fluid, full of oxygen, pumped through it without stopping. It is how a donor organ is "
  + "carried and tested, and how a liver is studied on its own. The organ here is the rat liver "
  + "of the perfusion library of pkpdsim, with four zones along its sinusoid.";
export const PERFUSION_TRIES: readonly string[] = [
  "Turn the oxygen down: the far end of the sinusoid dies first, and the bile stops.",
  "Turn the pump down and watch how little oxygen reaches the last zone.",
];

export function perfusionReading(
  settings: PerfusionSettings, readout: PerfusionReadout, hour: number,
): string {
  const alive = Math.round(100 * readout.alivePericentral);
  const state = alive >= 95
    ? "the organ is well"
    : alive >= 60 ? "the far end of the sinusoid is suffering" : "the far end has died";
  const cold = settings.temperature < REFERENCE_SETTINGS.temperature - 2
    ? `, kept at ${formatNumber(settings.temperature, 0)} degrees`
    : "";
  return `${formatNumber(settings.flow, 1)} ml a minute at `
    + `${formatNumber(settings.oxygen, 0)} kPa of oxygen${cold}: after `
    + `${formatNumber(hour, 1)} hours ${state}, ${alive}% of the last cells are alive and the `
    + `liver makes ${formatNumber(readout.bile, 2)} microlitres of bile a minute.`;
}
