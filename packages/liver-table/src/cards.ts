/** What the liver table says: the numbers of the band, and the card beside an object. */

import type {PressureSolution} from "@pkpdsim-tui/cardio-sim";
import {clamp, formatFactor, formatNumber, words} from "@pkpdsim-tui/tui-kit";
import type {StatDefinition, TokenCard, TokenGlyph, Voice} from "@pkpdsim-tui/tui-kit";
import {LIVER_TEXT} from "./text.ts";
import {valueFromAngle} from "@pkpdsim-tui/tuio-input";
import type {TableToken, TokenRole} from "@pkpdsim-tui/tuio-input";

/** How many lobules a human liver is built of, in round numbers. */
export const LOBULES = 1_000_000;

/**
 * The numbers of the band. A child is shown the three which carry the idea, the two supplies and
 * what they add up to; an adult the pressures as well; and an expert what one lobule of it gets.
 */
export function liverStats(voice: Voice): readonly StatDefinition<PressureSolution>[] {
  const copy = voice.pick(LIVER_TEXT).stats;
  const stat = (
    id: keyof typeof copy, unit: string, digits: number, of: (value: PressureSolution) => number,
    from?: "adult" | "expert",
  ): StatDefinition<PressureSolution> => ({
    id, unit, digits, of,
    label: voice.say(copy[id].label),
    info: voice.say(copy[id].info),
    ...(from === undefined ? {} : {from}),
  });
  return [
    stat("flow", "l/min", 2, value => value.qh),
    stat("portal", "l/min", 2, value => value.qpo),
    stat("artery", "l/min", 2, value => value.qha),
    stat("share", "%", 0, value => (value.co === 0 ? 0 : 100 * value.qh / value.co), "adult"),
    stat("ppo", "mmHg", 1, value => value.ppo, "adult"),
    stat("lobule", "ul/min", 2, value => 1e6 * value.qh / LOBULES, "expert"),
  ];
}

function glyphFor(role: TokenRole, value: number): TokenGlyph {
  // A resistance is drawn as the vessel it belongs to: the opening follows Poiseuille's law, so
  // a factor of 8 is a vessel of six tenths of its width.
  const width = Math.pow(value, -0.25);
  return {kind: "vessel", level: clamp((width - 0.55) / 0.95, 0, 1)};
}

export function cardFor(
  voice: Voice, token: TableToken, role: TokenRole | undefined, solution: PressureSolution,
): TokenCard {
  const kit = words(voice);
  if (role === undefined) {
    return {
      kind: "unassigned", title: kit.markerTitle(token.marker), value: kit.noRole,
      note: voice.say(kit.noRoleNote),
    };
  }
  const copy = voice.pick(LIVER_TEXT).cardNote;
  const value = valueFromAngle(role, token.angle);
  const note = role.id === "portal"
    ? copy.portal(formatNumber(solution.qpo, 2))
    : copy.gradient(formatNumber(solution.ppo - solution.pli, 2));
  return {
    kind: "dial", title: role.label, value: formatFactor(value), note,
    glyph: glyphFor(role, value), info: role.description,
  };
}
