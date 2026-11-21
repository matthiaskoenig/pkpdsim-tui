/**
 * The beats, large enough to read from across the table: the pressure in the aorta and in the
 * left ventricle over three cycles of the solved heart, with the moment the table is at marked
 * on them. One panel, at the far side of the body from the panel of the table.
 *
 * Three beats rather than one, because a heart is a rhythm: a faster heart puts more beats in
 * the same window, which is the thing to see. Behind them, dashed, is the heart this visitor
 * started with, so every change is read against where it came from.
 *
 * The curves are the course the compiled model returned. The panel only draws them.
 */

import type {HeartSummary} from "@pkpdsim-tui/cardio-sim";
import {attributes, formatNumber, svg} from "@pkpdsim-tui/tui-kit";
import type {Box, Viewport, Voice} from "@pkpdsim-tui/tui-kit";
import {CARDIO_TEXT} from "./text.ts";
import type {CardioCopy} from "./text.ts";
import type {BeatCycle, BeatFrame} from "./beat.ts";

/** The size of a panel and the air around its curves, in the pixels of the surface. */
const PANEL = {width: 420, height: 280, margin: 24} as const;
/**
 * The window the beats are drawn in, in seconds: three beats of a heart at rest. It is a time
 * and not a number of beats, so a faster heart puts more beats into the same window, which is
 * the thing to see.
 */
const WINDOW = 2.4;
const PAD = {left: 46, right: 16, top: 86, bottom: 34} as const;

export interface PulseView {
  readonly cycle: BeatCycle;
  readonly frame: BeatFrame;
  readonly summary: HeartSummary;
  /** The heart before anything was turned, drawn dashed behind the one on the table. */
  readonly baseline?: BeatCycle | undefined;
}

export interface Pulse {
  resize(viewport: Viewport): void;
  update(view: PulseView | undefined): void;
}

interface Panel {
  readonly group: SVGGElement;
  readonly pressure: SVGTextElement;
  readonly rate: SVGTextElement;
  readonly arterial: SVGPathElement;
  readonly ventricular: SVGPathElement;
  readonly base: SVGPathElement;
  readonly baseKey: SVGTextElement;
  readonly cursor: SVGPathElement;
  readonly dot: SVGCircleElement;
  readonly high: SVGTextElement;
  readonly low: SVGTextElement;
  readonly period: SVGTextElement;
}

function panel(parent: SVGGElement, copy: CardioCopy["pulse"]): Panel {
  const group = svg("g", {class: "pulse"}, parent);
  svg("rect", {
    class: "pulse-frame", x: 0, y: 0, width: PANEL.width, height: PANEL.height, rx: 14,
  }, group);
  const title = svg("text", {class: "pulse-title", x: PAD.left - 24, y: 30}, group);
  title.textContent = copy.title;
  const pressure = svg("text", {class: "pulse-number", x: PAD.left - 24, y: 64}, group);
  const rate = svg("text", {
    class: "pulse-rate", x: PANEL.width - PAD.right, y: 64, "text-anchor": "end",
  }, group);
  const plot = svg("g", {class: "pulse-plot"}, group);
  svg("path", {
    class: "pulse-axis",
    d: `M${PAD.left} ${PAD.top} L${PAD.left} ${PANEL.height - PAD.bottom} `
      + `L${PANEL.width - PAD.right} ${PANEL.height - PAD.bottom}`,
  }, plot);
  // The heart this visitor started with, behind everything else.
  const base = svg("path", {class: "pulse-trace pulse-trace--base", d: ""}, plot);
  const ventricular = svg("path", {class: "pulse-trace pulse-trace--ventricle", d: ""}, plot);
  const arterial = svg("path", {class: "pulse-trace pulse-trace--aorta", d: ""}, plot);
  const cursor = svg("path", {class: "pulse-cursor", d: ""}, plot);
  const dot = svg("circle", {class: "pulse-dot", cx: PAD.left, cy: PAD.top, r: 5}, plot);
  const high = svg("text", {
    class: "pulse-tick", x: PAD.left - 8, y: PAD.top + 4, "text-anchor": "end",
  }, plot);
  const low = svg("text", {
    class: "pulse-tick", x: PAD.left - 8, y: PANEL.height - PAD.bottom, "text-anchor": "end",
  }, plot);
  const period = svg("text", {
    class: "pulse-tick", x: PANEL.width - PAD.right, y: PANEL.height - PAD.bottom + 18,
    "text-anchor": "end",
  }, plot);
  const aorta = svg("text", {class: "pulse-key pulse-key--aorta", x: PAD.left, y: PANEL.height - PAD.bottom + 18}, plot);
  aorta.textContent = copy.aorta;
  const ventricle = svg("text", {
    class: "pulse-key pulse-key--ventricle", x: PAD.left + 48, y: PANEL.height - PAD.bottom + 18,
  }, plot);
  ventricle.textContent = copy.ventricle;
  // The key of the dashed curve, which is only drawn once there is one.
  const baseKey = svg("text", {
    class: "pulse-key pulse-key--base", x: PAD.left + 112, y: PANEL.height - PAD.bottom + 18,
  }, plot);
  baseKey.textContent = copy.baseline;
  baseKey.setAttribute("opacity", "0");
  return {
    group, pressure, rate, arterial, ventricular, base, baseKey, cursor, dot, high, low, period,
  };
}

