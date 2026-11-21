/**
 * The pharmacokinetics of a solved course: what a reader of a concentration curve looks up
 * first, computed from the curve the table just solved.
 *
 * Everything here is arithmetic on the result. The exposure is the area under the simulated
 * window, not an extrapolation to infinity, and the half life is the slope of the last part of
 * the course, where the curve is log linear.
 */

import {peak, trapezoid} from "@pkpdsim-tui/core-runtime";
import type {Series} from "@pkpdsim-tui/core-runtime";

export interface Pharmacokinetics {
  /** The highest concentration of the course. */
  readonly cmax: number;
  /** When it is reached. */
  readonly tmax: number;
  /** The area under the course over the window that was simulated. */
  readonly auc: number;
  /** The half life of the terminal part, NaN when the course does not fall. */
  readonly halflife: number;
}

/** The slope of a straight line through the logarithm of the last `share` of a course. */
function terminalSlope(times: readonly number[], values: readonly number[], share: number): number {
  const from = Math.max(0, Math.floor(times.length * (1 - share)));
  const points: {x: number; y: number}[] = [];
  for (let index = from; index < times.length; index++) {
    const value = values[index];
    const time = times[index];
    if (value === undefined || time === undefined || value <= 0) continue;
    points.push({x: time, y: Math.log(value)});
  }
  if (points.length < 3) return Number.NaN;
  const n = points.length;
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / n;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / n;
  let covariance = 0;
  let variance = 0;
  for (const point of points) {
    covariance += (point.x - meanX) * (point.y - meanY);
    variance += (point.x - meanX) ** 2;
  }
  return variance <= 0 ? Number.NaN : covariance / variance;
}

/**
 * The pharmacokinetics of one column of a course. `factor` converts the column into the unit the
 * table shows, and the time is taken as the model solves it.
 */
export function pharmacokinetics(
  series: Series, column: string, {factor = 1, terminal = 1 / 3} = {},
): Pharmacokinetics {
  const times = series["time"] ?? [];
  const raw = series[column] ?? [];
  const values = raw.map(value => value * factor);
  if (times.length === 0 || values.length === 0) {
    return {cmax: 0, tmax: Number.NaN, auc: 0, halflife: Number.NaN};
  }
  const highest = peak(times, values);
  const slope = terminalSlope(times, values, terminal);
  return {
    cmax: highest.value,
    tmax: highest.time,
    auc: trapezoid(times, values),
    halflife: Number.isFinite(slope) && slope < 0 ? Math.LN2 / -slope : Number.NaN,
  };
}

/** The last value of a column, which is what has accumulated by the end of the course. */
export function finalValue(series: Series, column: string, factor = 1): number {
  const values = series[column];
  if (values === undefined || values.length === 0) return 0;
  return (values[values.length - 1] as number) * factor;
}
