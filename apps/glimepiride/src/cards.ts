/**
 * What the table says about this individual: the numbers of the bands at the edges, the courses
 * of the plot, and the card beside an object.
 */

import {
  CIRRHOSIS_CLASSES, GENOTYPES, nearestCategory, RENAL_CLASSES,
} from "@pkpdsim-tui/glimepiride-sim";
import type {Pharmacokinetics} from "@pkpdsim-tui/glimepiride-sim";
import {formatNumber} from "@pkpdsim-tui/tui-kit";
import type {PlotTrace, StatDefinition, TokenCard} from "@pkpdsim-tui/tui-kit";
import {valueFromAngle} from "@pkpdsim-tui/tuio-input";
import type {TableToken, TokenRole} from "@pkpdsim-tui/tuio-input";

/** Plasma concentrations are solved in mM and read in uM. */
export const MICROMOLAR = 1000;

export const GLIMEPIRIDE_TRACES: readonly PlotTrace[] = [
  {id: "gli", label: "glimepiride", column: "[Cve_gli]", unit: "uM", colour: "#4fd1c5", factor: MICROMOLAR, digits: 3},
  {id: "m1", label: "M1", column: "[Cve_m1]", unit: "uM", colour: "#e8a33d", factor: MICROMOLAR, digits: 3},
  {id: "m2", label: "M2", column: "[Cve_m2]", unit: "uM", colour: "#a06cd5", factor: MICROMOLAR, digits: 3},
];

/** Everything the bands read: the course as a whole, and the moment the dial points at. */
export interface GlimepirideReadout {
  readonly pk: Pharmacokinetics;
  /** The plasma concentration at the hour of the dial, in uM. */
  readonly now: number;
  /** M1 and M2 in the urine at the end of the course, in umole. */
  readonly urine: number;
}

export const GLIMEPIRIDE_STATS: readonly StatDefinition<GlimepirideReadout>[] = [
  {id: "now", label: "Plasma now", unit: "uM", of: readout => readout.now, digits: 3},
  {id: "cmax", label: "Peak plasma", unit: "uM", of: readout => readout.pk.cmax, digits: 3},
  {id: "tmax", label: "Time of the peak", unit: "h", of: readout => readout.pk.tmax / 60, digits: 2},
  {id: "halflife", label: "Half life", unit: "h", of: readout => readout.pk.halflife / 60, digits: 2},
  {id: "auc", label: "Exposure", unit: "uM h", of: readout => readout.pk.auc / 60, digits: 2},
  {id: "urine", label: "M1 and M2 in urine", unit: "umole", of: readout => readout.urine, digits: 1},
];

/** What a dial of the individual is set to, in the words a clinician reads. */
export function categoryOf(roleId: string, value: number): string {
  switch (roleId) {
    case "cyp2c9":
      return nearestCategory(GENOTYPES, value).label;
    case "cirrhosis":
      return nearestCategory(CIRRHOSIS_CLASSES, value).label;
    case "renal":
      return nearestCategory(RENAL_CLASSES, value).label;
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

export function cardFor(
  token: TableToken, role: TokenRole | undefined, context: CardContext,
): TokenCard {
  if (role === undefined) {
    return {
      kind: "unassigned", title: `Marker ${token.marker}`, value: "no role",
      note: "This table does not use this object",
    };
  }
  const angle = role.mode === "absolute" ? token.angle : token.turn;
  const value = valueFromAngle(role, angle, context.origins.get(token.sessionId) ?? 0);
  if (role.id === "hour") {
    return {
      kind: "dial", title: role.label, value: `${formatNumber(value, 1)} h`,
      note: `plasma ${formatNumber(context.readout.now, 3)} uM at this hour`,
    };
  }
  const category = categoryOf(role.id, value);
  return {
    kind: "dial", title: role.label, value: formatValue(role, value),
    note: category === "" ? role.description.split(".")[0] ?? "" : category,
  };
}
