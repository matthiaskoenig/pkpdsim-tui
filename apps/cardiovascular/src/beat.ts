/**
 * One beat of the solved heart, played in real time. The compiled model is solved for the three
 * beats after the objects were set; the last of them is a cycle, and the table walks around it
 * at the rate the heart was given. Nothing here integrates anything: it reads the course the
 * solver returned.
 */

import {heartColumn} from "@pkpdsim-tui/cardio-sim";
import type {HeartCase} from "@pkpdsim-tui/cardio-sim";

/** The last solved beat, as the phase of the cycle from the start of the beat to its end. */
export interface BeatCycle {
  readonly heartRate: number;
  /** The phase of every sample, from 0 to 1. */
  readonly phase: readonly number[];
  /** The volume of the left ventricle, in millilitres. */
  readonly volume: readonly number[];
  /** The pressure in the aorta, in mmHg. */
  readonly arterial: readonly number[];
  /** The pressure in the left ventricle, in mmHg. */
  readonly ventricular: readonly number[];
  readonly minVolume: number;
  readonly maxVolume: number;
  readonly minArterial: number;
  readonly maxArterial: number;
}

/** Where the table is in the cycle, and what the heart is doing there. */
export interface BeatFrame {
  readonly phase: number;
  readonly volume: number;
  readonly arterial: number;
  readonly ventricular: number;
  /** How full the ventricle is between its emptiest and its fullest, from 0 to 1. */
  readonly filling: number;
}

function extent(values: readonly number[]): {min: number; max: number} {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return {min, max};
}

/**
 * The last beat of a solved case. The beats table holds `summary_beats` of them in seconds, so
 * the cycle is the tail of it that is one period long.
 */
export function beatCycle(solved: HeartCase): BeatCycle | undefined {
  const time = heartColumn(solved.beats, "time");
  if (time.length < 8) return undefined;
  const heartRate = solved.heart_rate;
  const period = 60 / heartRate;
  const end = time.at(-1) ?? 0;
  const start = end - period;
  let first = time.findIndex(value => value >= start - 1e-9);
  if (first < 0) first = 0;
  const volume = heartColumn(solved.beats, "CV_V_lv").slice(first);
  const arterial = heartColumn(solved.beats, "CV_P_ar").slice(first);
  const ventricular = heartColumn(solved.beats, "CV_P_lv").slice(first);
  const phase = time.slice(first).map(value => (value - start) / period);
  if (phase.length < 8) return undefined;
  const volumes = extent(volume);
  const arterials = extent(arterial);
  return {
    heartRate, phase, volume, arterial, ventricular,
    minVolume: volumes.min, maxVolume: volumes.max,
    minArterial: arterials.min, maxArterial: arterials.max,
  };
}

/** The cycle at a phase, between the two samples around it. */
export function sampleBeat(cycle: BeatCycle, phase: number): BeatFrame {
  const wrapped = ((phase % 1) + 1) % 1;
  const phases = cycle.phase;
  let high = phases.findIndex(value => value >= wrapped);
  if (high <= 0) high = 1;
  const low = high - 1;
  const left = phases[low] ?? 0;
  const right = phases[high] ?? 1;
  const span = right - left;
  const weight = span <= 0 ? 0 : (wrapped - left) / span;
  const between = (values: readonly number[]): number => {
    const a = values[low] ?? 0;
    const b = values[high] ?? a;
    return a + (b - a) * weight;
  };
  const volume = between(cycle.volume);
  const span_volume = cycle.maxVolume - cycle.minVolume;
  return {
    phase: wrapped, volume,
    arterial: between(cycle.arterial),
    ventricular: between(cycle.ventricular),
    filling: span_volume <= 0 ? 1 : (volume - cycle.minVolume) / span_volume,
  };
}
