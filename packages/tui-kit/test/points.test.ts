// @vitest-environment jsdom
/**
 * Where a finger of the tracker lands on the page.
 *
 * A tracker reports a finger as a fraction of its sensor, and the one thing that fraction is
 * multiplied by is the window: a browser is asked for the element under a point in the pixels
 * of the glass, which are not the pixels a table is drawn in. On the 4K table of the exhibition
 * the drawing is half the glass, and a finger put into the pixels of the drawing landed in the
 * top left quarter of the table and pressed nothing at all, which is what these hold.
 */
import {afterEach, describe, expect, it} from "vitest";
import type {TablePointer, TableSnapshot, TableToken} from "@pkpdsim-tui/tuio-input";
import {pointerPoints, tokenPoints} from "../src/info.ts";

/** A window of this size, with the text of the page the stylesheet gives a surface that size. */
function glass(width: number, height: number, text: string): void {
  Object.defineProperty(window, "innerWidth", {value: width, configurable: true});
  Object.defineProperty(window, "innerHeight", {value: height, configurable: true});
  document.documentElement.style.fontSize = text;
}

function pointer(sessionId: number, x: number, y: number, mouse = false): TablePointer {
  return {sessionId, typeId: 0, x, y, radius: 0.02, press: 0.5, at: 0, mouse};
}

function token(sessionId: number, marker: number, x: number, y: number): TableToken {
  return {sessionId, marker, typeId: 0, x, y, angle: 0, turn: 0, at: 0};
}

function snapshotOf(
  pointers: readonly TablePointer[], tokens: readonly TableToken[] = [],
): TableSnapshot {
  return {
    pointers: new Map(pointers.map(one => [one.sessionId, one])),
    tokens: new Map(tokens.map(one => [one.sessionId, one])),
    sensor: {width: 1920, height: 1080},
    at: 0,
  };
}

afterEach(() => {
  document.documentElement.style.fontSize = "";
});

describe("the fingers of a snapshot", () => {
  it("land where the finger is on the laptop the tables were drawn on", () => {
    glass(1920, 1080, "16px");
    expect(pointerPoints(snapshotOf([pointer(7, 0.75, 0.5)]))).toEqual([
      {id: 7, x: 1440, y: 540, mouse: false},
    ]);
  });

  // The regression itself: the drawing of the 4K table is 1920 by 1080 while its glass is 3840
  // by 2160, so a finger of the right half of the table reads as a finger of the middle.
  it("land on the glass of the 4K table and not on the drawing of it", () => {
    glass(3840, 2160, "32px");
    expect(pointerPoints(snapshotOf([pointer(7, 0.75, 0.5)]))).toEqual([
      {id: 7, x: 2880, y: 1080, mouse: false},
    ]);
  });

  it("carry the mouse of a laptop, which the page clicks for by itself", () => {
    glass(1920, 1080, "16px");
    const [point] = pointerPoints(snapshotOf([pointer(1, 0.5, 0.5, true)]));
    expect(point?.mouse).toBe(true);
  });

  it("are the fingers of the snapshot and nothing else", () => {
    glass(1920, 1080, "16px");
    expect(pointerPoints(snapshotOf([]))).toEqual([]);
  });
});

describe("the objects of a snapshot", () => {
  it("choose where they are on the glass, as a finger does", () => {
    glass(3840, 2160, "32px");
    expect(tokenPoints(snapshotOf([], [token(3, 11, 0.25, 0.75)]))).toEqual([
      {id: 3, x: 960, y: 1620},
    ]);
  });
});
