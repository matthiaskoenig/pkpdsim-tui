/** What the perfusion table says: the numbers of the band, and the card beside an object. */

import {clamp, formatNumber, words} from "@pkpdsim-tui/tui-kit";
import type {
  PlotTrace, StatDefinition, TokenCard, TokenGlyph, Voice,
} from "@pkpdsim-tui/tui-kit";
import {PERFUSION_TEXT} from "./text.ts";
import {PERFUSION_CONTROLS} from "@pkpdsim-tui/perfusion-sim";
import {valueFromAngle} from "@pkpdsim-tui/tuio-input";
import type {TableToken, TokenRole} from "@pkpdsim-tui/tuio-input";

/** What the band reads at the hour the dial points at. */
export interface PerfusionReadout {
  /** The oxygen in the fluid which enters the organ, in kPa. */
  readonly inflow: number;
  /** The oxygen in the fluid which leaves it, in kPa. */
  readonly outflow: number;
  /** The bile the organ makes, in microlitres a minute. */
  readonly bile: number;
  /** The cells still alive at the far end of the sinusoid, as a fraction. */
  readonly alivePericentral: number;
  /** The cells still alive at the inflow end, as a fraction. */
  readonly alivePeriportal: number;
  /** The ALT in the perfusate, in microkatal per litre: what leaks out of dying cells. */
  readonly alt: number;
  /** The lactate in the perfusate, in mM. */
  readonly lactate: number;
  /** How far along the sinusoid the oxygen has fallen, zone by zone, in kPa. */
  readonly zones: readonly {alive: number; oxygen: number}[];
}

/**
 * The numbers of the band. A child reads what comes out and what is alive; an adult what the
 * organ took and what it makes; an expert the enzyme and the lactate which say why.
 */
export function perfusionStats(voice: Voice): readonly StatDefinition<PerfusionReadout>[] {
  const copy = voice.pick(PERFUSION_TEXT).stats;
  const stat = (
    id: keyof typeof copy, unit: string, digits: number,
    of: (value: PerfusionReadout) => number, from?: "adult" | "expert",
  ): StatDefinition<PerfusionReadout> => ({
    id, unit, digits, of,
    label: voice.say(copy[id].label), info: voice.say(copy[id].info),
    ...(from === undefined ? {} : {from}),
  });
  return [
    stat("outflow", "kPa", 1, value => value.outflow),
    stat("bile", "ul/min", 2, value => value.bile),
    stat("alive", "%", 0, value => 100 * value.alivePericentral),
    stat("taken", "kPa", 1, value => value.inflow - value.outflow, "adult"),
    stat("alt", "ukat/l", 3, value => value.alt, "expert"),
    stat("lactate", "mM", 2, value => value.lactate, "expert"),
  ];
}

export function perfusionTraces(voice: Voice): readonly PlotTrace[] {
  const copy = voice.pick(PERFUSION_TEXT).traces;
  return [
    {
      id: "outflow", label: copy.outflow, column: "pO2_out", unit: "kPa", colour: "#4fd1c5",
      digits: 1, range: {low: 0, high: 85},
    },
    {
      id: "bile", label: copy.bile, column: "bile_rate", unit: "ul/min", colour: "#e8a33d",
      digits: 2, range: {low: 0, high: 5},
    },
    {
      id: "alive", label: copy.alive, column: "f_alive_pc", unit: "%", colour: "#a06cd5",
      factor: 100, digits: 0, range: {low: 0, high: 105},
    },
  ];
}

function glyphFor(role: TokenRole, value: number): TokenGlyph {
  const span = (control: {min: number; max: number}): number =>
    clamp((value - control.min) / (control.max - control.min), 0, 1);
  if (role.id === "flow") return {kind: "pump", level: span(PERFUSION_CONTROLS.flow)};
  if (role.id === "oxygen") return {kind: "bubble", level: span(PERFUSION_CONTROLS.oxygen)};
  if (role.id === "temperature") {
    return {kind: "thermometer", level: span(PERFUSION_CONTROLS.temperature)};
  }
  return {kind: "clock", level: role.max === 0 ? 0 : clamp(value / role.max, 0, 1)};
}

export function cardFor(
  voice: Voice, token: TableToken, role: TokenRole | undefined, readout: PerfusionReadout,
  origins: ReadonlyMap<number, number>,
): TokenCard {
  const kit = words(voice);
  const copy = voice.pick(PERFUSION_TEXT).notes;
  if (role === undefined) {
    return {
      kind: "unassigned", title: kit.markerTitle(token.marker), value: kit.noRole,
      note: voice.say(kit.noRoleNote),
    };
  }
  const angle = role.mode === "absolute" ? token.angle : token.turn;
  const value = valueFromAngle(role, angle, origins.get(token.sessionId) ?? 0);
  const digits = role.id === "temperature" || role.id === "oxygen" ? 0 : 1;
  const note = role.id === "flow"
    ? copy.leaving(formatNumber(readout.outflow, 1))
    : role.id === "oxygen"
      ? copy.alive(formatNumber(100 * readout.alivePericentral, 0))
      : role.id === "temperature"
        ? copy.bile(formatNumber(readout.bile, 2))
        : copy.ofThePerfusion;
  return {
    kind: "dial", title: role.label, value: `${formatNumber(value, digits)} ${role.unit}`,
    note, glyph: glyphFor(role, value), info: role.description,
  };
}
