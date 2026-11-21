/**
 * What the objects of a table look like: the outline of every picture, in a box from -26 to 26
 * around the centre of an object.
 *
 * This is plain JavaScript and not TypeScript because two different programs draw from it: the
 * table itself, through `glyph.ts`, and the surface of the TUIO simulator, which is served as
 * it is written and cannot be built. An object on the simulated table then looks like the
 * object it stands for.
 */

/** The outline of each object, by what the object is. */
export const ICONS = {
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
  pump: [
    "M 0 -19 A 19 19 0 1 1 0 19 A 19 19 0 1 1 0 -19 Z",
    "M 0 -11 A 11 11 0 0 1 11 0 L 0 0 Z",
    "M 0 11 A 11 11 0 0 1 -11 0 L 0 0 Z",
  ],
  bubble: [
    "M -2 -18 A 10 10 0 1 1 -2 2 A 10 10 0 1 1 -2 -18 Z",
    "M 9 6 A 6 6 0 1 1 9 18 A 6 6 0 1 1 9 6 Z",
  ],
  thermometer: [
    "M -5 -20 a 5 5 0 0 1 10 0 v 23 a 8 8 0 1 1 -10 0 z",
  ],
};

/** The walls and the lumen of a vessel whose opening is `level`, from 0 to 1. */
export function vesselPaths(level) {
  const lumen = 3 + 19 * Math.min(1, Math.max(0, level));
  return {
    walls: ["M -24 -16 H 24 M -24 16 H 24"],
    lumen: `M -24 ${(-lumen / 2).toFixed(1)} H 24 V ${(lumen / 2).toFixed(1)} H -24 Z`,
  };
}

/**
 * How full the picture of an object is drawn, from 0 to 1. A vessel is its own opening and a
 * clock says its value with its hand, so neither of them fills.
 */
export function fillOf(kind, level) {
  if (kind === "vessel") return 1;
  if (kind === "clock") return 0;
  return Math.min(1, Math.max(0, level));
}
