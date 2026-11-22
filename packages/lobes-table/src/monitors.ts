/**
 * The two monitors beside the liver: the pressure around it and the blood through it, over the
 * whole course the table runs, with the day it has reached marked in both.
 *
 * A resection is read on the volume of the remnant, which is what the plot under the liver
 * shows. What it costs is read here: the same blood of the gut has to pass a smaller liver, so
 * the portal pressure rises the day the operation happens and comes back down as the liver
 * grows. The liver nobody operated on is drawn behind each curve, so the cost is the gap
 * between the two rather than a number to remember.
 */

import {attributes, clamp, formatNumber, LAB_ROOM, svg} from "@pkpdsim-tui/tui-kit";
import type {Box, Viewport, Voice} from "@pkpdsim-tui/tui-kit";
import {LOBE_TEXT} from "./text.ts";
import {tickOf} from "./course.ts";

/** One run, as the columns of the solver carry it. */
export type Run = Readonly<Record<string, readonly number[]>>;

/** The column of cards, in the pixels of the surface. */
const CARD = {width: 430, height: 250, gap: 16, right: 24, top: 124, bottom: 24} as const;
/** The plot inside a card. */
const PAD = {left: 56, right: 20, top: 84, bottom: 34} as const;

/** The colours of the three vessels, which the whole collection draws them in. */
const COLOUR = {portal: "#8a4fc8", artery: "#cf4034", hepatic: "#2f6fd0"} as const;

interface TraceDefinition {
  readonly id: string;
  readonly label: string;
  readonly column: string;
  readonly colour: string;
  readonly digits: number;
}

export interface MonitorView {
  /** The run of the operation on the table. */
  readonly series: Run;
  /** The same liver without the operation, which the cost is read against. */
  readonly baseline: Run;
  /** The day the course has reached, and how long it runs. */
  readonly day: number;
  readonly days: number;
}

export interface Monitors {
  resize(viewport: Viewport): void;
  update(view: MonitorView): void;
}

/** How tall a card is on this surface: the two of them share what is left beside the liver. */
function cardHeight(viewport: Viewport): number {
  const room = viewport.height - CARD.top - CARD.bottom - LAB_ROOM - CARD.gap;
  return clamp(room / 2, 160, CARD.height);
}

/** What the column takes of the width of the surface. */
export function monitorWidth(viewport: Viewport): number {
  return Math.min(CARD.width, viewport.width * 0.3) + CARD.right;
}

/** Where a card stands, in the pixels of the surface. */
function cardBox(viewport: Viewport, index: number): Box {
  const width = Math.min(CARD.width, viewport.width * 0.3);
  const height = cardHeight(viewport);
  return {
    x: viewport.width - CARD.right - width,
    y: CARD.top + index * (height + CARD.gap),
    width, height,
  };
}

interface TraceElements {
  readonly definition: TraceDefinition;
  readonly line: SVGPathElement;
  readonly reference: SVGPathElement;
  readonly dot: SVGCircleElement;
  readonly key: SVGTextElement;
}

interface Card {
  readonly index: number;
  readonly unit: string;
  readonly frame: SVGRectElement;
  readonly title: SVGTextElement;
  readonly axis: SVGPathElement;
  readonly high: SVGTextElement;
  readonly low: SVGTextElement;
  readonly cursor: SVGPathElement;
  readonly ticks: SVGTextElement[];
  readonly traces: readonly TraceElements[];
  box: Box;
}

/** The lowest and the highest value two runs reach in these columns, with a little air. */
function span(runs: readonly Run[], traces: readonly TraceDefinition[]): {low: number; high: number} {
  let low = Number.POSITIVE_INFINITY;
  let high = Number.NEGATIVE_INFINITY;
  for (const run of runs) {
    for (const trace of traces) {
      for (const value of run[trace.column] ?? []) {
        if (!Number.isFinite(value)) continue;
        low = Math.min(low, value);
        high = Math.max(high, value);
      }
    }
  }
  if (!Number.isFinite(low) || !Number.isFinite(high)) return {low: 0, high: 1};
  // A liver nobody operated on holds every one of these numbers still, and the last digits of
  // the solver are not a mountain range: a course which does not move is drawn as a line.
  if (high - low < Math.max(1e-6, high * 1e-4)) return {low: 0, high: Math.max(high * 1.4, 1)};
  const pad = (high - low) * 0.15;
  return {low: Math.max(0, low - pad), high: high + pad};
}

