// @vitest-environment jsdom
/**
 * How large the surface in front of the visitor is, and what a table is drawn into because of it.
 *
 * The stylesheet says the size of a surface, as the size of the text of the page, and this is
 * what reads it back: a 4K table carries text of 32 pixels and a table drawn on it is the same
 * 1920 by 1080 as on the laptop, which the browser then draws twice as large.
 */
import {afterEach, describe, expect, it} from "vitest";
import {SURFACE, SURFACE_TEXT, surfaceScale, surfaceViewport} from "../src/surface.ts";

afterEach(() => {
  document.documentElement.style.fontSize = "";
});

/** What the stylesheet does on a surface of this size, as a test can say it. */
function textOf(size: string): void {
  document.documentElement.style.fontSize = size;
}

describe("the surface the tables were drawn on", () => {
  it("is 1920 by 1080, and its text is 16", () => {
    expect(SURFACE).toEqual({width: 1920, height: 1080});
    expect(SURFACE_TEXT).toBe(16);
  });
});

describe("how large a surface is", () => {
  it("is one on the surface the tables were drawn on", () => {
    textOf("16px");
    expect(surfaceScale()).toBe(1);
  });

  it("is two on the 4K table of the exhibition", () => {
    textOf("32px");
    expect(surfaceScale()).toBe(2);
  });

  it("is below one on a window somebody made smaller", () => {
    textOf("12px");
    expect(surfaceScale()).toBe(0.75);
  });

  // A page whose stylesheet has not arrived is a page at the size of the drawing, not a page
  // whose furniture is somewhere else entirely.
  it("is one where the page says nothing", () => {
    expect(surfaceScale()).toBe(1);
  });
});

describe("what a table is drawn into", () => {
  it("is the surface itself on the laptop it was drawn on", () => {
    expect(surfaceViewport({width: 1920, height: 1080}, 1)).toEqual(SURFACE);
  });

  // The whole point: the 4K table hands a table the same surface and the browser draws it twice
  // as large, so the picture is the same picture and not the same picture with half the ink.
  it("is the same surface on the 4K table of the exhibition", () => {
    expect(surfaceViewport({width: 3840, height: 2160}, 2)).toEqual(SURFACE);
  });

  // A window of another shape is still laid out for the shape it has: a panel at the edge of a
  // wider surface stands further out, it does not stretch.
  it("is the shape of the window, in the pixels of the drawing", () => {
    expect(surfaceViewport({width: 2560, height: 1080}, 1)).toEqual({width: 2560, height: 1080});
    const wide = surfaceViewport({width: 3840, height: 1620}, 1.5);
    expect(wide.width).toBeCloseTo(2560, 6);
    expect(wide.height).toBeCloseTo(1080, 6);
  });

  it("is the window itself where the size of it says nothing", () => {
    const window_ = {width: 1366, height: 768};
    expect(surfaceViewport(window_, 0)).toEqual(window_);
    expect(surfaceViewport(window_, Number.NaN)).toEqual(window_);
  });

  it("takes the size of the page when it is not told one", () => {
    textOf("32px");
    const taken = surfaceViewport({width: 3840, height: 2160});
    expect(taken).toEqual(SURFACE);
  });
});
