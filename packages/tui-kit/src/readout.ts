/**
 * The headline numbers, in one band at the edge the table is read from. Each number carries the
 * sentence which says what it is, which a hover or a finger resting on it opens.
 */

import {formatDelta, formatNumber} from "./format.ts";
import {shows} from "./voice.ts";
import type {Level, Voice} from "./voice.ts";
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
  /**
   * The level this number appears from. A table says six things to an expert and three to a
   * child, because a band of six numbers is not what a six year old came to read.
   */
  readonly from?: Level;
}

/** The numbers of the band this visitor is shown. */
export function visibleStats<T>(
  stats: readonly StatDefinition<T>[], voice: Voice,
): readonly StatDefinition<T>[] {
  return stats.filter(stat => shows(voice, stat.from));
}

interface StatElements {
  readonly group: SVGGElement;
  readonly label: SVGTextElement;
  readonly value: SVGTextElement;
  readonly delta: SVGTextElement;
}

/** How wide a piece of text is, or zero where nothing is rendered yet. */
function widthOf(element: SVGTextElement): number {
  try {
    return element.getComputedTextLength();
  } catch {
    return 0;
  }
}

/**
 * The name of a number has to fit its column, and the same name is longer in German than in
 * English. It is written on one line while it fits, broken at the space which halves it best
 * when it does not, and squeezed only when even that is too wide.
 */
function fitLabel(label: SVGTextElement, text: string, width: number): void {
  label.textContent = text;
  label.removeAttribute("textLength");
  label.setAttribute("y", "0");
  if (widthOf(label) <= width || width <= 0) return;

  const words = text.split(" ");
  if (words.length > 1) {
    // The break which leaves the two lines as even as possible.
    let best = 1;
    let bestGap = Infinity;
    for (let at = 1; at < words.length; at++) {
      const gap = Math.abs(
        words.slice(0, at).join(" ").length - words.slice(at).join(" ").length);
      if (gap < bestGap) {
        bestGap = gap;
        best = at;
      }
    }
    label.textContent = "";
    label.setAttribute("y", "-14");
    for (const [index, line] of [words.slice(0, best).join(" "), words.slice(best).join(" ")]
      .entries()) {
      const span = svg("tspan", {x: 0, dy: index === 0 ? 0 : 15}, label);
      span.textContent = line;
    }
  }
  const measured = widthOf(label);
  if (measured > width && measured > 0) label.setAttribute("textLength", String(width));
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
    const label = svg("text", {
      class: "stat-label", x: 0, y: 0, "text-anchor": "middle", lengthAdjust: "spacingAndGlyphs",
    }, group);
    label.textContent = stat.label;
    const value = svg("text", {class: "stat-value", x: 0, y: 38, "text-anchor": "middle"}, group);
    value.textContent = "-";
    const unit = svg("text", {class: "stat-unit", x: 0, y: 58, "text-anchor": "middle"}, group);
    unit.textContent = stat.unit;
    const delta = svg("text", {class: "stat-delta", x: 0, y: 78, "text-anchor": "middle"}, group);
    return {group, label, value, delta};
  });

  const bands = [buildBand(top)];

  return {
    resize(viewport: Viewport): void {
      const span = Math.min(300, Math.max(140, (viewport.width - 2 * CORNER) / stats.length));
      const total = span * stats.length;
      const left = (viewport.width - total) / 2 + span / 2;
      for (const band of bands) {
        band.forEach((elements, index) => {
          elements.group.setAttribute("transform", `translate(${left + index * span} 46)`);
          const stat = stats[index];
          if (stat !== undefined) fitLabel(elements.label, stat.label, span - 18);
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
