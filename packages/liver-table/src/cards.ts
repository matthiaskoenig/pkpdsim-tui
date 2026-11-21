/** What the liver table says: the numbers of the band, and the card beside an object. */

import type {PressureSolution} from "@pkpdsim-tui/cardio-sim";
import {clamp, formatFactor, formatNumber} from "@pkpdsim-tui/tui-kit";
import type {StatDefinition, TokenCard, TokenGlyph} from "@pkpdsim-tui/tui-kit";
import {valueFromAngle} from "@pkpdsim-tui/tuio-input";
import type {TableToken, TokenRole} from "@pkpdsim-tui/tuio-input";

/** How many lobules a human liver is built of, in round numbers. */
export const LOBULES = 1_000_000;

export const LIVER_STATS: readonly StatDefinition<PressureSolution>[] = [
  {
    id: "flow", label: "Through the liver", unit: "l/min", digits: 2, of: value => value.qh,
    info: "Everything the liver gets, from both of its supplies together. About a litre and a "
      + "half a minute in a person at rest.",
  },
  {
    id: "portal", label: "From the gut", unit: "l/min", digits: 2, of: value => value.qpo,
    info: "The blood the portal vein brings from the stomach, the gut and the spleen. It has "
      + "already given its oxygen away, but it carries everything that was absorbed.",
  },
  {
    id: "artery", label: "From the artery", unit: "l/min", digits: 2, of: value => value.qha,
    info: "The blood the hepatic artery brings straight from the aorta: a quarter of the "
      + "supply, and most of the oxygen.",
  },
  {
    id: "share", label: "Of the heart", unit: "%", digits: 0,
    of: value => (value.co === 0 ? 0 : 100 * value.qh / value.co),
    info: "How much of everything the heart pumps goes through the liver. No other organ of its "
      + "size takes as large a share.",
  },
  {
    id: "ppo", label: "Portal pressure", unit: "mmHg", digits: 1, of: value => value.ppo,
    info: "The pressure in the vein which carries the blood of the gut to the liver. When the "
      + "liver obstructs it, the blood backs up here: that is portal hypertension.",
  },
  {
    id: "lobule", label: "One lobule gets", unit: "ul/min", digits: 2,
    of: value => 1e6 * value.qh / LOBULES,
    info: "A liver is built of about a million lobules. This is what one of them is served "
      + "with, which is the flow of the whole liver divided among them.",
  },
];

function glyphFor(role: TokenRole, value: number): TokenGlyph {
  // A resistance is drawn as the vessel it belongs to: the opening follows Poiseuille's law, so
  // a factor of 8 is a vessel of six tenths of its width.
  const width = Math.pow(value, -0.25);
  return {kind: "vessel", level: clamp((width - 0.55) / 0.95, 0, 1)};
}

export function cardFor(
  token: TableToken, role: TokenRole | undefined, solution: PressureSolution,
): TokenCard {
  if (role === undefined) {
    return {
      kind: "unassigned", title: `Marker ${token.marker}`, value: "no role",
      note: "This table does not use this object",
    };
  }
  const value = valueFromAngle(role, token.angle);
  const note = role.id === "portal"
    ? `${formatNumber(solution.qpo, 2)} l/min from the gut`
    : `portal gradient ${formatNumber(solution.ppo - solution.pli, 2)} mmHg`;
  return {
    kind: "dial", title: role.label, value: formatFactor(value), note,
    glyph: glyphFor(role, value), info: role.description,
  };
}
