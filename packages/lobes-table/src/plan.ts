/**
 * The plan on the table: which instrument lies on which segment, and the state that follows.
 *
 * Two instruments on one segment combine, and a segment whose portal branch and artery are both
 * closed has no inflow left, which is the same as a resection.
 */

import {intactStates} from "@pkpdsim-tui/lobes-sim";
import type {Lobe, LobeState} from "@pkpdsim-tui/lobes-sim";
import {roleForMarker} from "@pkpdsim-tui/tuio-input";
import type {TableToken, TokenRole} from "@pkpdsim-tui/tuio-input";
import {blockAt} from "./layout.ts";
import type {LobeBlock} from "./layout.ts";
import {INSTRUMENT_STATES} from "./roles.ts";

export interface Instrument {
  readonly sessionId: number;
  readonly marker: number;
  readonly role: TokenRole;
  /** The segment under the object, undefined when it lies beside the liver. */
  readonly token: string | undefined;
}

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

/** The instruments on the surface and the segment each of them lies on. */
export function instrumentsOn(
  roles: readonly TokenRole[],
  tokens: ReadonlyMap<number, TableToken>,
  blocks: readonly LobeBlock[],
  viewport: Viewport,
): Instrument[] {
  const instruments: Instrument[] = [];
  for (const token of tokens.values()) {
    const role = roleForMarker(roles, token.marker);
    if (role === undefined || role.mode !== "position") continue;
    const block = blockAt(blocks, token.x * viewport.width, token.y * viewport.height);
    instruments.push({
      sessionId: token.sessionId, marker: token.marker, role,
      ...(block === undefined ? {token: undefined} : {token: block.token}),
    });
  }
  return instruments;
}

/** The state of every segment of the liver, from the instruments that lie on it. */
export function statesFrom(
  lobes: readonly Lobe[],
  instruments: readonly Instrument[],
): Record<string, LobeState> {
  const states = intactStates(lobes);
  const closed = new Map<string, Set<LobeState>>();
  for (const instrument of instruments) {
    if (instrument.token === undefined || !(instrument.token in states)) continue;
    const state = INSTRUMENT_STATES[instrument.role.id];
    if (state === undefined) continue;
    const seen = closed.get(instrument.token) ?? new Set<LobeState>();
    seen.add(state);
    closed.set(instrument.token, seen);
  }
  for (const [token, seen] of closed) {
    // Both branches closed leaves a segment without any inflow, which is a resection.
    states[token] = seen.has("resected") || (seen.has("portal") && seen.has("arterial"))
      ? "resected"
      : seen.has("portal") ? "portal" : "arterial";
  }
  return states;
}

/** The instruments that lie beside the liver and so do nothing. */
export function idleInstruments(instruments: readonly Instrument[]): Instrument[] {
  return instruments.filter(instrument => instrument.token === undefined);
}
