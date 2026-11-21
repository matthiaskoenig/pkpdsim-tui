/**
 * The beat, large enough to read from across the table: the pressure in the aorta and in the
 * left ventricle over one cycle of the solved heart, with the moment the table is at marked on
 * it. One panel, at the far side of the body from the panel of the table.
 *
 * The curves are the course the compiled model returned. The panel only draws them.
 */

import type {HeartSummary} from "@pkpdsim-tui/cardio-sim";
import {attributes, formatNumber, svg} from "@pkpdsim-tui/tui-kit";
import type {Box, Viewport} from "@pkpdsim-tui/tui-kit";
import type {BeatCycle, BeatFrame} from "./beat.ts";

/** The size of a panel and the air around its curves, in the pixels of the surface. */
const PANEL = {width: 304, height: 250, margin: 396} as const;
const PAD = {left: 46, right: 16, top: 86, bottom: 34} as const;

export interface PulseView {
  readonly cycle: BeatCycle;
  readonly frame: BeatFrame;
  readonly summary: HeartSummary;
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
  readonly cursor: SVGPathElement;
  readonly dot: SVGCircleElement;
  readonly high: SVGTextElement;
  readonly low: SVGTextElement;
  readonly period: SVGTextElement;
}

function panel(parent: SVGGElement): Panel {
  const group = svg("g", {class: "pulse"}, parent);
  svg("rect", {
    class: "pulse-frame", x: 0, y: 0, width: PANEL.width, height: PANEL.height, rx: 14,
  }, group);
  const title = svg("text", {class: "pulse-title", x: PAD.left - 24, y: 30}, group);
  title.textContent = "One beat of the heart";
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
  aorta.textContent = "aorta";
  const ventricle = svg("text", {
    class: "pulse-key pulse-key--ventricle", x: PAD.left + 48, y: PANEL.height - PAD.bottom + 18,
  }, plot);
  ventricle.textContent = "ventricle";
  return {group, pressure, rate, arterial, ventricular, cursor, dot, high, low, period};
}

export function createPulse(parent: SVGSVGElement): Pulse {
  const root = svg("g", {class: "layer layer--pulse", opacity: 0}, parent);
  const panels = [panel(root)];
  let drawn: BeatCycle | undefined;
  let box: Box = {x: 0, y: 0, width: PANEL.width, height: PANEL.height};

  /** Where a pressure sits in the plot, over the span of both curves with a little air. */
  const place = (cycle: BeatCycle, pressure: number): number => {
    const low = Math.min(0, cycle.minArterial);
    const high = cycle.maxArterial;
    const span = high - low;
    const fraction = span <= 0 ? 0.5 : (pressure - low) / span;
    const top = PAD.top;
    const bottom = PANEL.height - PAD.bottom;
    return bottom - (bottom - top) * 0.95 * fraction;
  };

  const trace = (cycle: BeatCycle, values: readonly number[]): string => cycle.phase
    .map((phase, index) => {
      const x = PAD.left + (PANEL.width - PAD.left - PAD.right) * phase;
      const y = place(cycle, values[index] ?? 0);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return {
    resize(viewport: Viewport): void {
      box = {
        x: PANEL.margin, y: (viewport.height - PANEL.height) / 2,
        width: PANEL.width, height: PANEL.height,
      };
      panels[0]?.group.setAttribute("transform",
        `translate(${viewport.width - box.x - PANEL.width} ${box.y})`);
    },

    update(view: PulseView | undefined): void {
      if (view === undefined) {
        root.setAttribute("opacity", "0");
        return;
      }
      root.setAttribute("opacity", "1");
      const {cycle, frame, summary} = view;
      const fresh = cycle !== drawn;
      if (fresh) drawn = cycle;
      const arterial = fresh ? trace(cycle, cycle.arterial) : "";
      const ventricular = fresh ? trace(cycle, cycle.ventricular) : "";
      const x = PAD.left + (PANEL.width - PAD.left - PAD.right) * frame.phase;
      const cursor = `M${x.toFixed(2)} ${PAD.top} L${x.toFixed(2)} ${PANEL.height - PAD.bottom}`;
      const y = place(cycle, frame.arterial);
      for (const current of panels) {
        if (fresh) {
          current.arterial.setAttribute("d", arterial);
          current.ventricular.setAttribute("d", ventricular);
          current.pressure.textContent = `${formatNumber(summary.arterial_systolic, 0)}/`
            + `${formatNumber(summary.arterial_diastolic, 0)} mmHg`;
          current.rate.textContent = `${formatNumber(summary.heart_rate, 0)} /min`;
          current.high.textContent = formatNumber(cycle.maxArterial, 0);
          current.low.textContent = formatNumber(Math.min(0, cycle.minArterial), 0);
          current.period.textContent = `${formatNumber(60 / cycle.heartRate, 2)} s`;
        }
        current.cursor.setAttribute("d", cursor);
        attributes(current.dot, {cx: x, cy: y});
      }
    },
  };
}
