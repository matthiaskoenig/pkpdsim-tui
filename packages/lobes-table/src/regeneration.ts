/**
 * The curves of the regeneration: what every operation leaves of the liver, and how it grows
 * back over the days that follow.
 *
 * The export carries a run for each of the operations, so all of them are drawn at once and the
 * one on the table is the one in front: a visitor sees that a bigger resection starts lower and
 * climbs more steeply, and that all of them end up in the same place, which is the whole point
 * of the organ.
 */

import {attributes, formatNumber, svg} from "@pkpdsim-tui/tui-kit";
import type {Box, Voice} from "@pkpdsim-tui/tui-kit";
import {LOBE_TEXT} from "./text.ts";
import {tickOf} from "./course.ts";
import {operationName} from "./operations.ts";
import type {Operation} from "./operations.ts";

const PAD = {left: 58, right: 54, top: 30, bottom: 34} as const;
/** The volume of a whole liver, as the plot writes it. */
const FULL = 100;

/** One run, as the columns of the solver carry it. */
export type Run = Readonly<Record<string, readonly number[]>>;

export interface RegenerationView {
  /** The day the course has reached, which runs by itself. */
  readonly day: number;
  readonly days: number;
  readonly selected: Operation;
  /** The run of every operation at the rate on the table, by the id of the operation. */
  readonly runs: ReadonlyMap<string, Run>;
}

export interface Regeneration {
  resize(box: Box): void;
  update(view: RegenerationView): void;
}

interface Curve {
  readonly operation: Operation;
  readonly path: SVGPathElement;
  readonly name: SVGTextElement;
}

/** The volume of a run as a share of the liver it started from, in percent. */
function volumes(series: Readonly<Record<string, readonly number[]>>, whole: number): number[] {
  const column = series["Vli_lobes"] ?? [];
  return column.map(value => (whole <= 0 ? 0 : (value / whole) * FULL));
}

