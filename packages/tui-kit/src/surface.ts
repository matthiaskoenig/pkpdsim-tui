/**
 * The surface a table is drawn on, and how large the one the visitor stands at is.
 *
 * Everything of a table is drawn on one surface, 1920 by 1080: the body in the middle, the cards
 * beside the objects, the panel at the edge. The table of the exhibition is 4K, which is that
 * same surface at twice the size, and what a visitor must see there is the same picture twice as
 * large rather than the same picture with half the ink in it.
 *
 * One number says how large a surface is, and the stylesheet is where it is said: the size of the
 * text of the page, which it takes from the window. Everything of the furniture of a table is a
 * multiple of that size, in `rem`, so the page is at the right size before a line of script has
 * run. This is where the drawing of a table reads it back, because a scene is drawn in the
 * pixels of the surface and the browser scales the whole of it, the lines, the text and the
 * layout together, through the viewBox it is given.
 *
 * So a table lays itself out in `surfaceViewport()`, not in the window. What stays in the pixels
 * of the glass is what the glass itself measures: a finger of the tracker, the box of an element
 * and the note the info layer puts beside it.
 */

import type {Viewport} from "./types.ts";

/** The surface the tables were drawn on, in its own pixels. */
export const SURFACE: Viewport = {width: 1920, height: 1080};

/** The size of the text of the page on that surface, which the stylesheet scales from. */
export const SURFACE_TEXT = 16;

/** The window itself, in the pixels of the glass. */
export function windowViewport(): Viewport {
  if (typeof window === "undefined") return SURFACE;
  return {width: window.innerWidth, height: window.innerHeight};
}

/**
 * How many pixels of the glass one pixel of the drawing is: 1 on the surface the tables were
 * drawn on, 2 on the 4K table of the exhibition.
 *
 * It is read from the size of the text of the page rather than worked out again here, so that
 * the size of a surface is said in one place: a stylesheet which is loaded, a window of a shape
 * nobody thought of, and the floor under which nothing is allowed to shrink all reach the
 * drawing and the furniture around it as one number.
 */
export function surfaceScale(): number {
  if (typeof document === "undefined" || typeof getComputedStyle !== "function") return 1;
  const text = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(text) && text > 0 ? text / SURFACE_TEXT : 1;
}

/**
 * The window in the pixels of the drawing, which is what a scene is laid out in and what the
 * viewBox of it says.
 *
 * A 4K table hands a table the same 1920 by 1080 the laptop hands it and the browser draws it
 * twice as large. A window of another shape hands its own shape, in those same pixels, because
 * a table lays itself out for the surface it is on: a panel at the edge of a wider surface
 * stands further out, it does not stretch.
 */
export function surfaceViewport(
  size: Viewport = windowViewport(), scale: number = surfaceScale(),
): Viewport {
  if (!Number.isFinite(scale) || scale <= 0) return size;
  return {width: size.width / scale, height: size.height / scale};
}
