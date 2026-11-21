/**
 * What the liver is getting, over the last minute of the table: the blood through it, split
 * into the portal vein and the hepatic artery, and the pressures in front of it and inside it.
 *
 * The table answers within a frame, so a visitor who turns an object sees the number move at
 * once and has nothing to compare it with. This panel is the monitor beside the bed: the last
 * minute of every one of those numbers, so that a hand on an object draws its own curve and the
 * liver of a cirrhotic can be seen arriving rather than only being read.
 *
 * The gap between the two pressures is the portal pressure gradient, which is the number portal
 * hypertension is measured by, so it is drawn as the gap it is.
 */

import type {PressureSolution} from "@pkpdsim-tui/cardio-sim";
import {attributes, formatNumber, svg} from "@pkpdsim-tui/tui-kit";
import type {Viewport, Voice} from "@pkpdsim-tui/tui-kit";
import {COLUMN, placePanel} from "./layout.ts";
import {CARDIO_TEXT} from "./text.ts";
import type {CardioCopy} from "./text.ts";

/** The size of the panel, in the pixels of the surface. */
const PANEL = {width: COLUMN.width, height: COLUMN.height.hepatic} as const;
/** How much of the table's past the panel holds, in seconds. */
const WINDOW = 60;
/** How often a sample is kept, in milliseconds: a curve of a minute, not of every frame. */
const EVERY = 120;
/** The two plots inside the panel. */
const FLOW = {top: 92, height: 70} as const;
const PRESSURE = {top: 200, height: 70} as const;
const PAD = {left: 56, right: 18} as const;
/** The floors of the two scales, so that a quiet table does not draw noise as mountains. */
const FLOOR = {flow: 2.5, pressure: 16} as const;

interface Sample {
  readonly at: number;
  readonly qh: number;
  readonly qpo: number;
  readonly qha: number;
  readonly ppo: number;
  readonly pli: number;
}

export interface Hepatic {
  resize(viewport: Viewport): void;
  /** One solved state of the circulation, at the moment the table is at. */
  update(solution: PressureSolution, now: number): void;
}

interface Keys {
  readonly total: SVGTextElement;
  readonly portal: SVGTextElement;
  readonly artery: SVGTextElement;
  readonly portalPressure: SVGTextElement;
  readonly liverPressure: SVGTextElement;
}

function key(
  parent: SVGGElement, kind: string, label: string, x: number, y: number,
): SVGTextElement {
  const text = svg("text", {class: `hepatic-key hepatic-key--${kind}`, x, y}, parent);
  text.textContent = label;
  return text;
}

