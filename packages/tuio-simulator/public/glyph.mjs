/**
 * The picture on an object of the surface: the same picture the table draws inside the ring of
 * that object, from the same outlines, so that the object on the simulated table looks like the
 * thing the table says it is. The level fills the picture and sizes it, which is what a dose
 * does when the object is turned up: the tablet grows.
 */

import {fillOf, ICONS, vesselPaths} from "./kit/icons.mjs";

const SVG_NS = "http://www.w3.org/2000/svg";

/** How small and how large a picture is drawn, as a share of the object it is on. */
const SMALLEST = 0.62;
const LARGEST = 1.18;

let sequence = 0;

function element(name, attributes = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

function clear(node) {
  while (node.firstChild !== null) node.firstChild.remove();
}

/** The picture of one object, drawn in a box from -26 to 26 which the caller scales. */
export function createGlyph(parent) {
  const id = `sim-glyph-${++sequence}`;
  const group = element("g", {class: "token-glyph"});
  const defs = element("defs");
  const clip = element("clipPath", {id});
  const window_ = element("rect", {x: -26, width: 52, y: -26, height: 52});
  clip.append(window_);
  defs.append(clip);
  const fill = element("g", {class: "token-glyph-fill", "clip-path": `url(#${id})`});
  const line = element("g", {class: "token-glyph-line"});
  const hand = element("line", {class: "token-glyph-hand", x1: 0, y1: 0, x2: 0, y2: -14});
  group.append(defs, fill, line, hand);
  parent.append(group);
  let shown = "";

  const build = (kind, level) => {
    if (kind === "vessel") {
      const paths = vesselPaths(level);
      if (shown !== kind) {
        clear(fill);
        clear(line);
        for (const d of paths.walls) line.append(element("path", {class: "token-glyph-wall", d}));
        fill.append(element("path", {class: "token-glyph-lumen", d: ""}));
      }
      fill.firstElementChild?.setAttribute("d", paths.lumen);
      return;
    }
    if (shown === kind) return;
    clear(fill);
    clear(line);
    for (const d of ICONS[kind] ?? []) {
      fill.append(element("path", {d}));
      line.append(element("path", {d}));
    }
  };

  return {
    group,
    /** `glyph` is `{kind, level}` as the table reads the object, or nothing to hide the picture. */
    update(glyph, scale) {
      if (glyph === undefined || glyph === null || !(glyph.kind in ICONS)) {
        group.setAttribute("opacity", "0");
        shown = "";
        return;
      }
      group.setAttribute("opacity", "1");
      const level = Math.min(1, Math.max(0, Number(glyph.level) || 0));
      build(glyph.kind, level);
      group.setAttribute("data-glyph", glyph.kind);
      const filled = fillOf(glyph.kind, level);
      window_.setAttribute("y", (26 - 52 * filled).toFixed(1));
      window_.setAttribute("height", (52 * filled).toFixed(1));
      hand.setAttribute("opacity", glyph.kind === "clock" ? "1" : "0");
      hand.setAttribute("transform", `rotate(${(level * 360).toFixed(1)})`);
      // The object grows with what it is set to, so turning the knob is visible from across the
      // room and not only on the card.
      const size = scale * (SMALLEST + (LARGEST - SMALLEST) * level);
      group.setAttribute("transform", `scale(${size.toFixed(3)})`);
      shown = glyph.kind;
    },
  };
}
