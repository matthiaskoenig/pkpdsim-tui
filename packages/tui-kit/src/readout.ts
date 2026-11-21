/**
 * The headline numbers, in one band at the edge the table is read from. Each number carries the
 * sentence which says what it is, which a hover or a finger resting on it opens.
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
  /** What this number is, for the visitor who asks what it means. */
  readonly info?: string;
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

  const buildBand = (host: SVGGElement): StatElements[] => stats.map(stat => {
    const group = svg("g", {class: `stat stat--${stat.id}`}, host);
    if (stat.info !== undefined && stat.info !== "") group.setAttribute("data-info", stat.info);
    // The note of a number opens from the whole column, not from the glyphs of its digits.
    svg("rect", {class: "stat-field", x: -70, y: -24, width: 140, height: 106}, group);
    const label = svg("text", {class: "stat-label", x: 0, y: 0, "text-anchor": "middle"}, group);
    label.textContent = stat.label;
    const value = svg("text", {class: "stat-value", x: 0, y: 38, "text-anchor": "middle"}, group);
    value.textContent = "-";
    const unit = svg("text", {class: "stat-unit", x: 0, y: 58, "text-anchor": "middle"}, group);
    unit.textContent = stat.unit;
    const delta = svg("text", {class: "stat-delta", x: 0, y: 78, "text-anchor": "middle"}, group);
    return {group, value, delta};
  });

  const bands = [buildBand(top)];

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
