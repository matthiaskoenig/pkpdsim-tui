/**
 * The headline numbers, repeated at two opposite edges of the table so that the people facing
 * each other across it read the same thing.
 */

import {formatDelta, formatNumber} from "./format.ts";
import {svg} from "./svg.ts";
import type {Viewport} from "./types.ts";

/** One number of the band, read out of whatever the application solved. */
export interface StatDefinition<T> {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly of: (value: T) => number;
  /** Decimals, where the default follows the magnitude of the number. */
  readonly digits?: number;
}

interface StatElements {
  readonly group: SVGGElement;
  readonly value: SVGTextElement;
  readonly delta: SVGTextElement;
}

export interface Readout<T> {
  resize(viewport: Viewport): void;
  /** `baseline` is the state every number is compared with. */
  update(value: T, baseline: T): void;
}

/** The corners hold the panels, so the band keeps to the middle of the edge. */
const CORNER = 400;

export function createReadout<T>(
  parent: SVGSVGElement, stats: readonly StatDefinition<T>[],
): Readout<T> {
  const root = svg("g", {class: "layer layer--readout"}, parent);
  const top = svg("g", {class: "band band--top"}, root);
  const bottom = svg("g", {class: "band band--bottom"}, root);

  const buildBand = (host: SVGGElement): StatElements[] => stats.map(stat => {
    const group = svg("g", {class: `stat stat--${stat.id}`}, host);
    const label = svg("text", {class: "stat-label", x: 0, y: 0, "text-anchor": "middle"}, group);
    label.textContent = stat.label;
    const value = svg("text", {class: "stat-value", x: 0, y: 38, "text-anchor": "middle"}, group);
    value.textContent = "-";
    const unit = svg("text", {class: "stat-unit", x: 0, y: 58, "text-anchor": "middle"}, group);
    unit.textContent = stat.unit;
    const delta = svg("text", {class: "stat-delta", x: 0, y: 78, "text-anchor": "middle"}, group);
    return {group, value, delta};
  });

  const bands = [buildBand(top), buildBand(bottom)];

  return {
    resize(viewport: Viewport): void {
      const span = Math.min(300, Math.max(140, (viewport.width - 2 * CORNER) / stats.length));
      const total = span * stats.length;
      const left = (viewport.width - total) / 2 + span / 2;
      for (const band of bands) {
        band.forEach((stat, index) => {
          stat.group.setAttribute("transform", `translate(${left + index * span} 46)`);
        });
      }
      // The band at the far edge is turned around, so it reads upright from the other side.
      bottom.setAttribute("transform", `rotate(180 ${viewport.width / 2} ${viewport.height / 2})`);
    },

    update(value: T, baseline: T): void {
      stats.forEach((stat, index) => {
        const current = stat.of(value);
        const base = stat.of(baseline);
        const delta = formatDelta(current, base, stat.digits ?? 1);
        for (const band of bands) {
          const elements = band[index];
          if (elements === undefined) continue;
          elements.value.textContent = formatNumber(current, stat.digits ?? 2);
          elements.delta.textContent = delta;
          elements.delta.setAttribute("fill", delta.startsWith("+")
            ? "#e8a33d"
            : delta.startsWith("-") ? "#4d8bf0" : "#8da2b8");
        }
      });
    },
  };
}
