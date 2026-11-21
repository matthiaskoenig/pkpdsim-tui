/**
 * What the table says to somebody who walked up to it: what a liver is being done to, in the
 * words a visitor uses rather than the ones an operating theatre uses. The numbers at the edges
 * stay as they are; this is the sentence that says what they mean.
 */

import {remnantFraction} from "@pkpdsim-tui/lobes-sim";
import type {Lobe, LobeState} from "@pkpdsim-tui/lobes-sim";
import {formatNumber} from "@pkpdsim-tui/tui-kit";
import type {Voice} from "@pkpdsim-tui/tui-kit";
import {LOBE_TEXT} from "./text.ts";
import type {Sample} from "./cards.ts";

/** A piece as it is pointed at on the table: the numeral written on the block. */
function numeral(lobe: Lobe): string {
  const roman = /^segment ([IVX]+)/.exec(lobe.name);
  return roman?.[1] ?? lobe.name;
}

function piecesIn(
  lobes: readonly Lobe[],
  states: Readonly<Record<string, LobeState>>,
  state: LobeState,
): string[] {
  return lobes.filter(lobe => (states[lobe.token] ?? "intact") === state).map(numeral);
}

/**
 * The sentence under the title: what was done to the liver, what is left of it today, and
 * whether the blood is backing up behind it. What was done is collected as pieces, because the
 * three languages do not build the sentence the same way.
 */
export function lobeReading(
  voice: Voice,
  lobes: readonly Lobe[],
  states: Readonly<Record<string, LobeState>>,
  day: number,
  sample: Sample | undefined,
  baseline: Sample | undefined,
): string {
  const copy = voice.pick(LOBE_TEXT);
  const cut = piecesIn(lobes, states, "resected");
  const portal = piecesIn(lobes, states, "portal");
  const arterial = piecesIn(lobes, states, "arterial");
  if (cut.length === 0 && portal.length === 0 && arterial.length === 0) return copy.whole;
  const remnant = remnantFraction(lobes, states);
  const grown = sample?.["f_remnant"] ?? remnant;
  const pressure = (sample?.["CV_P_po"] ?? 0) - (baseline?.["CV_P_po"] ?? 0);
  const days = formatNumber(day, day < 1 ? 1 : 0);
  return copy.reading({
    cut, portal, arterial, remnant, day,
    dayLabel: voice.locale === "de"
      ? `${days} ${day >= 1.5 ? "Tagen" : "Tag"}`
      : voice.locale === "es"
        ? `${days} ${day >= 1.5 ? "días" : "día"}`
        : `${days} ${day >= 1.5 ? "days" : "day"}`,
    grown: `${formatNumber(grown * 100, 0)} %`,
    backing: pressure > 2 ? formatNumber(pressure, 1) : undefined,
  });
}
