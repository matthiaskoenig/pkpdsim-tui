/**
 * The operations a surgeon does, which this table walks through: the resections the export of
 * pkpdsim carries for this species, in the order of how much liver they take.
 *
 * The table used to hand a visitor three instruments and let them close or cut any segment they
 * liked, which is a liver nobody operates on. These are the operations which are done: a single
 * segment, a left or a right hemihepatectomy, an extended right one, and for the two laboratory
 * animals the hepatectomies their studies are built on.
 */

import type {Lobe, LobeCase, LobeSpecies, LobeState} from "@pkpdsim-tui/lobes-sim";
import {intactStates} from "@pkpdsim-tui/lobes-sim";
import {namedRole} from "@pkpdsim-tui/tui-kit";
import type {Voice} from "@pkpdsim-tui/tui-kit";
import type {TokenRole} from "@pkpdsim-tui/tuio-input";
import {LOBE_TEXT} from "./text.ts";

/** The marker of the object which picks the operation: the scalpel. */
export const RESECTION_MARKER = 1;
/** The marker of the dial which makes the liver grow back faster or slower. */
export const GROWTH_MARKER = 2;
/** How far the dial moves the growth constant of the species, up and down. */
export const GROWTH_SPAN = 3;

export interface Operation {
  /** The id of the case in the export, which is also how it is named in the copy. */
  readonly id: string;
  /** The segments it takes away. */
  readonly lobes: readonly string[];
  /** The share of the mass of the liver it takes. */
  readonly removed: number;
  /** The run the export carries for it, which the table replaces with one of its own. */
  readonly series: Readonly<Record<string, readonly number[]>>;
}

/** How much of the liver a set of segments carries. */
function massOf(lobes: readonly Lobe[], tokens: readonly string[]): number {
  return lobes
    .filter(lobe => tokens.includes(lobe.token))
    .reduce((sum, lobe) => sum + lobe.mass_fraction, 0);
}

/**
 * The resections of a species, the intact liver first and then by how much they take. The
 * ligations of the export are left out: this table is about what is cut away.
 */
export function operationsOf(species: LobeSpecies): readonly Operation[] {
  const entries = Object.entries(species.cases) as [string, LobeCase][];
  const operations = entries
    .filter(([, one]) => one.kind === "intact" || one.kind === "Resection")
    .map(([id, one]) => ({
      id, lobes: one.lobes, removed: massOf(species.lobes, one.lobes), series: one.series,
    }));
  return operations.sort((left, right) => left.removed - right.removed);
}

/** The state of every segment under an operation: the ones it takes are gone. */
export function statesOf(
  lobes: readonly Lobe[], operation: Operation,
): Record<string, LobeState> {
  const states = intactStates(lobes);
  for (const token of operation.lobes) {
    if (token in states) states[token] = "resected";
  }
  return states;
}

/** What an operation is called, at the level of this visitor. */
export function operationName(voice: Voice, operation: Operation): string {
  const copy = voice.pick(LOBE_TEXT).operations[operation.id];
  return copy === undefined ? operation.id.replace(/_/gu, " ") : voice.say(copy);
}

/**
 * The object which picks the operation. Its angle walks the resections, with the intact liver
 * at one stop and the largest resection at the other, so that turning it is the operation
 * getting bigger.
 */
export function resectionRole(voice: Voice, count: number): TokenRole {
  return namedRole(voice.pick(LOBE_TEXT).roles.resection, voice, {
    id: "resection", unit: "", markers: [RESECTION_MARKER],
    min: 0, max: Math.max(1, count - 1), reference: 0,
  });
}

/** The operation the dial is pointing at. */
export function operationAtDial(
  operations: readonly Operation[], value: number,
): Operation {
  const index = Math.min(operations.length - 1, Math.max(0, Math.round(value)));
  const operation = operations[index] ?? operations[0];
  if (operation === undefined) throw new Error("The export holds no operation.");
  return operation;
}

/**
 * The dial of the regeneration: how fast this liver grows back, as a factor on the growth
 * constant of its species. It is logarithmic, because it is a rate, and its reference is the
 * liver of a healthy individual, which is the course the species is known for.
 */
export function growthRole(voice: Voice): TokenRole {
  return namedRole(voice.pick(LOBE_TEXT).roles.growth, voice, {
    id: "growth", unit: "x", markers: [GROWTH_MARKER],
    min: 1 / GROWTH_SPAN, max: GROWTH_SPAN, reference: 1,
  }, {scale: "log"});
}

export function lobeRoles(voice: Voice, count: number): readonly TokenRole[] {
  return [resectionRole(voice, count), growthRole(voice)];
}

/** The markers this table reads, which the input layer needs before a word is said. */
export const LOBE_MARKERS: readonly number[] = [RESECTION_MARKER, GROWTH_MARKER];
