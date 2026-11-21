/**
 * What the table says about this individual: the numbers of the bands at the edges, the courses
 * of the plot, and the card beside an object.
 */

import {
  CIRRHOSIS_CLASSES, GENOTYPES, nearestCategory, RENAL_CLASSES,
} from "@pkpdsim-tui/glimepiride-sim";
import type {Pharmacokinetics} from "@pkpdsim-tui/glimepiride-sim";
import {clamp, formatNumber, words} from "@pkpdsim-tui/tui-kit";
import type {
  PlotTrace, StatDefinition, TokenCard, TokenGlyph, Voice,
} from "@pkpdsim-tui/tui-kit";
import {GLIMEPIRIDE_TEXT} from "./text.ts";
import {valueFromAngle} from "@pkpdsim-tui/tuio-input";
import type {TableToken, TokenRole} from "@pkpdsim-tui/tuio-input";

/** Plasma concentrations are solved in mM and read in uM. */
export const MICROMOLAR = 1000;

export function glimepirideTraces(voice: Voice): readonly PlotTrace[] {
  const copy = voice.pick(GLIMEPIRIDE_TEXT).traces;
  return [
    {id: "gli", label: copy.gli, column: "[Cve_gli]", unit: "uM", colour: "#4fd1c5", factor: MICROMOLAR, digits: 3},
    {id: "m1", label: copy.m1, column: "[Cve_m1]", unit: "uM", colour: "#e8a33d", factor: MICROMOLAR, digits: 3},
    {id: "m2", label: copy.m2, column: "[Cve_m2]", unit: "uM", colour: "#a06cd5", factor: MICROMOLAR, digits: 3},
  ];
}

/** Everything the bands read: the course as a whole, and the moment the dial points at. */
export interface GlimepirideReadout {
  readonly pk: Pharmacokinetics;
  /** The plasma concentration at the hour of the dial, in uM. */
  readonly now: number;
  /** M1 and M2 in the urine at the end of the course, in umole. */
  readonly urine: number;
}

/**
 * The numbers of the band. A child reads what is in the blood now and the most there ever is;
 * an adult when that is and how long it stays; an expert the exposure and what leaves in the
 * urine.
 */
export function glimepirideStats(voice: Voice): readonly StatDefinition<GlimepirideReadout>[] {
  const copy = voice.pick(GLIMEPIRIDE_TEXT).stats;
  const stat = (
    id: keyof typeof copy, unit: string, digits: number,
    of: (readout: GlimepirideReadout) => number, from?: "adult" | "expert",
  ): StatDefinition<GlimepirideReadout> => ({
    id, unit, digits, of,
    label: voice.say(copy[id].label), info: voice.say(copy[id].info),
    ...(from === undefined ? {} : {from}),
  });
  return [
    stat("now", "uM", 3, readout => readout.now),
    stat("cmax", "uM", 3, readout => readout.pk.cmax),
    stat("tmax", "h", 1, readout => readout.pk.tmax / 60, "adult"),
    stat("halflife", "h", 1, readout => readout.pk.halflife / 60, "adult"),
    stat("auc", "uM h", 2, readout => readout.pk.auc / 60, "expert"),
    stat("urine", "umole", 1, readout => readout.urine, "expert"),
  ];
}

export function categoryOf(voice: Voice, roleId: string, value: number): string {
  const said = (label: string): string =>
    voice.pick(GLIMEPIRIDE_TEXT).categories[label] ?? label;
  switch (roleId) {
    case "cyp2c9":
      // A genotype is written the same in every language.
      return nearestCategory(GENOTYPES, value).label;
    case "cirrhosis":
      return said(nearestCategory(CIRRHOSIS_CLASSES, value).label);
    case "renal":
      return said(nearestCategory(RENAL_CLASSES, value).label);
    default:
      return "";
  }
}

export function formatValue(role: TokenRole, value: number): string {
  const digits = role.id === "cyp2c9" || role.id === "cirrhosis" ? 2 : role.unit === "mg" ? 1 : 0;
  return `${formatNumber(value, digits)}${role.unit === "" ? "" : ` ${role.unit}`}`;
}

export interface CardContext {
  readonly values: ReadonlyMap<string, number>;
  readonly origins: ReadonlyMap<number, number>;
  readonly hours: number;
  readonly readout: GlimepirideReadout;
}

/** The picture inside the object: what it sets about this person, or the clock of the hours. */
function glyphFor(role: TokenRole, value: number): TokenGlyph {
  const span = role.max - role.min;
  const level = clamp(span <= 0 ? 1 : (value - role.min) / span, 0, 1);
  switch (role.id) {
    case "hour":
      return {kind: "clock", level};
    case "dose":
      return {kind: "tablet", level};
    case "cyp2c9":
      return {kind: "enzyme", level};
    case "cirrhosis":
      // A cirrhotic liver is the end of this dial, so the picture empties as it is turned up.
      return {kind: "liver", level: 1 - level};
    case "renal":
      return {kind: "kidney", level};
    default:
      return {kind: "body", level};
  }
}

export function cardFor(
  voice: Voice, token: TableToken, role: TokenRole | undefined, context: CardContext,
): TokenCard {
  const kit = words(voice);
  if (role === undefined) {
    return {
      kind: "unassigned", title: kit.markerTitle(token.marker), value: kit.noRole,
      note: voice.say(kit.noRoleNote),
    };
  }
  const angle = role.mode === "absolute" ? token.angle : token.turn;
  const value = valueFromAngle(role, angle, context.origins.get(token.sessionId) ?? 0);
  if (role.id === "hour") {
    return {
      kind: "dial", title: role.label, value: `${formatNumber(value, 1)} h`,
      note: `${formatNumber(context.readout.now, 3)} uM`,
      glyph: glyphFor(role, value), info: role.description,
    };
  }
  const category = categoryOf(voice, role.id, value);
  return {
    kind: "dial", title: role.label, value: formatValue(role, value),
    // A dial which has no clinical class says nothing twice: its value is on the card already.
    note: category,
    glyph: glyphFor(role, value), info: role.description,
  };
}
