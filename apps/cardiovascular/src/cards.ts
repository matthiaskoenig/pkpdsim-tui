/**
 * What the circulation says: the numbers of the bands at the edges, and the card beside an
 * object. The shared parts of the table draw them; which number belongs where is this
 * application's own.
 */

import type {PressureSolution} from "@pkpdsim-tui/cardio-sim";
import {formatFactor, formatNumber} from "@pkpdsim-tui/tui-kit";
import type {StatDefinition, TokenCard} from "@pkpdsim-tui/tui-kit";
import {valueFromAngle} from "@pkpdsim-tui/tuio-input";
import type {TableToken, TokenRole} from "@pkpdsim-tui/tuio-input";

export const CARDIOVASCULAR_STATS: readonly StatDefinition<PressureSolution>[] = [
  {id: "co", label: "Cardiac output", unit: "l/min", of: solution => solution.co},
  {id: "ppo", label: "Portal pressure", unit: "mmHg", of: solution => solution.ppo},
  {id: "gradient", label: "Portal gradient", unit: "mmHg", of: solution => solution.ppo - solution.pli},
  {id: "qh", label: "Hepatic flow", unit: "l/min", of: solution => solution.qh},
  {id: "qpo", label: "Portal flow", unit: "l/min", of: solution => solution.qpo},
];

/** The number a turn of this object changes, so the card says what it is doing. */
export function noteFor(roleId: string, solution: PressureSolution): string {
  switch (roleId) {
    case "hepatic":
      return `portal gradient ${formatNumber(solution.ppo - solution.pli)} mmHg`;
    case "portal":
      return `portal flow ${formatNumber(solution.qpo)} l/min`;
    case "systemic":
      return `cardiac output ${formatNumber(solution.co)} l/min`;
    case "renal": {
      const kidney = solution.flows.find(organ => organ.id === "ki");
      return `renal flow ${formatNumber(kidney?.flow ?? 0)} l/min`;
    }
    default:
      return "";
  }
}

export function cardFor(
  token: TableToken,
  role: TokenRole | undefined,
  solution: PressureSolution,
  origins: ReadonlyMap<number, number>,
): TokenCard {
  if (role === undefined) {
    return {
      kind: "unassigned", title: `Marker ${token.marker}`, value: "no role",
      note: "This table does not use this object",
    };
  }
  const angle = role.mode === "absolute" ? token.angle : token.turn;
  const value = valueFromAngle(role, angle, origins.get(token.sessionId) ?? 0);
  return {kind: "dial", title: role.label, value: formatFactor(value), note: noteFor(role.id, solution)};
}
