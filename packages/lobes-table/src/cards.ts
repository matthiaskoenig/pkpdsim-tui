/**
 * What the liver says: the numbers of the bands at the edges, and the card beside an object.
 */

import {clamp, formatNumber, words} from "@pkpdsim-tui/tui-kit";
import type {
  PlotTrace, StatDefinition, TokenCard, TokenGlyph, Voice,
} from "@pkpdsim-tui/tui-kit";
import {LOBE_TEXT} from "./text.ts";
import {valueFromAngle} from "@pkpdsim-tui/tuio-input";
import type {TableToken, TokenRole} from "@pkpdsim-tui/tuio-input";
import type {LobeBlock} from "./layout.ts";
import {shortName} from "./scene.ts";

/** A row of a solved course, every column of it by name. */
export type Sample = Readonly<Record<string, number>>;

/**
 * The numbers of the band. A child reads how much liver is left and how hard the blood has to
 * push; an adult the flows as well; an expert the gradient which says what the remnant costs.
 */
export function lobeStats(voice: Voice): readonly StatDefinition<Sample>[] {
  const book = voice.pick(LOBE_TEXT);
  const copy = book.stats;
  const stat = (
    id: keyof typeof copy, unit: string, digits: number, of: (sample: Sample) => number,
    from?: "adult" | "expert",
  ): StatDefinition<Sample> => ({
    id, unit, digits, of,
    label: voice.say(copy[id].label), info: voice.say(copy[id].info),
    ...(from === undefined ? {} : {from}),
  });
  return [
    stat("remnant", book.ofReference, 0, sample => 100 * (sample["f_remnant"] ?? 0)),
    stat("portal-pressure", "mmHg", 1, sample => sample["CV_P_po"] ?? 0),
    stat("portal-flow", "l/min", 2, sample => sample["Qpo"] ?? 0, "adult"),
    stat("arterial-flow", "l/min", 2, sample => sample["Qha"] ?? 0, "adult"),
    stat(
      "gradient", "mmHg", 1,
      sample => (sample["CV_P_po"] ?? 0) - (sample["CV_P_li"] ?? 0), "expert"),
  ];
}

/** What the course below the liver draws. */
export function lobeTraces(voice: Voice): readonly PlotTrace[] {
  const copy = voice.pick(LOBE_TEXT).traces;
  return [
    {id: "volume", label: copy.volume, column: "Vli_lobes", unit: "l", colour: "#4fd1c5"},
    {id: "portal", label: copy.portal, column: "CV_P_po", unit: "mmHg", colour: "#e8a33d"},
  ];
}

export interface CardContext {
  readonly block: LobeBlock | undefined;
  readonly sample: Sample;
  /** The same liver without the operation, which a segment is measured against. */
  readonly baseline: Sample;
  readonly days: number;
  readonly origins: ReadonlyMap<number, number>;
}

/** What an instrument did to the segment it lies on, for the card beside it. */
function instrumentNote(
  voice: Voice, roleId: string, block: LobeBlock, context: CardContext,
): string {
  const copy = voice.pick(LOBE_TEXT);
  const share = `${formatNumber(block.share * 100, 0)} %`;
  const reference = context.baseline[`Vli_${block.token}`];
  const volume = reference === undefined || reference <= 0
    ? undefined
    : (context.sample[`Vli_${block.token}`] ?? reference) / reference;
  switch (roleId) {
    case "resect":
      return copy.takenAway(share);
    case "portal":
    case "arterial":
      return volume === undefined
        ? share
        : copy.nowAt(share, `${formatNumber(volume * 100, 0)} %`);
    default:
      return share;
  }
}

/** The picture inside the object: the instrument it is, or the clock of the days. */
function glyphFor(role: TokenRole, level: number): TokenGlyph {
  if (role.id === "resect") return {kind: "scalpel", level: 1};
  if (role.mode === "position") return {kind: "clamp", level: 1};
  return {kind: "clock", level: clamp(level, 0, 1)};
}

export function cardFor(
  voice: Voice, token: TableToken, role: TokenRole | undefined, context: CardContext,
): TokenCard {
  const kit = words(voice);
  const copy = voice.pick(LOBE_TEXT);
  if (role === undefined) {
    return {
      kind: "unassigned", title: kit.markerTitle(token.marker), value: kit.noRole,
      note: voice.say(kit.noRoleNote),
    };
  }
  if (role.mode === "position") {
    const {block} = context;
    return {
      kind: "plain", title: role.label,
      value: block === undefined ? copy.noSegment : shortName(voice, block),
      note: block === undefined
        ? copy.putOnSegment
        : instrumentNote(voice, role.id, block, context),
      glyph: glyphFor(role, 1), info: role.description,
    };
  }
  const day = valueFromAngle(role, token.turn, context.origins.get(token.sessionId) ?? 0);
  return {
    kind: "dial", title: role.label, value: copy.dayValue(formatNumber(day, 1)),
    note: copy.windBack,
    glyph: glyphFor(role, context.days > 0 ? day / context.days : 0), info: role.description,
  };
}
