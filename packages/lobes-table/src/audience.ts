/**
 * What the table says to somebody who walked up to it: what a liver is being done to, in the
 * words a visitor uses rather than the ones an operating theatre uses. The numbers at the edges
 * stay as they are; this is the sentence that says what they mean.
 */

import {remnantFraction} from "@pkpdsim-tui/lobes-sim";
import type {Lobe, LobeState} from "@pkpdsim-tui/lobes-sim";
import {formatNumber} from "@pkpdsim-tui/tui-kit";
import type {Sample} from "./cards.ts";
import {shortName} from "./scene.ts";

export const LOBE_TITLE = "The lobed liver";

/** The note behind the title: what this table is, for the visitor who asks. */
export const LOBE_ABOUT = "A liver is built of eight pieces, each with its own blood supply. A "
  + "surgeon can close one off or cut it away, and what is left grows back within days. The "
  + "liver here is solved from the resection model of pkpdsim while you operate on it.";

export const LOBE_TRIES: readonly string[] = [
  "Put the scalpel on the four pieces of the right lobe: that is the operation for a tumour.",
  "Wind dial 4 back to the operation and forward again to watch the liver grow.",
];

/** How much of the liver is left, in the words of the person who asks how bad it is. */
function share(fraction: number): string {
  if (fraction > 0.995) return "the whole liver";
  if (fraction > 0.74) return "most of the liver";
  if (fraction > 0.49) return "about half of the liver";
  if (fraction > 0.29) return "a third of the liver";
  return "a small part of the liver";
}

/** The pieces of a list, as they are spoken: "VII", "VII and VIII", "V, VI and VII". */
function list(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** A piece as it is pointed at on the table: the numeral written on the block. */
function numeral(lobe: Lobe): string {
  return shortName(lobe).replace(/^segment /, "");
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
 * whether the blood is backing up behind it.
 */
export function lobeReading(
  lobes: readonly Lobe[],
  states: Readonly<Record<string, LobeState>>,
  day: number,
  sample: Sample | undefined,
  baseline: Sample | undefined,
): string {
  const cut = piecesIn(lobes, states, "resected");
  const portal = piecesIn(lobes, states, "portal");
  const arterial = piecesIn(lobes, states, "arterial");
  if (cut.length === 0 && portal.length === 0 && arterial.length === 0) {
    return "The liver is whole.";
  }
  const done: string[] = [];
  if (cut.length > 0) {
    done.push(`piece${cut.length > 1 ? "s" : ""} ${list(cut)} ${cut.length > 1 ? "were" : "was"} cut away`);
  }
  if (portal.length > 0) {
    done.push(`the portal vein of piece${portal.length > 1 ? "s" : ""} ${list(portal)} is clamped off`);
  }
  if (arterial.length > 0) {
    done.push(`the artery of piece${arterial.length > 1 ? "s" : ""} ${list(arterial)} is clamped off`);
  }
  // Two things at once are as much as a sentence carries; the objects on the table say the rest.
  const first = done.slice(0, 2);
  const operation = first.length === 1 ? first[0] : `${first[0]} and ${first[1]}`;
  const remnant = remnantFraction(lobes, states);
  const left = cut.length === 0 ? "" : `, which leaves ${share(remnant)}`;
  const grown = sample?.["f_remnant"] ?? remnant;
  const regrowth = day < 0.05
    ? `Right after it, ${formatNumber(grown * 100, 0)} % of a liver is left`
    : `After ${formatNumber(day, day < 1 ? 1 : 0)} day${day >= 1.5 ? "s" : ""} it is back to `
      + `${formatNumber(grown * 100, 0)} % of a whole one`;
  const pressure = (sample?.["CV_P_po"] ?? 0) - (baseline?.["CV_P_po"] ?? 0);
  const backing = pressure > 2
    ? `, and the blood backs up in front of it: ${formatNumber(pressure, 1)} mmHg above normal `
      + "in the portal vein."
    : ".";
  return `In this liver ${operation}${left}. ${regrowth}${backing}`;
}
