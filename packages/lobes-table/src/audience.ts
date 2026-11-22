/**
 * What the table says to somebody who walked up to it: which operation this is, what is left of
 * the liver today, and whether the blood is backing up behind it. The numbers at the edges stay
 * as they are; this is the sentence that says what they mean.
 */

import {remnantFraction} from "@pkpdsim-tui/lobes-sim";
import type {Lobe, LobeState} from "@pkpdsim-tui/lobes-sim";
import {formatNumber} from "@pkpdsim-tui/tui-kit";
import type {Voice} from "@pkpdsim-tui/tui-kit";
import {LOBE_TEXT} from "./text.ts";
import {operationName} from "./operations.ts";
import type {Operation} from "./operations.ts";
import type {Sample} from "./cards.ts";

/**
 * The sentence under the title: the operation on the table, what is left of the liver on the
 * day the dial is at, and the pressure in front of it when that is worth saying.
 */
export function lobeReading(
  voice: Voice,
  lobes: readonly Lobe[],
  states: Readonly<Record<string, LobeState>>,
  operation: Operation,
  day: number,
  sample: Sample | undefined,
  baseline: Sample | undefined,
): string {
  const copy = voice.pick(LOBE_TEXT);
  if (operation.lobes.length === 0) return copy.whole;
  const remnant = remnantFraction(lobes, states);
  const grown = sample?.["f_remnant"] ?? remnant;
  const pressure = (sample?.["CV_P_po"] ?? 0) - (baseline?.["CV_P_po"] ?? 0);
  const days = formatNumber(day, day < 1 ? 1 : 0);
  return copy.reading({
    operation: operationName(voice, operation),
    removed: `${formatNumber(operation.removed * 100, 0)} %`,
    remnant, day,
    dayLabel: voice.locale === "de"
      ? `${days} ${day >= 1.5 ? "Tagen" : "Tag"}`
      : voice.locale === "es"
        ? `${days} ${day >= 1.5 ? "días" : "día"}`
        : `${days} ${day >= 1.5 ? "days" : "day"}`,
    grown: `${formatNumber(grown * 100, 0)} %`,
    backing: pressure > 2 ? formatNumber(pressure, 1) : undefined,
  });
}