export function createHepatic(parent: SVGSVGElement, voice: Voice): Hepatic {
  const copy: CardioCopy["hepatic"] = voice.pick(CARDIO_TEXT).hepatic;
  const root = svg("g", {class: "layer layer--hepatic"}, parent);
  const group = svg("g", {class: "hepatic"}, root);
  svg("rect", {
    class: "hepatic-frame", x: 0, y: 0, width: PANEL.width, height: PANEL.height, rx: 14,
  }, group);
  const title = svg("text", {class: "hepatic-title", x: PAD.left - 24, y: 30}, group);
  title.textContent = copy.title;
  const flowNumber = svg("text", {class: "hepatic-number", x: PAD.left - 24, y: 66}, group);
  const flowUnit = svg("text", {class: "hepatic-unit", x: PAD.left - 24, y: 84}, group);
  flowUnit.textContent = copy.flowTitle;
  const gradientNumber = svg("text", {
    class: "hepatic-number hepatic-number--gradient", x: PANEL.width - PAD.right, y: 66,
    "text-anchor": "end",
  }, group);
  const gradientUnit = svg("text", {
    class: "hepatic-unit", x: PANEL.width - PAD.right, y: 84, "text-anchor": "end",
  }, group);
  gradientUnit.textContent = copy.gradient;

  const plots = svg("g", {class: "hepatic-plots"}, group);
  for (const plot of [FLOW, PRESSURE]) {
    svg("path", {
      class: "hepatic-axis",
      d: `M${PAD.left} ${plot.top} L${PAD.left} ${plot.top + plot.height} `
        + `L${PANEL.width - PAD.right} ${plot.top + plot.height}`,
    }, plots);
  }
  // The gap between the two pressures, which is the gradient the liver is measured by.
  const gap = svg("path", {class: "hepatic-gap", d: ""}, plots);
  const traces = {
    qh: svg("path", {class: "hepatic-trace hepatic-trace--total", d: ""}, plots),
    qpo: svg("path", {class: "hepatic-trace hepatic-trace--portal", d: ""}, plots),
    qha: svg("path", {class: "hepatic-trace hepatic-trace--artery", d: ""}, plots),
    ppo: svg("path", {class: "hepatic-trace hepatic-trace--portal", d: ""}, plots),
    pli: svg("path", {class: "hepatic-trace hepatic-trace--liver", d: ""}, plots),
  };
  const flowTop = svg("text", {
    class: "hepatic-tick", x: PAD.left - 8, y: FLOW.top + 4, "text-anchor": "end",
  }, plots);
  const flowFoot = svg("text", {
    class: "hepatic-tick", x: PAD.left - 8, y: FLOW.top + FLOW.height, "text-anchor": "end",
  }, plots);
  flowFoot.textContent = "0";
  const pressureTop = svg("text", {
    class: "hepatic-tick", x: PAD.left - 8, y: PRESSURE.top + 4, "text-anchor": "end",
  }, plots);
  const pressureFoot = svg("text", {
    class: "hepatic-tick", x: PAD.left - 8, y: PRESSURE.top + PRESSURE.height,
    "text-anchor": "end",
  }, plots);
  pressureFoot.textContent = "0";
  // How far back the curves go, written over the flows so that the longer names of the
  // pressures have the whole width of the panel to themselves.
  const span = svg("text", {
    class: "hepatic-tick", x: PANEL.width - PAD.right, y: FLOW.top + FLOW.height + 20,
    "text-anchor": "end",
  }, plots);
  span.textContent = copy.window(WINDOW);

  const keys: Keys = {
    total: key(plots, "total", copy.total, PAD.left, FLOW.top + FLOW.height + 20),
    portal: key(plots, "portal", copy.portal, PAD.left, FLOW.top + FLOW.height + 20),
    artery: key(plots, "artery", copy.artery, PAD.left, FLOW.top + FLOW.height + 20),
    portalPressure: key(
      plots, "portal", copy.portalPressure, PAD.left, PRESSURE.top + PRESSURE.height + 20),
    liverPressure: key(
      plots, "liver", copy.liverPressure, PAD.left, PRESSURE.top + PRESSURE.height + 20),
  };

  /**
   * The keys stand in a row, each one after the one before it. Three languages do not write a
   * portal vein in the same number of letters, so where each one begins is measured and not
   * assumed.
   */
  const layoutKeys = (row: readonly SVGTextElement[]): void => {
    let cursor = PAD.left;
    for (const text of row) {
      text.setAttribute("x", String(cursor));
      cursor += (text.getComputedTextLength?.() ?? 0) + 14;
    }
  };

  const history: Sample[] = [];
  let kept = 0;

  /** Where a moment sits across a plot: now at the right, a minute ago at the left. */
  const across = (at: number, now: number): number => {
    const age = Math.min(WINDOW, Math.max(0, (now - at) / 1000));
    const width = PANEL.width - PAD.left - PAD.right;
    return PANEL.width - PAD.right - (age / WINDOW) * width;
  };

  /** Where a value sits in a plot, over a scale which starts at zero. */
  const up = (plot: {top: number; height: number}, value: number, top: number): number =>
    plot.top + plot.height - plot.height * Math.min(1, Math.max(0, value / top));

  const trace = (
    plot: {top: number; height: number}, now: number, top: number,
    value: (sample: Sample) => number,
  ): string => history
    .map((sample, index) =>
      `${index === 0 ? "M" : "L"}${across(sample.at, now).toFixed(1)} `
      + `${up(plot, value(sample), top).toFixed(1)}`)
    .join(" ");

  return {
    resize(viewport: Viewport): void {
      // At the foot of the column of plots, under the two of the heart.
      group.setAttribute("transform", placePanel(viewport, "hepatic"));
    },

    update(solution: PressureSolution, now: number): void {
      if (now - kept >= EVERY || history.length === 0) {
        kept = now;
        history.push({
          at: now, qh: solution.qh, qpo: solution.qpo, qha: solution.qha,
          ppo: solution.ppo, pli: solution.pli,
        });
        while (history.length > 0 && now - (history[0]?.at ?? now) > WINDOW * 1000) {
          history.shift();
        }
      }
      flowNumber.textContent = `${formatNumber(solution.qh, 2)} l/min`;
      gradientNumber.textContent = `${formatNumber(solution.ppo - solution.pli, 1)} mmHg`;
      // The scales grow with what the table has done, and never fall under their floor, so a
      // quiet minute is a flat line rather than a cliff.
      const flowTopValue = Math.max(
        FLOOR.flow, ...history.map(sample => Math.max(sample.qh, sample.qpo) * 1.15));
      const pressureTopValue = Math.max(
        FLOOR.pressure, ...history.map(sample => sample.ppo * 1.15));
      flowTop.textContent = `${formatNumber(flowTopValue, 1)} l/min`;
      pressureTop.textContent = `${formatNumber(pressureTopValue, 0)} mmHg`;
      traces.qh.setAttribute("d", trace(FLOW, now, flowTopValue, sample => sample.qh));
      traces.qpo.setAttribute("d", trace(FLOW, now, flowTopValue, sample => sample.qpo));
      traces.qha.setAttribute("d", trace(FLOW, now, flowTopValue, sample => sample.qha));
      traces.ppo.setAttribute("d", trace(PRESSURE, now, pressureTopValue, sample => sample.ppo));
      traces.pli.setAttribute("d", trace(PRESSURE, now, pressureTopValue, sample => sample.pli));
      // The gradient is the gap between the two pressures, so it is drawn as that gap.
      const over = history.map((sample, index) =>
        `${index === 0 ? "M" : "L"}${across(sample.at, now).toFixed(1)} `
        + `${up(PRESSURE, sample.ppo, pressureTopValue).toFixed(1)}`).join(" ");
      const back = [...history].reverse().map(sample =>
        `L${across(sample.at, now).toFixed(1)} `
        + `${up(PRESSURE, sample.pli, pressureTopValue).toFixed(1)}`).join(" ");
      gap.setAttribute("d", history.length < 2 ? "" : `${over} ${back} Z`);
      // Each key carries the number it belongs to, so the colours are read once and then the
      // values are read from across the table.
      keys.total.textContent = `${copy.total} ${formatNumber(solution.qh, 2)}`;
      keys.portal.textContent = `${copy.portal} ${formatNumber(solution.qpo, 2)}`;
      keys.artery.textContent = `${copy.artery} ${formatNumber(solution.qha, 2)}`;
      keys.portalPressure.textContent =
        `${copy.portalPressure} ${formatNumber(solution.ppo, 1)}`;
      keys.liverPressure.textContent = `${copy.liverPressure} ${formatNumber(solution.pli, 1)}`;
      // The row is laid out when a sample is kept, which is often enough for a changing number
      // and seldom enough to keep the measuring off the frame.
      if (kept === now) {
        layoutKeys([keys.total, keys.portal, keys.artery]);
        layoutKeys([keys.portalPressure, keys.liverPressure]);
      }
    },
  };
}
