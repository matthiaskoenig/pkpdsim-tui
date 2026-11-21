/**
 * The tangible vocabulary of the cardiovascular table: which object does what, over which range,
 * and how the objects on the surface become the controls of the model.
 */

import {defaultControls} from "@pkpdsim-tui/cardio-sim";
import type {PressureControls, PressureReference} from "@pkpdsim-tui/cardio-sim";
import {roleForMarker, valueFromAngle} from "@pkpdsim-tui/tuio-input";
import type {TableToken, TokenRole} from "@pkpdsim-tui/tuio-input";

/**
 * The four resistances of the pressure network, on markers 1 to 4. The angle of the object is the
 * factor on the reference resistance: pointing up is the reference physiology, turning it to the
 * right obstructs, turning it to the left dilates. The scale is logarithmic, because a resistance
 * factor is a ratio.
 */
export const CARDIOVASCULAR_ROLES: readonly TokenRole[] = [
  {
    id: "hepatic", label: "Hepatic outflow", unit: "x", markers: [1],
    description: "Resistance of the hepatic veins. Obstruction raises the portal pressure, which is portal hypertension.",
    min: 0.5, max: 8, reference: 1, mode: "absolute", scale: "log", turns: 1,
  },
  {
    id: "systemic", label: "Systemic resistance", unit: "x", markers: [2],
    description: "Resistance of every systemic organ at once, the afterload of the heart.",
    min: 0.5, max: 2, reference: 1, mode: "absolute", scale: "log", turns: 1,
  },
  {
    id: "portal", label: "Portal vein", unit: "x", markers: [3],
    description: "Resistance of the portal vein between the splanchnic organs and the liver.",
    min: 0.5, max: 6, reference: 1, mode: "absolute", scale: "log", turns: 1,
  },
  {
    id: "renal", label: "Renal resistance", unit: "x", markers: [4],
    description: "Resistance of the kidneys, on top of the systemic resistance.",
    min: 0.5, max: 3, reference: 1, mode: "absolute", scale: "log", turns: 1,
  },
];

/** The token of each role, where the object put down last wins. */
export function winningTokens(
  roles: readonly TokenRole[],
  tokens: ReadonlyMap<number, TableToken>,
): Map<string, TableToken> {
  const winners = new Map<string, TableToken>();
  for (const token of tokens.values()) {
    const role = roleForMarker(roles, token.marker);
    if (role === undefined) continue;
    const current = winners.get(role.id);
    if (current === undefined || token.sessionId > current.sessionId) winners.set(role.id, token);
  }
  return winners;
}

/**
 * The controls of the model under the objects on the surface. A role without an object keeps the
 * reference value, so lifting an object is how a control is undone. `origins` holds the
 * accumulated angle at which each object was put down, which only a relative role uses.
 */
export function controlsFromTokens(
  roles: readonly TokenRole[],
  tokens: ReadonlyMap<number, TableToken>,
  reference: PressureReference,
  origins: ReadonlyMap<number, number> = new Map(),
): PressureControls {
  const base = defaultControls(reference);
  const values = new Map<string, number>();
  for (const [id, token] of winningTokens(roles, tokens)) {
    const role = roleForMarker(roles, token.marker);
    if (role === undefined) continue;
    const angle = role.mode === "absolute" ? token.angle : token.turn;
    values.set(id, valueFromAngle(role, angle, origins.get(token.sessionId) ?? 0));
  }
  return {
    hepatic: values.get("hepatic") ?? base.hepatic,
    systemic: values.get("systemic") ?? base.systemic,
    portal: values.get("portal") ?? base.portal,
    renal: values.get("renal") ?? base.renal,
    arterial: base.arterial,
    venous: base.venous,
  };
}

/** The markers on the surface that no role claims, so the table can say so instead of ignoring them. */
export function unassignedMarkers(
  roles: readonly TokenRole[],
  tokens: ReadonlyMap<number, TableToken>,
): number[] {
  const unknown = new Set<number>();
  for (const token of tokens.values()) {
    if (roleForMarker(roles, token.marker) === undefined) unknown.add(token.marker);
  }
  return [...unknown].sort((left, right) => left - right);
}
