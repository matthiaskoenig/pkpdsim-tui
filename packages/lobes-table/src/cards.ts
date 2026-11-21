/**
 * What the liver says: the numbers of the bands at the edges, and the card beside an object.
 */

import {clamp, formatNumber} from "@pkpdsim-tui/tui-kit";
import type {PlotTrace, StatDefinition, TokenCard, TokenGlyph} from "@pkpdsim-tui/tui-kit";
import {valueFromAngle} from "@pkpdsim-tui/tuio-input";
import type {TableToken, TokenRole} from "@pkpdsim-tui/tuio-input";
import type {LobeBlock} from "./layout.ts";
import {shortName} from "./scene.ts";

/** A row of a solved course, every column of it by name. */
export type Sample = Readonly<Record<string, number>>;

export const LOBE_STATS: readonly StatDefinition<Sample>[] = [
  {
    id: "remnant", label: "Liver volume", unit: "% of reference",
    of: sample => (sample["f_remnant"] ?? 0) * 100, digits: 0,
    info: "How much liver there is, against the same liver on the same day without an "
      + "operation. A liver which has lost a part grows until it is back at its size.",
  },
  {
    id: "portal-pressure", label: "Portal pressure", unit: "mmHg",
    of: sample => sample["CV_P_po"] ?? 0, digits: 1,
    info: "The pressure in the vein which brings the blood of the gut to the liver. The whole "
      + "of that blood has to pass through whatever liver is left.",
  },
  {
    id: "gradient", label: "Portal gradient", unit: "mmHg",
    of: sample => (sample["CV_P_po"] ?? 0) - (sample["CV_P_li"] ?? 0), digits: 1,
    info: "The pressure the blood loses on its way through the liver. It rises when there is "
      + "less liver for the same blood to cross.",
  },
  {
    id: "portal-flow", label: "Portal flow", unit: "l/min",
    of: sample => sample["Qpo"] ?? 0, digits: 2,
    info: "The blood the gut sends to the liver, about three quarters of everything the liver "
      + "receives.",
  },
  {
    id: "arterial-flow", label: "Arterial flow", unit: "l/min",
    of: sample => sample["Qha"] ?? 0, digits: 2,
    info: "The blood the liver gets straight from the heart, which carries the oxygen.",
  },
];

/** What the course below the liver draws. */
export const LOBE_TRACES: readonly PlotTrace[] = [
  {id: "volume", label: "liver volume", column: "Vli_lobes", unit: "l", colour: "#4fd1c5"},
  {id: "portal", label: "portal pressure", column: "CV_P_po", unit: "mmHg", colour: "#e8a33d"},
];

export interface CardContext {
  readonly block: LobeBlock | undefined;
  readonly sample: Sample;
  /** The same liver without the operation, which a segment is measured against. */
  readonly baseline: Sample;
  readonly days: number;
  readonly origins: ReadonlyMap<number, number>;
}

/** What an instrument did to the segment it lies on, for the card beside it. */
function instrumentNote(roleId: string, block: LobeBlock, context: CardContext): string {
  const share = `${formatNumber(block.share * 100, 0)} % of the mass`;
  const reference = context.baseline[`Vli_${block.token}`];
  const volume = reference === undefined || reference <= 0
    ? undefined
    : (context.sample[`Vli_${block.token}`] ?? reference) / reference;
  switch (roleId) {
    case "resect":
      return `${share}, taken away`;
    case "portal":
    case "arterial":
      return volume === undefined ? share : `${share}, now at ${formatNumber(volume * 100, 0)} %`;
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

export function cardFor(token: TableToken, role: TokenRole | undefined, context: CardContext): TokenCard {
  if (role === undefined) {
    return {
      kind: "unassigned", title: `Marker ${token.marker}`, value: "no role",
      note: "This table does not use this object",
    };
  }
  if (role.mode === "position") {
    const {block} = context;
    return {
      kind: "plain", title: role.label,
      value: block === undefined ? "no segment" : shortName(block),
      note: block === undefined
        ? "Put it on a segment of the liver"
        : instrumentNote(role.id, block, context),
      glyph: glyphFor(role, 1), info: role.description,
    };
  }
  const day = valueFromAngle(role, token.turn, context.origins.get(token.sessionId) ?? 0);
  return {
    kind: "dial", title: role.label, value: `day ${formatNumber(day, 1)}`,
    note: "turn back to the operation",
    glyph: glyphFor(role, context.days > 0 ? day / context.days : 0), info: role.description,
  };
}
