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
import {operationName} from "./operations.ts";
import type {Operation} from "./operations.ts";

const PAD = {left: 58, right: 54, top: 30, bottom: 34} as const;
/** The volume of a whole liver, as the plot writes it. */
const FULL = 100;

export interface RegenerationView {
  /** The day the dial is at. */
  readonly day: number;
  readonly days: number;
  readonly selected: Operation;
  /** The run of the selected operation as this table solved it, which is drawn in front. */
  readonly series: Readonly<Record<string, readonly number[]>>;
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
  title.textContent = copy.regeneration.title;
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

  // The whole liver of this export, which every curve is a share of: the first point of the run
  // of the intact liver.
  const intact = operations.find(one => one.lobes.length === 0) ?? operations[0];
  const start = intact?.series["Vli_lobes"]?.[0] ?? 1;

  let box: Box = {x: 0, y: 0, width: 0, height: 0};

  const across = (day: number, days: number): number =>
    box.x + PAD.left + (box.width - PAD.left - PAD.right) * (days <= 0 ? 0 : day / days);
  const up = (percent: number): number =>
    box.y + box.height - PAD.bottom
    - (box.height - PAD.top - PAD.bottom) * Math.min(1, Math.max(0, percent / (FULL * 1.12)));

  const draw = (
    series: Readonly<Record<string, readonly number[]>>, days: number,
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
      // The days under the axis, one tick a day, as many as the course is long.
      const want = Math.max(2, Math.round(view.days));
      while (ticks.length <= want) {
        ticks.push(svg("text", {class: "regen-tick", "text-anchor": "middle"}, group));
      }
      for (const [index, tick] of ticks.entries()) {
        const on = index <= want;
        tick.setAttribute("opacity", on ? "1" : "0");
        if (!on) continue;
        tick.textContent = index === want
          ? `${formatNumber(index, 0)} ${copy.days}`
          : formatNumber(index, 0);
        attributes(tick, {
          x: across(index, view.days), y: box.y + box.height - PAD.bottom + 20,
        });
      }
      // The name stands at the start of its curve, where the operations are far apart: at the
      // end they are all back at a whole liver, which is the point but not a place to write
      // five names. Two operations which leave the same liver would write over each other, so
      // the names are walked down the plot and pushed apart where they meet.
      let last = -Infinity;
      for (const curve of curves) {
        const chosen = curve.operation.id === view.selected.id;
        curve.path.setAttribute("d", draw(curve.operation.series, view.days));
        curve.path.setAttribute("data-chosen", String(chosen));
        const percent = volumes(curve.operation.series, start);
        const where = Math.max(up(percent[0] ?? FULL) - 8, last + 17);
        last = where;
        curve.name.textContent = operationName(voice, curve.operation);
        curve.name.setAttribute("data-chosen", String(chosen));
        attributes(curve.name, {x: box.x + PAD.left + 12, y: where});
      }
      // The run this table solved, over the curve of the export it belongs to.
      live.setAttribute("d", draw(view.series, view.days));
      const at = across(view.day, view.days);
      cursor.setAttribute("d",
        `M${at} ${box.y + PAD.top} L${at} ${box.y + box.height - PAD.bottom}`);
      const percent = volumes(view.series, start);
      const time = view.series["time"] ?? [];
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
