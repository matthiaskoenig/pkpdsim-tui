/**
 * The course below the scene: what the objects on the table did over the time the model was
 * solved for, and where the dial of the time currently stands.
 *
 * The same individual without the intervention is drawn behind it, so the reader sees the
 * difference the objects made and not only the shape of a curve.
 */

import {formatNumber} from "./format.ts";
import {attributes, svg} from "./svg.ts";

/** The columns of a result, as `toSeries` of the runtime hands them over. */
export type PlotSeries = Readonly<Record<string, readonly number[]>>;

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface PlotTrace {
  readonly id: string;
  readonly label: string;
  readonly column: string;
  readonly unit: string;
  readonly colour: string;
  /** What the column is multiplied with to reach the unit, 1000 for a mM column read in uM. */
  readonly factor?: number;
  /** Decimals of the value beside the course, where the default follows its magnitude. */
  readonly digits?: number;
  /**
   * The scale this course is drawn on, where it is a fixed one. A course which only ever moves
   * within a percent of itself is noise when it is scaled to what it did; a measurement with a
   * meaning of its own, such as a share of cells which are alive, is drawn against that meaning.
   */
  readonly range?: {readonly low: number; readonly high: number};
}

/** The time axis, in the unit the model is solved in. */
export interface PlotAxis {
  /** The end of the course. */
  readonly max: number;
  /** The distance between two ticks. */
  readonly tick: number;
  /** What a value of the axis is multiplied with to reach the unit of the labels. */
  readonly scale: number;
  readonly unit: string;
}

export interface PlotView {
  readonly series: PlotSeries;
  /** The same individual without the intervention, for the line behind. */
  readonly baseline: PlotSeries;
  /** Where the dial of the time stands, in the unit of the model. */
  readonly cursor: number;
  readonly axis: PlotAxis;
}

export interface Plot {
  resize(box: Box): void;
  update(view: PlotView): void;
}

interface TraceElements {
  readonly line: SVGPathElement;
  readonly reference: SVGPathElement;
  readonly dot: SVGCircleElement;
  readonly value: SVGTextElement;
}

/**
 * The lowest and the highest value of a set of courses, in the unit they are read in. `lane` is
 * where a course that does not move at all is put, as a fraction of the height from the bottom,
 * so that two flat courses do not lie on top of each other.
 */
function span(
  courses: readonly PlotSeries[], traces: readonly PlotTrace[], lane = 0.5,
): {low: number; high: number} {
  // A course which says what its scale is keeps it, whatever the numbers do inside it.
  const fixed = traces.map(trace => trace.range).filter(range => range !== undefined);
  if (fixed.length === traces.length && fixed.length > 0) {
    return {
      low: Math.min(...fixed.map(range => range.low)),
      high: Math.max(...fixed.map(range => range.high)),
    };
  }
  let low = Number.POSITIVE_INFINITY;
  let high = Number.NEGATIVE_INFINITY;
  for (const course of courses) {
    for (const trace of traces) {
      const factor = trace.factor ?? 1;
      for (const value of course[trace.column] ?? []) {
        if (!Number.isFinite(value)) continue;
        low = Math.min(low, value * factor);
        high = Math.max(high, value * factor);
      }
    }
  }
  if (!Number.isFinite(low) || !Number.isFinite(high)) return {low: 0, high: 1};
  // A course that does not move is drawn as the straight line it is, not as the noise of the
  // last digits of the solver blown up over the whole height of the plot.
  const flat = Math.max(1e-12, 1e-6 * Math.max(Math.abs(low), Math.abs(high)));
  if (high - low <= flat) {
    const middle = (low + high) / 2;
    const reach = Math.max(Math.abs(middle), 1);
    return {low: middle - lane * reach, high: middle + (1 - lane) * reach};
  }
  const pad = (high - low) * 0.12;
  return {low: low - pad, high: high + pad};
}

