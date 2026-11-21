/** What the perfusion table says: the numbers of the band, and the card beside an object. */

import {clamp, formatNumber} from "@pkpdsim-tui/tui-kit";
import type {PlotTrace, StatDefinition, TokenCard, TokenGlyph} from "@pkpdsim-tui/tui-kit";
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

export const PERFUSION_STATS: readonly StatDefinition<PerfusionReadout>[] = [
  {
    id: "taken", label: "Oxygen taken", unit: "kPa", digits: 1,
    of: value => value.inflow - value.outflow,
    info: "How much of the oxygen the organ took out of the fluid on its way through. A living "
      + "liver breathes, and this is the measurement which says that it does.",
  },
  {
    id: "outflow", label: "Oxygen leaving", unit: "kPa", digits: 1, of: value => value.outflow,
    info: "What is left in the fluid when it leaves the organ. When it reaches zero, the cells "
      + "at the far end have nothing to breathe.",
  },
  {
    id: "bile", label: "Bile", unit: "ul/min", digits: 2, of: value => value.bile,
    info: "A liver makes bile as long as it is working, so the drop which comes out of the bile "
      + "duct is the clearest sign that the organ is alive.",
  },
  {
    id: "alive", label: "Cells alive", unit: "%", digits: 0,
    of: value => 100 * value.alivePericentral,
    info: "The cells still alive at the far end of the sinusoid, the ones which are served "
      + "last. They are the first to die when the oxygen or the flow is not enough.",
  },
  {
    id: "alt", label: "ALT released", unit: "ukat/l", digits: 3, of: value => value.alt,
    info: "An enzyme from inside the liver cells. It only reaches the fluid when cells break "
      + "open, which is how damage is measured in a perfusion and in a blood sample alike.",
  },
  {
    id: "lactate", label: "Lactate", unit: "mM", digits: 2, of: value => value.lactate,
    info: "A healthy liver eats lactate. A struggling one makes it instead, so a rising lactate "
      + "is bad news on a machine as well as in a patient.",
  },
];

/**
 * The three courses of a perfusion, each on a scale of its own which does not move: an organ
 * which is doing well draws three flat lines near the top, and one which is not says so.
 */
export const PERFUSION_TRACES: readonly PlotTrace[] = [
  {
    id: "outflow", label: "oxygen leaving", column: "pO2_out", unit: "kPa", colour: "#4fd1c5",
    digits: 1, range: {low: 0, high: 85},
  },
  {
    id: "bile", label: "bile", column: "bile_rate", unit: "ul/min", colour: "#e8a33d",
    digits: 2, range: {low: 0, high: 5},
  },
  {
    id: "alive", label: "cells alive", column: "f_alive_pc", unit: "%", colour: "#a06cd5",
    factor: 100, digits: 0, range: {low: 0, high: 105},
  },
];

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
  token: TableToken, role: TokenRole | undefined, readout: PerfusionReadout,
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
  const digits = role.id === "temperature" || role.id === "oxygen" ? 0 : 1;
  const note = role.id === "flow"
    ? `${formatNumber(readout.outflow, 1)} kPa leaving`
    : role.id === "oxygen"
      ? `${formatNumber(100 * readout.alivePericentral, 0)}% of the cells alive`
      : role.id === "temperature"
        ? `${formatNumber(readout.bile, 2)} ul/min of bile`
        : "of the perfusion";
  return {
    kind: "dial", title: role.label, value: `${formatNumber(value, digits)} ${role.unit}`,
    note, glyph: glyphFor(role, value), info: role.description,
  };
}