export function createMonitors(parent: SVGSVGElement, voice: Voice): Monitors {
  const copy = voice.pick(LOBE_TEXT).monitors;
  const root = svg("g", {class: "layer layer--monitors"}, parent);

  const build = (
    index: number, title: string, unit: string, definitions: readonly TraceDefinition[],
  ): Card => {
    const group = svg("g", {class: "monitor"}, root);
    const frame = svg("rect", {class: "monitor-frame", rx: 14}, group);
    const label = svg("text", {class: "monitor-title"}, group);
    label.textContent = `${title} · ${unit}`;
    const axis = svg("path", {class: "monitor-axis", d: ""}, group);
    const high = svg("text", {class: "monitor-tick", "text-anchor": "end"}, group);
    const low = svg("text", {class: "monitor-tick", "text-anchor": "end"}, group);
    const cursor = svg("path", {class: "monitor-cursor", d: ""}, group);
    const traces = definitions.map(definition => ({
      definition,
      // The liver nobody operated on, behind the one on the table.
      reference: svg("path", {
        class: "monitor-reference", d: "", stroke: definition.colour,
      }, group),
      line: svg("path", {class: "monitor-line", d: "", stroke: definition.colour}, group),
      dot: svg("circle", {class: "monitor-dot", r: 4.5, fill: definition.colour}, group),
      key: svg("text", {class: "monitor-key", fill: definition.colour}, group),
    }));
    return {
      index, unit, frame, title: label, axis, high, low, cursor, ticks: [], traces,
      box: {x: 0, y: 0, width: 0, height: 0},
    };
  };

  const cards: readonly Card[] = [
    build(0, copy.pressure, "mmHg", [
      {id: "portal", label: copy.portal, column: "CV_P_po", colour: COLOUR.portal, digits: 1},
      {id: "liver", label: copy.liver, column: "CV_P_li", colour: COLOUR.hepatic, digits: 1},
    ]),
    build(1, copy.flow, "l/min", [
      {id: "total", label: copy.total, column: "Qh", colour: COLOUR.hepatic, digits: 2},
      {id: "portal-flow", label: copy.portal, column: "Qpo", colour: COLOUR.portal, digits: 2},
      {id: "arterial-flow", label: copy.artery, column: "Qha", colour: COLOUR.artery, digits: 2},
    ]),
  ];

  return {
    resize(viewport: Viewport): void {
      for (const card of cards) {
        const box = cardBox(viewport, card.index);
        card.box = box;
        attributes(card.frame, {x: box.x, y: box.y, width: box.width, height: box.height});
        attributes(card.title, {x: box.x + 20, y: box.y + 30});
        const plot = {
          left: box.x + PAD.left, right: box.x + box.width - PAD.right,
          top: box.y + PAD.top, bottom: box.y + box.height - PAD.bottom,
        };
        attributes(card.axis, {
          d: `M${plot.left} ${plot.top} L${plot.left} ${plot.bottom} L${plot.right} ${plot.bottom}`,
        });
        attributes(card.high, {x: plot.left - 8, y: plot.top + 5});
        attributes(card.low, {x: plot.left - 8, y: plot.bottom + 4});
        // The keys of the courses stand in one row under the title, so that no label is ever
        // written over a curve: the value beside the name is the one at the day of the cursor.
        const step = (box.width - 32) / card.traces.length;
        card.traces.forEach((trace, order) => {
          attributes(trace.key, {x: box.x + 20 + order * step, y: box.y + 58});
        });
      }
    },

    update(view: MonitorView): void {
      const day = 24 * 60;
      const end = Math.max(view.days * day, 1);
      const {step} = tickOf(view.days);
      for (const card of cards) {
        const plot = {
          left: card.box.x + PAD.left, right: card.box.x + card.box.width - PAD.right,
          top: card.box.y + PAD.top, bottom: card.box.y + card.box.height - PAD.bottom,
        };
        const {low, high} = span(
          [view.series, view.baseline], card.traces.map(trace => trace.definition));
        const across = (minutes: number): number =>
          plot.left + (plot.right - plot.left) * clamp(minutes / end, 0, 1);
        const up = (value: number): number =>
          plot.bottom - (plot.bottom - plot.top) * clamp((value - low) / (high - low), 0, 1);
        card.high.textContent = `${formatNumber(high, high < 10 ? 1 : 0)}`;
        card.low.textContent = `${formatNumber(low, low < 10 && low > 0 ? 1 : 0)}`;

        // The days under the axis, as the course below the liver writes them.
        const want = Math.max(2, Math.floor(view.days / step));
        while (card.ticks.length <= want) {
          card.ticks.push(svg("text", {
            class: "monitor-tick", "text-anchor": "middle",
          }, card.frame.parentNode as SVGGElement));
        }
        for (const [index, tick] of card.ticks.entries()) {
          const on = index <= want;
          tick.setAttribute("opacity", on ? "1" : "0");
          if (!on) continue;
          const at = index * step;
          tick.textContent = index === want
            ? `${formatNumber(at, 0)} ${copy.days}`
            : formatNumber(at, 0);
          attributes(tick, {x: across(at * day), y: plot.bottom + 20});
        }

        for (const trace of card.traces) {
          const path = (run: Run): string => {
            const values = run[trace.definition.column];
            const times = run["time"];
            if (values === undefined || times === undefined || values.length === 0) return "";
            return values
              .map((value, index) =>
                `${index === 0 ? "M" : "L"}${across(times[index] ?? 0).toFixed(1)} `
                + `${up(value).toFixed(1)}`)
              .join(" ");
          };
          attributes(trace.line, {d: path(view.series)});
          attributes(trace.reference, {d: path(view.baseline)});
          const times = view.series["time"] ?? [];
          const minutes = view.day * day;
          let index = 0;
          while (index < times.length - 1 && (times[index + 1] ?? 0) <= minutes) index += 1;
          const value = view.series[trace.definition.column]?.[index];
          if (value === undefined) {
            attributes(trace.dot, {opacity: 0});
            trace.key.textContent = trace.definition.label;
            continue;
          }
          attributes(trace.dot, {opacity: 1, cx: across(times[index] ?? 0), cy: up(value)});
          // The unit stands once, in the title of the card: three keys which each carry it
          // are three labels which write over each other.
          trace.key.textContent = `${trace.definition.label} `
            + `${formatNumber(value, trace.definition.digits)}`;
        }

        const at = across(view.day * day);
        attributes(card.cursor, {d: `M${at} ${plot.top} L${at} ${plot.bottom}`});
      }
    },
  };
}