export function createPlot(parent: SVGSVGElement, traceDefinitions: readonly PlotTrace[]): Plot {
  const root = svg("g", {class: "layer layer--plot"}, parent);
  const frame = svg("path", {class: "plot-axis", d: ""}, root);
  const ticks = svg("g", {class: "plot-ticks"}, root);
  const cursor = svg("line", {class: "plot-cursor"}, root);
  const cursorLabel = svg("text", {class: "plot-cursor-label"}, root);
  const traces = new Map<string, TraceElements>(traceDefinitions.map(trace => {
    const group = svg("g", {class: `trace trace--${trace.id}`}, root);
    const reference = svg("path", {class: "trace-reference", d: "", stroke: trace.colour}, group);
    const line = svg("path", {class: "trace-line", d: "", stroke: trace.colour}, group);
    const dot = svg("circle", {class: "trace-dot", r: 5, fill: trace.colour}, group);
    const value = svg("text", {class: "trace-value", fill: trace.colour}, group);
    return [trace.id, {line, reference, dot, value}];
  }));

  let box: Box = {x: 0, y: 0, width: 0, height: 0};

  return {
    resize(next: Box): void {
      box = next;
      attributes(frame, {d: `M${box.x} ${box.y + box.height} H${box.x + box.width}`});
    },

    update(view: PlotView): void {
      const end = Math.max(view.axis.max, 1e-9);
      const xOf = (time: number): number => box.x + box.width * Math.min(1, Math.max(0, time / end));
      const times = view.series["time"] ?? view.baseline["time"] ?? [];

      const families = [...new Set(traceDefinitions.map(trace => trace.unit))];
      ticks.replaceChildren();
      for (let time = 0; time <= end + 1e-9; time += Math.max(view.axis.tick, end / 60)) {
        const x = xOf(time);
        svg("line", {
          class: "plot-tick", x1: x, y1: box.y + box.height, x2: x, y2: box.y + box.height + 7,
        }, ticks);
        const label = svg("text", {
          class: "plot-tick-label", x, y: box.y + box.height + 24, "text-anchor": "middle",
        }, ticks);
        label.textContent = formatNumber(time * view.axis.scale, 0);
      }
      const unit = svg("text", {
        class: "plot-tick-label", x: box.x + box.width + 16, y: box.y + box.height + 24,
        "text-anchor": "start",
      }, ticks);
      unit.textContent = view.axis.unit;

      traceDefinitions.forEach((trace, order) => {
        const visual = traces.get(trace.id);
        if (visual === undefined) return;
        const factor = trace.factor ?? 1;
        // Courses that are read in the same unit share one scale, because the reader compares
        // them with each other; a course in a unit of its own gets a scale of its own.
        const family = traceDefinitions.filter(candidate => candidate.unit === trace.unit);
        const lane = (families.indexOf(trace.unit) + 1) / (families.length + 1);
        const {low, high} = span([view.series, view.baseline], family, lane);
        const yOf = (value: number): number =>
          box.y + box.height * (1 - (value - low) / (high - low));
        const pathOf = (course: PlotSeries): string => {
          const values = course[trace.column];
          const courseTimes = course["time"];
          if (values === undefined || courseTimes === undefined || values.length === 0) return "";
          return values
            .map((value, index) =>
              `${index === 0 ? "M" : "L"}${xOf(courseTimes[index] ?? 0).toFixed(1)} ${yOf(value * factor).toFixed(1)}`)
            .join(" ");
        };
        attributes(visual.line, {d: pathOf(view.series)});
        attributes(visual.reference, {d: pathOf(view.baseline)});

        let row = 0;
        while (row + 1 < times.length && (times[row + 1] ?? 0) <= view.cursor + 1e-9) row++;
        const sampled = view.series[trace.column]?.[row];
        const value = sampled === undefined ? undefined : sampled * factor;
        if (value === undefined) {
          attributes(visual.dot, {opacity: 0});
          visual.value.textContent = "";
          return;
        }
        attributes(visual.dot, {opacity: 1, cx: xOf(times[row] ?? 0), cy: yOf(value)});
        const left = xOf(times[row] ?? 0) < box.x + box.width * 0.6;
        // Two courses that sit at the same height would write over each other, so the labels
        // of the courses are stacked in the order they were declared in.
        attributes(visual.value, {
          x: xOf(times[row] ?? 0) + (left ? 12 : -12), y: yOf(value) - 12 - order * 19,
          "text-anchor": left ? "start" : "end",
        });
        visual.value.textContent = `${trace.label} ${formatNumber(value, trace.digits ?? 2)} ${trace.unit}`;
      });

      const x = xOf(view.cursor);
      attributes(cursor, {x1: x, y1: box.y, x2: x, y2: box.y + box.height});
      attributes(cursorLabel, {
        x, y: box.y - 8, "text-anchor": x > box.x + box.width - 90 ? "end" : "middle",
      });
      cursorLabel.textContent = `${formatNumber(view.cursor * view.axis.scale, 1)} ${view.axis.unit}`;
    },
  };
}
