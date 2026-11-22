/**
 * The band of an object: what a visitor reads off a table from across the room, which is how
 * far each object has been turned from the value of the model without it, and which way.
 */

import {describe, expect, it} from "vitest";
import {ABSOLUTE_SPAN} from "@pkpdsim-tui/tuio-input";
import type {TokenRole} from "@pkpdsim-tui/tuio-input";
import {BAND, bandOf} from "../src/tokens.ts";

const STOP = ABSOLUTE_SPAN * 180;

const factor: TokenRole = {
  id: "resistance", label: "Resistance", description: "", unit: "x", markers: [1],
  min: 0.5, max: 2, reference: 1, mode: "absolute", scale: "log", turns: 1,
};

/** An object whose reference is one end of its range spends the whole turn on the range. */
const impairment: TokenRole = {
  id: "cirrhosis", label: "Cirrhosis", description: "", unit: "", markers: [2],
  min: 0, max: 0.81, reference: 0, mode: "absolute", scale: "linear", turns: 1,
};

const twist: TokenRole = {
  id: "dose", label: "Dose", description: "", unit: "mg", markers: [3],
  min: 0.5, max: 8, reference: 4, mode: "relative", scale: "linear", turns: 2,
};

describe("the band of an object", () => {
  it("is nothing at all where the object stands at its baseline", () => {
    const band = bandOf(factor, 0);
    expect(band.from).toBeCloseTo(0, 6);
    expect(band.to).toBeCloseTo(0, 6);
    // A band of no length is not drawn, and the thinnest it could be is the thread.
    expect(band.width).toBeCloseTo(BAND.thin, 6);
  });

  it("grows out of the detent and thickens with the change", () => {
    const quarter = bandOf(factor, STOP / 4);
    const half = bandOf(factor, STOP / 2);
    const full = bandOf(factor, STOP);
    expect(quarter.rising).toBe(true);
    expect(half.width).toBeGreaterThan(quarter.width);
    expect(full.width).toBeCloseTo(BAND.thick, 6);
    expect(half.width).toBeCloseTo(BAND.thin + (BAND.thick - BAND.thin) / 2, 6);
  });

  it("is blue below the baseline and red above it, as thick either way", () => {
    const down = bandOf(factor, -STOP / 2);
    const up = bandOf(factor, STOP / 2);
    expect(down.rising).toBe(false);
    expect(up.rising).toBe(true);
    expect(down.width).toBeCloseTo(up.width, 6);
    expect(down.to).toBeCloseTo(-STOP / 2, 6);
  });

  it("never reaches past the stop of the dial", () => {
    const band = bandOf(factor, 179);
    expect(band.to).toBeCloseTo(STOP, 6);
    expect(band.width).toBeCloseTo(BAND.thick, 6);
  });

  it("starts at the end of the track of an object whose baseline is an end of its range", () => {
    // A liver which cannot be healthier than healthy carries its reference at the left stop, so
    // the band of such an object runs from there and is the whole turn when it is turned home.
    const healthy = bandOf(impairment, -STOP);
    expect(healthy.from).toBeCloseTo(-STOP, 6);
    expect(healthy.to).toBeCloseTo(-STOP, 6);
    expect(healthy.width).toBeCloseTo(BAND.thin, 6);
    const ill = bandOf(impairment, STOP);
    expect(ill.from).toBeCloseTo(-STOP, 6);
    expect(ill.rising).toBe(true);
    expect(ill.width).toBeCloseTo(BAND.thick, 6);
    expect(bandOf(impairment, 0).width).toBeCloseTo(BAND.thin + (BAND.thick - BAND.thin) / 2, 6);
  });

  it("hangs at the detent of an object which carries its reference under the hand", () => {
    // A relative object is the reference wherever it was put down, so its band starts there.
    expect(bandOf(twist, 40).from).toBeCloseTo(0, 6);
    expect(bandOf(twist, -40).rising).toBe(false);
    expect(bandOf(undefined, 40).from).toBeCloseTo(0, 6);
  });
});