export function createPulse(parent: SVGSVGElement, voice: Voice): Pulse {
  const root = svg("g", {class: "layer layer--pulse", opacity: 0}, parent);
  const panels = [panel(root, voice.pick(CARDIO_TEXT).pulse)];
  let drawn: BeatCycle | undefined;
  let drawnBase: BeatCycle | undefined;
  // Which of the three beats the table is in. The phase of a frame is the phase of one cycle,
  // so the panel counts the cycles itself and the cursor walks across the whole window.
  let beat = 0;
  let last = 0;
  let box: Box = {x: 0, y: 0, width: PANEL.width, height: PANEL.height};

  /** The pressures both hearts reach, so that the one behind is drawn to the same scale. */
  const range = (cycle: BeatCycle, baseline: BeatCycle | undefined): {low: number; high: number} => ({
    low: Math.min(0, cycle.minArterial, baseline?.minArterial ?? 0),
    high: Math.max(cycle.maxArterial, baseline?.maxArterial ?? 0),
  });

  /** Where a pressure sits in the plot, over the span of the curves with a little air. */
  const place = (span: {low: number; high: number}, pressure: number): number => {
    const width = span.high - span.low;
    const fraction = width <= 0 ? 0.5 : (pressure - span.low) / width;
    const top = PAD.top;
    const bottom = PANEL.height - PAD.bottom;
    return bottom - (bottom - top) * 0.95 * fraction;
  };

  /** Where a moment of the window sits across the plot. */
  const across = (seconds: number): number =>
    PAD.left + (PANEL.width - PAD.left - PAD.right) * Math.min(1, Math.max(0, seconds / WINDOW));

  /** One cycle, repeated over the window: a solved beat is a period, so it simply repeats. */
  const trace = (
    cycle: BeatCycle, values: readonly number[], span: {low: number; high: number},
  ): string => {
    const period = 60 / Math.max(1, cycle.heartRate);
    const beats = Math.ceil(WINDOW / period);
    const parts: string[] = [];
    for (let index = 0; index < beats; index += 1) {
      for (const [at, phase] of cycle.phase.entries()) {
        const seconds = (index + phase) * period;
        if (seconds > WINDOW) break;
        const x = across(seconds);
        const y = place(span, values[at] ?? 0);
        parts.push(`${parts.length === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
      }
    }
    return parts.join(" ");
  };

  return {
    resize(viewport: Viewport): void {
      // The beats stand at the head of the column at the far side of the body from the panel,
      // with the liver under them: the heart first, because it drives the rest.
      box = {
        x: viewport.width - PANEL.width - PANEL.margin, y: 128,
        width: PANEL.width, height: PANEL.height,
      };
      panels[0]?.group.setAttribute("transform", `translate(${box.x} ${box.y})`);
    },

    update(view: PulseView | undefined): void {
      if (view === undefined) {
        root.setAttribute("opacity", "0");
        return;
      }
      root.setAttribute("opacity", "1");
      const {cycle, frame, summary} = view;
      const baseline = view.baseline === cycle ? undefined : view.baseline;
      const fresh = cycle !== drawn || baseline !== drawnBase;
      if (fresh) {
        drawn = cycle;
        drawnBase = baseline;
      }
      const span = range(cycle, baseline);
      const arterial = fresh ? trace(cycle, cycle.arterial, span) : "";
      const ventricular = fresh ? trace(cycle, cycle.ventricular, span) : "";
      const base = fresh && baseline !== undefined
        ? trace(baseline, baseline.arterial, span)
        : "";
      // The cursor walks across the window, and the panel counts the beats as the phase wraps.
      const period = 60 / Math.max(1, cycle.heartRate);
      if (frame.phase < last) beat += 1;
      last = frame.phase;
      if ((beat + frame.phase) * period > WINDOW) beat = 0;
      const x = across((beat + frame.phase) * period);
      const cursor = `M${x.toFixed(2)} ${PAD.top} L${x.toFixed(2)} ${PANEL.height - PAD.bottom}`;
      const y = place(span, frame.arterial);
      for (const current of panels) {
        if (fresh) {
          current.arterial.setAttribute("d", arterial);
          current.ventricular.setAttribute("d", ventricular);
          current.base.setAttribute("d", base);
          current.baseKey.setAttribute("opacity", base === "" ? "0" : "1");
          current.pressure.textContent = `${formatNumber(summary.arterial_systolic, 0)}/`
            + `${formatNumber(summary.arterial_diastolic, 0)} mmHg`;
          current.rate.textContent = `${formatNumber(summary.heart_rate, 0)} /min`;
          current.high.textContent = formatNumber(span.high, 0);
          current.low.textContent = formatNumber(span.low, 0);
          current.period.textContent = `${formatNumber(WINDOW, 1)} s`;
        }
        current.cursor.setAttribute("d", cursor);
        attributes(current.dot, {cx: x, cy: y});
      }
    },
  };
}
