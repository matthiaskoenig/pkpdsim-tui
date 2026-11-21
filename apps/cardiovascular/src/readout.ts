/**
 * The headline numbers, repeated at two opposite edges of the table so that the people facing
 * each other across it read the same thing.
 */

import type {PressureSolution} from "@pkpdsim-tui/cardio-sim";
import {formatDelta, formatNumber} from "./format.ts";
import {svg} from "./svg.ts";
import type {Viewport} from "./scene.ts";

interface StatDefinition {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly of: (solution: PressureSolution) => number;
}

/**
 * The portal gradient, the difference between the portal pressure and the pressure in the liver,
 * is the number portal hypertension is measured by, so the table shows it next to the pressures
 * it comes from.
 */
const STATS: readonly StatDefinition[] = [
  {id: "co", label: "Cardiac output", unit: "l/min", of: solution => solution.co},
  {id: "ppo", label: "Portal pressure", unit: "mmHg", of: solution => solution.ppo},
  {id: "gradient", label: "Portal gradient", unit: "mmHg", of: solution => solution.ppo - solution.pli},
  {id: "qh", label: "Hepatic flow", unit: "l/min", of: solution => solution.qh},
  {id: "qpo", label: "Portal flow", unit: "l/min", of: solution => solution.qpo},
];

interface StatElements {
  readonly group: SVGGElement;
  readonly label: SVGTextElement;
  readonly value: SVGTextElement;
  readonly unit: SVGTextElement;
  readonly delta: SVGTextElement;
}

export interface Readout {
  resize(viewport: Viewport): void;
  /** `baseline` is the solution at the reference controls, which every number is compared with. */
  update(solution: PressureSolution, baseline: PressureSolution): void;
}

function buildBand(parent: SVGGElement): StatElements[] {
  return STATS.map(stat => {
    const group = svg("g", {class: `stat stat--${stat.id}`}, parent);
    const label = svg("text", {class: "stat-label", x: 0, y: 0, "text-anchor": "middle"}, group);
    label.textContent = stat.label;
    const value = svg("text", {class: "stat-value", x: 0, y: 38, "text-anchor": "middle"}, group);
    value.textContent = "-";
    const unit = svg("text", {class: "stat-unit", x: 0, y: 58, "text-anchor": "middle"}, group);
    unit.textContent = stat.unit;
    const delta = svg("text", {class: "stat-delta", x: 0, y: 78, "text-anchor": "middle"}, group);
    return {group, label, value, unit, delta};
  });
}

export function createReadout(parent: SVGSVGElement): Readout {
  const root = svg("g", {class: "layer layer--readout"}, parent);
  const top = svg("g", {class: "band band--top"}, root);
  const bottom = svg("g", {class: "band band--bottom"}, root);
  const bands = [buildBand(top), buildBand(bottom)];

  return {
    resize(viewport: Viewport): void {
      // The corners hold the panels, so the band keeps to the middle of the edge.
      const CORNER = 400;
      const span = Math.min(300, Math.max(140, (viewport.width - 2 * CORNER) / STATS.length));
      const total = span * STATS.length;
      const left = (viewport.width - total) / 2 + span / 2;
      for (const band of bands) {
        band.forEach((stat, index) => {
          stat.group.setAttribute("transform", `translate(${left + index * span} 46)`);
        });
      }
      top.setAttribute("transform", "translate(0 0)");
      // The band at the far edge is turned around, so it reads upright from the other side.
      bottom.setAttribute("transform", `rotate(180 ${viewport.width / 2} ${viewport.height / 2})`);
    },

    update(solution: PressureSolution, baseline: PressureSolution): void {
      STATS.forEach((stat, index) => {
        const value = stat.of(solution);
        const base = stat.of(baseline);
        for (const band of bands) {
          const elements = band[index];
          if (elements === undefined) continue;
          elements.value.textContent = formatNumber(value);
          const delta = formatDelta(value, base);
          elements.delta.textContent = delta;
          elements.delta.setAttribute("fill", delta.startsWith("+")
            ? "#e8a33d"
            : delta.startsWith("-") ? "#4d8bf0" : "#8da2b8");
        }
      });
    },
  };
}
