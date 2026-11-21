/** What the perfusion table says to whoever is standing at it, in their language. */

import {formatNumber} from "@pkpdsim-tui/tui-kit";
import type {Voice} from "@pkpdsim-tui/tui-kit";
import type {PerfusionSettings} from "@pkpdsim-tui/perfusion-sim";
import {REFERENCE_SETTINGS} from "@pkpdsim-tui/perfusion-sim";
import type {PerfusionReadout} from "./cards.ts";
import {PERFUSION_TEXT} from "./text.ts";

/** One sentence about what the machine is doing to the organ. */
export function perfusionReading(
  voice: Voice, settings: PerfusionSettings, readout: PerfusionReadout, hour: number,
): string {
  return voice.pick(PERFUSION_TEXT).reading({
    flow: formatNumber(settings.flow, 1),
    oxygen: formatNumber(settings.oxygen, 0),
    hour: formatNumber(hour, 1),
    alive: Math.round(100 * readout.alivePericentral),
    bile: formatNumber(readout.bile, 2),
    cold: settings.temperature < REFERENCE_SETTINGS.temperature - 2
      ? formatNumber(settings.temperature, 0)
      : undefined,
  });
}
