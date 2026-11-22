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
  /** The courses this one replaced, which fade out behind it. */
  ghosts: SVGPathElement[];
  readonly history: SVGGElement;
}

/**
 * How long a course which was replaced takes to lose half of what is left of it, in
 * milliseconds. A visitor who turns an object sees the curve they had a moment ago still
 * behind the new one, which is what tells them that what they did moved it and in which
 * direction. It is gone within a few seconds, so the plot does not silt up.
 */
const HALF_LIFE = 1600;

/** How many replaced courses are kept behind a trace. */
const GHOSTS = 5;

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

/**
 * The scale a family of courses is drawn on, which only ever grows.
 *
 * A plot whose axis follows what the numbers are doing shows the same picture whatever the
 * objects are set to: the curve fills the box, and the reader sees noise blown up to the full
 * height. The axis of this plot is fixed at what it first held, and widens where a course
 * leaves it, so that turning an object moves the curve inside the box instead of moving the
 * box around the curve.
 */
function held(
  kept: Map<string, {low: number; high: number}>, key: string,
  next: {low: number; high: number},
): {low: number; high: number} {
  const before = kept.get(key);
  const span = before === undefined
    ? next
    : {low: Math.min(before.low, next.low), high: Math.max(before.high, next.high)};
  kept.set(key, span);
  return span;
}

/** The ticks of a scale: the ends and the round numbers between them. */
function axisTicks(low: number, high: number): readonly number[] {
  const reach = high - low;
  if (!(reach > 0)) return [low];
  const step = 10 ** Math.floor(Math.log10(reach / 2));
  const steps = [step, step * 2, step * 5, step * 10];
  const pick = steps.find(one => reach / one <= 5) ?? step * 10;
  const ticks: number[] = [];
  for (let value = Math.ceil(low / pick) * pick; value <= high + 1e-9; value += pick) {
    ticks.push(Math.abs(value) < pick / 1e6 ? 0 : value);
  }
  return ticks.length >= 2 ? ticks : [low, high];
}

