import {describe, expect, it} from "vitest";
import {applyTuioObject, emptySnapshot, removeTuioObject, sensorFromDim} from "../src/snapshot.ts";
import type {TuioObjectLike} from "../src/snapshot.ts";

const TWO_PI = Math.PI * 2;

function token(sessionId: number, x: number, y: number, angle: number, marker = 1): TuioObjectLike {
  return {sessionId, pointer: null, token: {sessionId, tuId: 0, cId: marker, position: {x, y}, angle}};
}

function pointer(sessionId: number, x: number, y: number): TuioObjectLike {
  return {sessionId, token: null,
    pointer: {sessionId, tuId: 1, cId: 0, position: {x, y}, angle: 0, radius: 0.01, press: 0.5}};
}

describe("sensorFromDim", () => {
  it("unpacks the two unsigned 16 bit halves of the frame dimension", () => {
    expect(sensorFromDim(640 + 480 * 65536)).toEqual({width: 640, height: 480});
    expect(sensorFromDim(1920 + 1080 * 65536)).toEqual({width: 1920, height: 1080});
  });

  it("falls back to a landscape default without a frame", () => {
    expect(sensorFromDim(null).width).toBeGreaterThan(sensorFromDim(null).height);
  });
});

describe("applyTuioObject", () => {
  it("adds a token with its marker, position and angle", () => {
    const snapshot = applyTuioObject(emptySnapshot(), token(7, 0.25, 0.75, 1.5, 4), 1000);
    const added = snapshot.tokens.get(7);
    expect(added).toMatchObject({sessionId: 7, marker: 4, x: 0.25, y: 0.75, angle: 1.5, turn: 1.5});
    expect(snapshot.pointers.size).toBe(0);
    expect(snapshot.at).toBe(1000);
  });

  it("moves a token without replacing the snapshot of the others", () => {
    let snapshot = applyTuioObject(emptySnapshot(), token(7, 0.25, 0.75, 0), 1000);
    snapshot = applyTuioObject(snapshot, token(8, 0.5, 0.5, 0, 2), 1001);
    snapshot = applyTuioObject(snapshot, token(7, 0.3, 0.7, 0), 1002);
    expect(snapshot.tokens.get(7)).toMatchObject({x: 0.3, y: 0.7});
    expect(snapshot.tokens.get(8)).toMatchObject({x: 0.5, y: 0.5});
    expect(snapshot.tokens.size).toBe(2);
  });

  it("accumulates the turn of a token across the 2 pi boundary", () => {
    let snapshot = applyTuioObject(emptySnapshot(), token(7, 0.5, 0.5, TWO_PI - 0.1), 1000);
    snapshot = applyTuioObject(snapshot, token(7, 0.5, 0.5, 0.1), 1001);
    expect(snapshot.tokens.get(7)?.angle).toBeCloseTo(0.1, 12);
    expect(snapshot.tokens.get(7)?.turn).toBeCloseTo(TWO_PI + 0.1, 12);
  });

  it("adds a pointer with its radius and pressure", () => {
    const snapshot = applyTuioObject(emptySnapshot(), pointer(3, 0.1, 0.2), 1000);
    expect(snapshot.pointers.get(3)).toMatchObject({sessionId: 3, x: 0.1, y: 0.2, radius: 0.01, press: 0.5});
    expect(snapshot.tokens.size).toBe(0);
  });

  it("ignores an object that carries neither a token nor a pointer", () => {
    const before = emptySnapshot();
    const after = applyTuioObject(before, {sessionId: 9, token: null, pointer: null}, 1000);
    expect(after.tokens.size).toBe(0);
    expect(after.pointers.size).toBe(0);
  });
});

describe("removeTuioObject", () => {
  it("removes a lifted token and keeps the rest", () => {
    let snapshot = applyTuioObject(emptySnapshot(), token(7, 0.25, 0.75, 0), 1000);
    snapshot = applyTuioObject(snapshot, pointer(3, 0.1, 0.2), 1001);
    snapshot = removeTuioObject(snapshot, token(7, 0.25, 0.75, 0), 1002);
    expect(snapshot.tokens.size).toBe(0);
    expect(snapshot.pointers.size).toBe(1);
  });

  it("removes a lifted pointer by its session", () => {
    let snapshot = applyTuioObject(emptySnapshot(), pointer(3, 0.1, 0.2), 1000);
    snapshot = removeTuioObject(snapshot, {sessionId: 3, token: null, pointer: null}, 1001);
    expect(snapshot.pointers.size).toBe(0);
  });
});
