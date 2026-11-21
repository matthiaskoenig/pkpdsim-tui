/** Reading a result: the flat array of the worker as the columns an application plots. */

import type {Series, SimulationResult} from "./types.ts";

export function linspace(start: number, end: number, steps: number): number[] {
  const count = Math.max(1, Math.round(steps));
  return Array.from({length: count + 1}, (_, index) => start + ((end - start) * index) / count);
}

/** One column of a result. */
export function column(result: SimulationResult, name: string): number[] {
  const index = result.columns.indexOf(name);
  if (index < 0) throw new RangeError(`The result has no column "${name}".`);
  const width = result.columns.length;
  const values = new Array<number>(result.nRows);
  for (let row = 0; row < result.nRows; row++) values[row] = result.values[row * width + index] as number;
  return values;
}

/** Every column of a result, by name. */
export function toSeries(result: SimulationResult): Series {
  const width = result.columns.length;
  const series: Record<string, number[]> = {};
  for (const name of result.columns) series[name] = new Array<number>(result.nRows);
  for (let row = 0; row < result.nRows; row++) {
    for (let index = 0; index < width; index++) {
      const name = result.columns[index] as string;
      (series[name] as number[])[row] = result.values[row * width + index] as number;
    }
  }
  return series;
}

/** The row of a series at or before a time, every column of it by name. */
export function sampleAt(series: Series, time: number): Record<string, number> {
  const times = series["time"];
  if (times === undefined || times.length === 0) return {};
  let row = 0;
  while (row + 1 < times.length && (times[row + 1] as number) <= time + 1e-9) row++;
  return Object.fromEntries(
    Object.entries(series).map(([name, values]) => [name, values[row] as number]),
  );
}

/** The trapezoid area under a course, which is an exposure when the course is a concentration. */
export function trapezoid(times: readonly number[], values: readonly number[]): number {
  let area = 0;
  for (let index = 1; index < times.length; index++) {
    const dt = (times[index] as number) - (times[index - 1] as number);
    area += 0.5 * dt * ((values[index] as number) + (values[index - 1] as number));
  }
  return area;
}

/** The largest value of a course and the time it is reached at. */
export function peak(times: readonly number[], values: readonly number[]): {value: number; time: number} {
  let best = {value: Number.NEGATIVE_INFINITY, time: Number.NaN};
  for (let index = 0; index < values.length; index++) {
    const value = values[index] as number;
    if (value > best.value) best = {value, time: times[index] as number};
  }
  return best;
}