export function createRegeneration(
  parent: SVGSVGElement, voice: Voice, operations: readonly Operation[],
): Regeneration {
  const copy = voice.pick(LOBE_TEXT);
  const root = svg("g", {class: "layer layer--regeneration"}, parent);
  const group = svg("g", {class: "regen"}, root);
  const title = svg("text", {class: "regen-title"}, group);
  const axes = svg("path", {class: "regen-axis", d: ""}, group);
  const whole = svg("path", {class: "regen-whole", d: ""}, group);
  const wholeKey = svg("text", {class: "regen-tick regen-tick--whole"}, group);
  wholeKey.textContent = copy.regeneration.whole;
  const curves: Curve[] = operations.map(operation => ({
    operation,
    path: svg("path", {class: "regen-curve", d: ""}, group),
    name: svg("text", {class: "regen-name", d: ""}, group),
  }));
  const live = svg("path", {class: "regen-curve regen-curve--live", d: ""}, group);
  const cursor = svg("path", {class: "regen-cursor", d: ""}, group);
  const dot = svg("circle", {class: "regen-dot", r: 5}, group);
  const value = svg("text", {class: "regen-value"}, group);
  const low = svg("text", {class: "regen-tick", "text-anchor": "end"}, group);
  low.textContent = "0";
  const ticks: SVGTextElement[] = [];

  // The whole liver, which every curve is a share of: the first point of the intact run.
  const intact = operations.find(one => one.lobes.length === 0) ?? operations[0];

  let box: Box = {x: 0, y: 0, width: 0, height: 0};

  const across = (day: number, days: number): number =>
    box.x + PAD.left + (box.width - PAD.left - PAD.right) * (days <= 0 ? 0 : day / days);
  const up = (percent: number): number =>
    box.y + box.height - PAD.bottom
    - (box.height - PAD.top - PAD.bottom) * Math.min(1, Math.max(0, percent / (FULL * 1.12)));

  const draw = (
    series: Run, days: number, start: number,
  ): string => {
    const time = series["time"] ?? [];
    const percent = volumes(series, start);
    return time
      .map((minutes, index) =>
        `${index === 0 ? "M" : "L"}${across(minutes / (24 * 60), days).toFixed(1)} `
        + `${up(percent[index] ?? 0).toFixed(1)}`)
      .join(" ");
  };

  return {
    resize(next: Box): void {
      box = next;
      attributes(title, {x: box.x + PAD.left, y: box.y + 14});
      axes.setAttribute("d",
        `M${box.x + PAD.left} ${box.y + PAD.top} L${box.x + PAD.left} `
        + `${box.y + box.height - PAD.bottom} L${box.x + box.width - PAD.right} `
        + `${box.y + box.height - PAD.bottom}`);
      whole.setAttribute("d",
        `M${box.x + PAD.left} ${up(FULL)} L${box.x + box.width - PAD.right} ${up(FULL)}`);
      attributes(wholeKey, {x: box.x + PAD.left - 8, y: up(FULL) + 4, "text-anchor": "end"});
      attributes(low, {x: box.x + PAD.left - 8, y: box.y + box.height - PAD.bottom});
    },

    update(view: RegenerationView): void {
      const run = (operation: Operation): Run =>
        view.runs.get(operation.id) ?? operation.series;
      // A whole liver is where the intact one starts, which is what the others are measured
      // against. Until its run is in, the export says what it is.
      const start = (intact === undefined ? undefined : run(intact)["Vli_lobes"]?.[0]) ?? 1;
      // The days under the axis: a tick every few days in an animal, every fortnight in a
      // person, because a human liver is months about what a rat does in a week.
      const {step} = tickOf(view.days);
      const want = Math.max(2, Math.floor(view.days / step));
      while (ticks.length <= want) {
        ticks.push(svg("text", {class: "regen-tick", "text-anchor": "middle"}, group));
      }
      for (const [index, tick] of ticks.entries()) {
        const on = index <= want;
        tick.setAttribute("opacity", on ? "1" : "0");
        if (!on) continue;
        const at = index * step;
        tick.textContent = index === want
          ? `${formatNumber(at, 0)} ${copy.days}`
          : formatNumber(at, 0);
        attributes(tick, {
          x: across(at, view.days), y: box.y + box.height - PAD.bottom + 20,
        });
      }
      // The name stands at the start of its curve, where the operations are far apart: at the
      // end they are all back at a whole liver, which is the point but not a place to write
      // five names. Two operations which leave the same liver would write over each other, so
      // the names are walked down the plot and pushed apart where they meet.
      let last = -Infinity;
      for (const curve of curves) {
        const chosen = curve.operation.id === view.selected.id;
        const series = run(curve.operation);
        curve.path.setAttribute("d", draw(series, view.days, start));
        curve.path.setAttribute("data-chosen", String(chosen));
        const percent = volumes(series, start);
        const where = Math.max(up(percent[0] ?? FULL) - 8, last + 17);
        last = where;
        curve.name.textContent = operationName(voice, curve.operation);
        curve.name.setAttribute("data-chosen", String(chosen));
        attributes(curve.name, {x: box.x + PAD.left + 12, y: where});
      }
      // The operation on the table, drawn in front of the others as the course runs.
      const chosen = run(view.selected);
      live.setAttribute("d", draw(chosen, view.days, start));
      const at = across(view.day, view.days);
      cursor.setAttribute("d",
        `M${at} ${box.y + PAD.top} L${at} ${box.y + box.height - PAD.bottom}`);
      // The day the course has reached stands in the title, where nothing else is written:
      // over the cursor it would cross the curve of the operation at the top of the plot.
      title.textContent = `${copy.regeneration.title} · `
        + copy.dayValue(formatNumber(view.day, view.days > 30 ? 0 : 1));
      const percent = volumes(chosen, start);
      const time = chosen["time"] ?? [];
      const minutes = view.day * 24 * 60;
      let index = 0;
      while (index < time.length - 1 && (time[index + 1] ?? 0) <= minutes) index += 1;
      const now = percent[index] ?? FULL;
      attributes(dot, {cx: at, cy: up(now)});
      value.textContent = `${formatNumber(now, 0)} %`;
      attributes(value, {x: at + 10, y: up(now) - 12});
    },
  };
}
