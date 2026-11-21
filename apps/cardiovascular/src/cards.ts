/**
 * What the circulation says: the numbers of the bands at the edges, and the card beside an
 * object. The shared parts of the table draw them; which number belongs where is this
 * application's own.
 *
 * The band reads the beating heart, which is the compiled model solved for the objects on the
 * table. The steady network beside it is the instant one: it answers while a hand is still on an
 * object and drives the anatomy, and the heart follows a moment later.
 */

import type {HeartSummary, PressureSolution} from "@pkpdsim-tui/cardio-sim";
import {formatFactor, formatNumber} from "@pkpdsim-tui/tui-kit";
import type {StatDefinition, TokenCard} from "@pkpdsim-tui/tui-kit";
import {valueFromAngle} from "@pkpdsim-tui/tuio-input";
import type {TableToken, TokenRole} from "@pkpdsim-tui/tuio-input";

/** What the table has solved: the pulsatile heart, and the steady network of the anatomy. */
export interface CardioReadout {
  readonly heart: HeartSummary;
  readonly steady: PressureSolution;
}

export const CARDIOVASCULAR_STATS: readonly StatDefinition<CardioReadout>[] = [
  {
    id: "systolic", label: "Systolic", unit: "mmHg", digits: 0,
    of: value => value.heart.arterial_systolic,
  },
  {
    id: "diastolic", label: "Diastolic", unit: "mmHg", digits: 0,
    of: value => value.heart.arterial_diastolic,
  },
  {
    id: "co", label: "Cardiac output", unit: "l/min", digits: 2,
    of: value => value.heart.mean_cardiac_output,
  },
  {
    id: "stroke", label: "Stroke volume", unit: "ml", digits: 0,
    of: value => value.heart.stroke_volume,
  },
  {
    id: "ppo", label: "Portal pressure", unit: "mmHg", digits: 1,
    of: value => value.heart.mean_portal_pressure,
  },
  {
    id: "gradient", label: "Portal gradient", unit: "mmHg", digits: 1,
    of: value => value.heart.mean_portal_pressure - value.heart.mean_hepatic_pressure,
  },
];

/** The number a turn of this object changes, so the card says what it is doing. */
export function noteFor(roleId: string, value: CardioReadout): string {
  switch (roleId) {
    case "hepatic":
      return `portal gradient ${formatNumber(value.heart.mean_portal_pressure - value.heart.mean_hepatic_pressure)} mmHg`;
    case "portal":
      return `portal flow ${formatNumber(value.heart.mean_portal_flow)} l/min`;
    case "systemic":
      return `blood pressure ${formatNumber(value.heart.arterial_systolic, 0)}/`
        + `${formatNumber(value.heart.arterial_diastolic, 0)} mmHg`;
    case "renal": {
      const kidney = value.steady.flows.find(organ => organ.id === "ki");
      return `renal flow ${formatNumber(kidney?.flow ?? 0)} l/min`;
    }
    case "heartRate":
      return `cardiac output ${formatNumber(value.heart.mean_cardiac_output)} l/min`;
    case "contractility":
      return `stroke volume ${formatNumber(value.heart.stroke_volume, 0)} ml`;
    default:
      return "";
  }
}

export function cardFor(
  token: TableToken,
  role: TokenRole | undefined,
  value: CardioReadout,
  origins: ReadonlyMap<number, number>,
): TokenCard {
  if (role === undefined) {
    return {
      kind: "unassigned", title: `Marker ${token.marker}`, value: "no role",
      note: "This table does not use this object",
    };
  }
  const angle = role.mode === "absolute" ? token.angle : token.turn;
  const dialled = valueFromAngle(role, angle, origins.get(token.sessionId) ?? 0);
  const reading = role.id === "heartRate"
    ? `${formatNumber(dialled, 0)} /min`
    : formatFactor(dialled);
  return {kind: "dial", title: role.label, value: reading, note: noteFor(role.id, value)};
}
