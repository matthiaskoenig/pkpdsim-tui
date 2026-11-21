/**
 * What the liver says: the numbers of the bands at the edges, and the card beside an object.
 */

import {formatNumber} from "@pkpdsim-tui/tui-kit";
import type {PlotTrace, StatDefinition, TokenCard} from "@pkpdsim-tui/tui-kit";
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
  },
  {
    id: "portal-pressure", label: "Portal pressure", unit: "mmHg",
    of: sample => sample["CV_P_po"] ?? 0, digits: 1,
  },
  {
    id: "gradient", label: "Portal gradient", unit: "mmHg",
    of: sample => (sample["CV_P_po"] ?? 0) - (sample["CV_P_li"] ?? 0), digits: 1,
  },
  {
    id: "portal-flow", label: "Portal flow", unit: "l/min",
    of: sample => sample["Qpo"] ?? 0, digits: 2,
  },
  {
    id: "arterial-flow", label: "Arterial flow", unit: "l/min",
    of: sample => sample["Qha"] ?? 0, digits: 2,
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
    };
  }
  const day = valueFromAngle(role, token.turn, context.origins.get(token.sessionId) ?? 0);
  return {
    kind: "dial", title: role.label, value: `day ${formatNumber(day, 1)}`,
    note: `turn back from day ${formatNumber(context.days, 0)} to the operation`,
  };
}
