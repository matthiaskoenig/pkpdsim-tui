/**
 * What can be done to a segment of the liver, and the parameters each of them changes.
 *
 * The gates of a branch are the ones `pkpdsim.pbpk.lobes` writes: `g_po_<token>` for the portal
 * branch, `g_ha_<token>` for the hepatic artery, and `f_present_<token>` for whether the segment
 * is there at all. A ligation closes a gate, a resection closes both and takes the segment away.
 * No equation of a liver lives here.
 */

import type {Lobe, LobeState} from "./types.ts";

export interface LobeStateInfo {
  readonly id: LobeState;
  readonly label: string;
  readonly short: string;
  readonly description: string;
}

export const LOBE_STATES: readonly LobeStateInfo[] = [
  {
    id: "intact", label: "intact", short: "intact",
    description: "Both branches open: the segment is perfused as the lobe table says.",
  },
  {
    id: "portal", label: "portal vein ligated", short: "PVL",
    description: "The portal branch is closed: the segment keeps its artery, stays perfused below the reference and atrophies.",
  },
  {
    id: "arterial", label: "hepatic artery ligated", short: "HAL",
    description: "The arterial branch is closed: the segment keeps its portal inflow.",
  },
  {
    id: "resected", label: "resected", short: "resected",
    description: "Both branches closed and the segment gone: no capacity, no growth, and the remnant is what is left.",
  },
];

export function lobeState(id: LobeState): LobeStateInfo {
  const state = LOBE_STATES.find(candidate => candidate.id === id);
  if (state === undefined) throw new RangeError(`"${id}" is no state of a segment.`);
  return state;
}

const PARAMETERS: Record<LobeState, (token: string) => Record<string, number>> = {
  intact: () => ({}),
  portal: token => ({[`g_po_${token}`]: 0}),
  arterial: token => ({[`g_ha_${token}`]: 0}),
  resected: token => ({[`g_ha_${token}`]: 0, [`g_po_${token}`]: 0, [`f_present_${token}`]: 0}),
};

/** The parameter changes of a plan, as `pkpdsim.pbpk.interventions` writes them. */
export function caseChanges(states: Readonly<Record<string, LobeState>>): Record<string, number> {
  const changes: Record<string, number> = {};
  for (const [token, state] of Object.entries(states)) {
    const of_state = PARAMETERS[state];
    if (of_state === undefined) throw new RangeError(`"${state}" is no state of a segment.`);
    Object.assign(changes, of_state(token));
  }
  return changes;
}

/** The state of every segment of an exported case, so a preset fills the liver on the table. */
export function stateOfChanges(
  changes: Readonly<Record<string, number>>,
  tokens: readonly string[],
): Record<string, LobeState> {
  return Object.fromEntries(tokens.map(token => {
    if (`f_present_${token}` in changes) return [token, "resected"];
    const portal = `g_po_${token}` in changes;
    const arterial = `g_ha_${token}` in changes;
    if (portal && arterial) return [token, "resected"];
    if (portal) return [token, "portal"];
    if (arterial) return [token, "arterial"];
    return [token, "intact"];
  }));
}

/** Every segment intact, which is the liver a table starts from. */
export function intactStates(lobes: readonly Lobe[]): Record<string, LobeState> {
  return Object.fromEntries(lobes.map(lobe => [lobe.token, "intact" as LobeState]));
}

/**
 * The share of the mass of the liver that is still there. This is arithmetic on the lobe table,
 * not a result of the model: it is what the table can show before a solve has finished.
 */
export function remnantFraction(
  lobes: readonly Lobe[],
  states: Readonly<Record<string, LobeState>>,
): number {
  return lobes
    .filter(lobe => (states[lobe.token] ?? "intact") !== "resected")
    .reduce((sum, lobe) => sum + lobe.mass_fraction, 0);
}

/** The share of the mass of the liver that still has its portal inflow. */
export function portalFraction(
  lobes: readonly Lobe[],
  states: Readonly<Record<string, LobeState>>,
): number {
  return lobes
    .filter(lobe => {
      const state = states[lobe.token] ?? "intact";
      return state === "intact" || state === "arterial";
    })
    .reduce((sum, lobe) => sum + lobe.mass_fraction, 0);
}

/** The name of the plan on the table, for a readout: a named case, or what was done. */
export function describeStates(
  lobes: readonly Lobe[],
  states: Readonly<Record<string, LobeState>>,
): string {
  const touched = lobes.filter(lobe => (states[lobe.token] ?? "intact") !== "intact");
  if (touched.length === 0) return "intact liver";
  const byState = new Map<LobeState, string[]>();
  for (const lobe of touched) {
    const state = states[lobe.token] as LobeState;
    byState.set(state, [...(byState.get(state) ?? []), lobe.token]);
  }
  return [...byState.entries()]
    .map(([state, tokens]) => `${lobeState(state).short} ${tokens.join(", ")}`)
    .join("; ");
}