export function createPlot(parent: SVGSVGElement, traceDefinitions: readonly PlotTrace[]): Plot {
  const root = svg("g", {class: "layer layer--plot"}, parent);
  const frame = svg("path", {class: "plot-axis", d: ""}, root);
  const ticks = svg("g", {class: "plot-ticks"}, root);
  const scales = svg("g", {class: "plot-scales"}, root);
  const cursor = svg("line", {class: "plot-cursor"}, root);
  const cursorLabel = svg("text", {class: "plot-cursor-label"}, root);
  const traces = new Map<string, TraceElements>(traceDefinitions.map(trace => {
    const group = svg("g", {class: `trace trace--${trace.id}`}, root);
    const history = svg("g", {class: "trace-history"}, group);
    const reference = svg("path", {class: "trace-reference", d: "", stroke: trace.colour}, group);
    const line = svg("path", {class: "trace-line", d: "", stroke: trace.colour}, group);
    const dot = svg("circle", {class: "trace-dot", r: 5, fill: trace.colour}, group);
    const value = svg("text", {class: "trace-value", fill: trace.colour}, group);
    return [trace.id, {line, reference, dot, value, ghosts: [], history}];
  }));

  let box: Box = {x: 0, y: 0, width: 0, height: 0};
  const kept = new Map<string, {low: number; high: number}>();
  // The courses which were replaced lose half of what is left of them every half life, in the
  // time of the clock and not in the number of the updates: a table which is left alone fades
  // what the last visitor did, and a table which is turned fast keeps every step of the turn.
  let fading = 0;
  const fade = (): void => {
    const now = performance.now();
    let alive = false;
    for (const visual of traces.values()) {
      for (const ghost of visual.ghosts) {
        const born = Number(ghost.dataset["born"] ?? now);
        const left = 0.5 ** ((now - born) / HALF_LIFE);
        if (left < 0.04) ghost.remove();
        else {
          attributes(ghost, {opacity: left});
          alive = true;
        }
      }
      visual.ghosts = visual.ghosts.filter(ghost => ghost.isConnected);
    }
    fading = alive ? requestAnimationFrame(fade) : 0;
  };

  return {
    resize(next: Box): void {
      box = next;
      attributes(frame, {
        d: `M${box.x} ${box.y} V${box.y + box.height} H${box.x + box.width}`,
      });
    },

    update(view: PlotView): void {
      const end = Math.max(view.axis.max, 1e-9);
      const xOf = (time: number): number => box.x + box.width * Math.min(1, Math.max(0, time / end));
      const times = view.series["time"] ?? view.baseline["time"] ?? [];

      const families = [...new Set(traceDefinitions.map(trace => trace.unit))];
      ticks.replaceChildren();
      scales.replaceChildren();
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

      // Where the courses write their value at the cursor, which is sorted out once every
      // course has been drawn: two courses which happen to meet would write over each other.
      const labels: {element: SVGTextElement; y: number}[] = [];
      traceDefinitions.forEach((trace, order) => {
        const visual = traces.get(trace.id);
        if (visual === undefined) return;
        const factor = trace.factor ?? 1;
        // Courses that are read in the same unit share one scale, because the reader compares
        // them with each other; a course in a unit of its own gets a scale of its own.
        const family = traceDefinitions.filter(candidate => candidate.unit === trace.unit);
        const rank = families.indexOf(trace.unit);
        const lane = (rank + 1) / (families.length + 1);
        const {low, high} = held(
          kept, trace.unit, span([view.series, view.baseline], family, lane));
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
        // The scale of the plot, written down its left side, with the unit on its highest
        // value. It is the scale of the first family of courses; a second unit gets no second
        // axis, because the right of the box is where the courses write their own value and
        // the box reaches the edge of the glass. Every course says its value and its unit at
        // the cursor, which is what a reader of a second unit needs.
        if (family[0]?.id === trace.id && rank === 0) {
          const at = box.x - 8;
          const digits = Math.abs(high - low) >= 8 ? 0 : 1;
          const ticks = axisTicks(low, high);
          const top = ticks.at(-1);
          for (const value of ticks) {
            const y = yOf(value);
            if (y < box.y - 1 || y > box.y + box.height + 1) continue;
            svg("line", {class: "plot-tick", x1: box.x, y1: y, x2: box.x - 6, y2: y}, scales);
            const label = svg("text", {
              class: value === top ? "plot-scale-unit" : "plot-scale-label", x: at, y: y + 5,
              "text-anchor": "end",
            }, scales);
            // The unit stands on the highest value of the scale rather than on a line of its
            // own, which would be a second thing written where the cursor says the time.
            label.textContent = value === top
              ? `${formatNumber(value, digits)} ${trace.unit}`
              : formatNumber(value, digits);
          }
        }
        // What the course was before the objects were last moved stays behind it and fades,
        // so a visitor who turns something sees which way the curve went.
        const drawn = pathOf(view.series);
        const before = visual.line.getAttribute("d") ?? "";
        if (before !== "" && before !== drawn) {
          const ghost = svg("path", {
            class: "trace-ghost", d: before, stroke: trace.colour, opacity: 1,
          }, visual.history);
          ghost.dataset["born"] = String(performance.now());
          visual.ghosts.push(ghost);
          while (visual.ghosts.length > GHOSTS) visual.ghosts.shift()?.remove();
          if (fading === 0) fading = requestAnimationFrame(fade);
        }
        attributes(visual.line, {d: drawn});
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
        // A course which runs along the top of the plot would write its label over the time of
        // the cursor, which stands above the box, so the labels stay inside the box.
        const label = Math.max(box.y + 14, yOf(value) - 12 - order * 19);
        attributes(visual.value, {
          x: xOf(times[row] ?? 0) + (left ? 12 : -12), y: label,
          "text-anchor": left ? "start" : "end",
        });
        visual.value.textContent = `${trace.label} ${formatNumber(value, trace.digits ?? 2)} ${trace.unit}`;
        labels.push({element: visual.value, y: label});
      });

      // Two courses which run into each other carry their labels into each other as well, and
      // the order they were declared in is no help when the values have crossed. They are
      // pushed apart downwards, from the highest one, and kept inside the box.
      const gap = 19;
      labels.sort((a, b) => a.y - b.y);
      let floor = box.y + 14;
      for (const label of labels) {
        const y = Math.min(Math.max(label.y, floor), box.y + box.height - 4);
        attributes(label.element, {y});
        floor = y + gap;
      }

      const x = xOf(view.cursor);
      attributes(cursor, {x1: x, y1: box.y, x2: x, y2: box.y + box.height});
      attributes(cursorLabel, {
        x, y: box.y - 8, "text-anchor": x > box.x + box.width - 90 ? "end" : "middle",
      });
      cursorLabel.textContent = `${formatNumber(view.cursor * view.axis.scale, 1)} ${view.axis.unit}`;
    },
  };
}
