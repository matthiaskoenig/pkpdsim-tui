/**
 * What the liver says: the numbers of the bands at the edges, and the card beside an object.
 */

import {clamp, formatNumber, words} from "@pkpdsim-tui/tui-kit";
import type {StatDefinition, TokenCard, TokenGlyph, Voice} from "@pkpdsim-tui/tui-kit";
import {LOBE_TEXT} from "./text.ts";
import {valueFromAngle} from "@pkpdsim-tui/tuio-input";
import type {TableToken, TokenRole} from "@pkpdsim-tui/tuio-input";
import {operationName} from "./operations.ts";
import type {Operation} from "./operations.ts";

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

export interface CardContext {
  /** The operation the knife is pointing at. */
  readonly operation: Operation;
  readonly sample: Sample;
  /** The same liver without the operation, which a segment is measured against. */
  readonly baseline: Sample;
  readonly days: number;
  readonly origins: ReadonlyMap<number, number>;
}

/** The picture inside the object: the knife of the operation, or the clock of the days. */
function glyphFor(role: TokenRole, level: number): TokenGlyph {
  if (role.id === "resection") return {kind: "scalpel", level: 1};
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
  if (role.id === "resection") {
    // The card of the knife names the operation and what it takes, which is the number a
    // visitor is choosing by.
    return {
      kind: "dial", title: role.label,
      value: operationName(voice, context.operation),
      note: context.operation.lobes.length === 0
        ? copy.whole
        : copy.takenAway(`${formatNumber(context.operation.removed * 100, 0)} %`),
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
