/**
 * The picture inside an object on the surface: what the object is, drawn so that it changes
 * while it is turned. A vessel narrows, a heart beats at the rate it is set to, a tablet fills
 * up, a clock hand walks around. A visitor who turns an object sees the thing itself answer,
 * not only a number on the card beside it.
 */

import {clamp} from "./format.ts";
import {attributes, clear, svg} from "./svg.ts";

/** What an object is. Each one is drawn in a box of 52 pixels around the centre of the ring. */
export type GlyphKind =
  | "vessel" | "heart" | "tablet" | "enzyme" | "liver" | "kidney" | "body" | "clamp" | "scalpel"
  | "clock";

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

/** The outline of each object, in a box from -26 to 26. */
const ICONS: Record<GlyphKind, readonly string[]> = {
  vessel: [],
  heart: ["M 0 19 C -21 5 -19 -13 -7 -15 C -2 -16 0 -12 0 -9 C 0 -12 2 -16 7 -15 C 19 -13 21 5 0 19 Z"],
  tablet: ["M -10 -10 a 10 10 0 0 1 20 0 v 20 a 10 10 0 0 1 -20 0 z"],
  enzyme: ["M 15 -11 A 19 19 0 1 0 15 11 L 0 0 Z"],
  liver: ["M -21 -7 C -17 -17 1 -20 12 -15 C 21 -11 21 3 10 9 C -3 16 -19 10 -21 -7 Z"],
  kidney: ["M 5 -17 C 16 -13 19 6 6 15 C -5 22 -15 12 -15 0 C -15 -13 -6 -21 5 -17 Z"],
  body: [
    "M 0 -20 a 6 6 0 1 1 0 12 a 6 6 0 0 1 0 -12 z",
    "M -11 20 V -1 a 11 11 0 0 1 22 0 v 21 z",
  ],
  clamp: [
    "M -19 -15 L 3 -5 L 19 -8 L 19 -2 L 3 1 Z",
    "M -19 15 L 3 5 L 19 8 L 19 2 L 3 -1 Z",
  ],
  scalpel: ["M -17 12 L 5 -14 L 13 -9 L -9 17 Z", "M -9 17 L -19 20 L -17 12 Z"],
  clock: ["M 0 -19 A 19 19 0 1 1 0 19 A 19 19 0 1 1 0 -19 Z"],
};

/** The walls and the lumen of a vessel whose opening is `level`. */
function vesselPaths(level: number): {walls: readonly string[]; lumen: string} {
  const lumen = 3 + 19 * clamp(level, 0, 1);
  return {
    walls: [`M -24 -16 H 24 M -24 16 H 24`],
    lumen: `M -24 ${(-lumen / 2).toFixed(1)} H 24 V ${(lumen / 2).toFixed(1)} H -24 Z`,
  };
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
      const filled = glyph.kind === "vessel" ? 1 : glyph.kind === "clock" ? 0 : level;
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
