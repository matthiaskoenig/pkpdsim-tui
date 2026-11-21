/**
 * The picture inside an object on the surface: what the object is, drawn so that it changes
 * while it is turned. A vessel narrows, a heart beats at the rate it is set to, a tablet fills
 * up, a clock hand walks around. A visitor who turns an object sees the thing itself answer,
 * not only a number on the card beside it.
 */

import {clamp} from "./format.ts";
import {fillOf, ICONS, vesselPaths} from "./icons.mjs";
import type {GlyphKind} from "./icons.d.mts";
import {attributes, clear, svg} from "./svg.ts";

export type {GlyphKind} from "./icons.d.mts";

export interface TokenGlyph {
  readonly kind: GlyphKind;
  /**
   * Where the object stands in its range, from 0 to 1: how open the vessel is, how much of the
   * tablet is taken, how far the clock has walked. It fills the picture from the bottom, and a
   * few of the pictures use it as a shape of their own.
   */
  readonly level: number;
  /** Beats a minute, for the heart which beats at the rate it is set to. */
  readonly rate?: number;
}

export interface Glyph {
  update(glyph: TokenGlyph | undefined): void;
}

let sequence = 0;

/** The picture of one object, inside the ring of that object. */
export function createGlyph(parent: SVGGElement): Glyph {
  const id = `glyph-${++sequence}`;
  const group = svg("g", {class: "glyph"}, parent);
  const defs = svg("defs", {}, group);
  const clip = svg("clipPath", {id}, defs);
  const window_ = svg("rect", {x: -26, width: 52, y: -26, height: 52}, clip);
  const fill = svg("g", {class: "glyph-fill", "clip-path": `url(#${id})`}, group);
  const line = svg("g", {class: "glyph-line"}, group);
  const hand = svg("line", {class: "glyph-hand", x1: 0, y1: 0, x2: 0, y2: -14}, group);
  let shown = "";

  const build = (kind: GlyphKind, level: number): void => {
    if (kind === "vessel") {
      const paths = vesselPaths(level);
      if (shown !== kind) {
        clear(fill);
        clear(line);
        for (const d of paths.walls) svg("path", {class: "glyph-wall", d}, line);
        svg("path", {class: "glyph-lumen", d: ""}, fill);
      }
      fill.firstElementChild?.setAttribute("d", paths.lumen);
      return;
    }
    if (shown === kind) return;
    clear(fill);
    clear(line);
    for (const d of ICONS[kind]) {
      svg("path", {d}, fill);
      svg("path", {d}, line);
    }
  };

  return {
    update(glyph: TokenGlyph | undefined): void {
      if (glyph === undefined) {
        group.setAttribute("opacity", "0");
        return;
      }
      group.setAttribute("opacity", "1");
      const level = clamp(glyph.level, 0, 1);
      build(glyph.kind, level);
      group.setAttribute("data-glyph", glyph.kind);
      // The picture fills from the bottom, except where the shape itself carries the value:
      // the vessel is its own opening, and the clock says the time with its hand.
      const filled = fillOf(glyph.kind, level);
      attributes(window_, {y: (26 - 52 * filled).toFixed(1), height: (52 * filled).toFixed(1)});
      // The heart beats at the rate it is set to, so the object itself keeps the time.
      const beat = glyph.rate === undefined || glyph.rate <= 0 ? 0 : 60 / glyph.rate;
      group.style.setProperty("--beat", beat === 0 ? "0s" : `${beat.toFixed(2)}s`);
      hand.setAttribute("opacity", glyph.kind === "clock" ? "1" : "0");
      hand.setAttribute("transform", `rotate(${(level * 360).toFixed(1)})`);
      shown = glyph.kind;
    },
  };
}
