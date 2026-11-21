/**
 * Reading the objects on the surface as the controls of a model: which object holds a role, what
 * value it carries, and which objects the table does not know.
 */

import {roleForMarker, valueFromAngle} from "./roles.ts";
import type {TokenRole} from "./roles.ts";
import type {TableToken} from "./types.ts";

/** The object of each role, where the one put down last wins. */
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
 * The value every role carries, by the object that holds it. A role without an object is not in
 * the map, so the caller keeps its reference value and lifting an object undoes what it did.
 * `origins` holds the accumulated angle at which each object was put down, which only a relative
 * role uses. A role that carries its value in its position is not a dial and is left out.
 */
export function valuesFromTokens(
  roles: readonly TokenRole[],
  tokens: ReadonlyMap<number, TableToken>,
  origins: ReadonlyMap<number, number> = new Map(),
): Map<string, number> {
  const values = new Map<string, number>();
  for (const [id, token] of winningTokens(roles, tokens)) {
    const role = roleForMarker(roles, token.marker);
    if (role === undefined || role.mode === "position") continue;
    const angle = role.mode === "absolute" ? token.angle : token.turn;
    values.set(id, valueFromAngle(role, angle, origins.get(token.sessionId) ?? 0));
  }
  return values;
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
