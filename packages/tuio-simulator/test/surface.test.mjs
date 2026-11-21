import {describe, expect, it} from "vitest";

import {TWO_PI, wrapAngle} from "../src/angle.mjs";
import {createSessionIds} from "../src/sessions.mjs";
import {
  DEFAULT_POINTER_PRESS, DEFAULT_POINTER_RADIUS, emptySurface, frameOf, normalizeSurface,
} from "../src/surface.mjs";

const frameInfo = {frameId: 7, time: 0n, source: "test@localhost"};

describe("the angle of the protocol", () => {
  it("is normalized into [0, 2 pi)", () => {
    expect(wrapAngle(0)).toBe(0);
    expect(wrapAngle(Math.PI)).toBeCloseTo(Math.PI, 12);
    expect(wrapAngle(TWO_PI)).toBe(0);
    expect(wrapAngle(-Math.PI / 2)).toBeCloseTo(TWO_PI - Math.PI / 2, 12);
    expect(wrapAngle(3 * TWO_PI + 0.5)).toBeCloseTo(0.5, 12);
    expect(wrapAngle(-3 * TWO_PI - 0.5)).toBeCloseTo(TWO_PI - 0.5, 12);
  });

  it("never leaves the half open interval, whatever the turn was", () => {
    for (let turn = -20; turn <= 20; turn += 0.37) {
      const wrapped = wrapAngle(turn);
      expect(wrapped).toBeGreaterThanOrEqual(0);
      expect(wrapped).toBeLessThan(TWO_PI);
    }
  });

  it("is zero for anything that is not an angle", () => {
    expect(wrapAngle(Number.NaN)).toBe(0);
    expect(wrapAngle(Number.POSITIVE_INFINITY)).toBe(0);
    expect(wrapAngle(undefined)).toBe(0);
  });
});

describe("the surface of the control page", () => {
  it("starts empty, on the default sensor", () => {
    const surface = emptySurface();
    expect(surface.tokens).toEqual([]);
    expect(surface.pointers).toEqual([]);
    expect(surface.sensor).toEqual({width: 1920, height: 1080});
  });

  it("holds every field of the protocol in range", () => {
    const surface = normalizeSurface({
      sensor: {width: 3840, height: 2160},
      tokens: [{key: "t1", marker: 2.4, x: -3, y: 9, angle: -Math.PI / 2}],
      pointers: [{key: "p1", x: 0.25, y: 0.75, radius: 4, press: -9}],
    });
    expect(surface.sensor).toEqual({width: 3840, height: 2160});
    expect(surface.tokens).toEqual([{key: "t1", marker: 2, x: 0, y: 1, angle: wrapAngle(-Math.PI / 2)}]);
    expect(surface.pointers).toEqual([{key: "p1", x: 0.25, y: 0.75, radius: 1, press: -1}]);
  });

  it("gives a touch the radius and the pressure of a finger when the page names none", () => {
    const [pointer] = normalizeSurface({pointers: [{key: "p1", x: 0.5, y: 0.5}]}).pointers;
    expect(pointer.radius).toBe(DEFAULT_POINTER_RADIUS);
    expect(pointer.press).toBe(DEFAULT_POINTER_PRESS);
  });

  it("drops an object without a key and a second object under a key that is taken", () => {
    const surface = normalizeSurface({
      tokens: [{marker: 1, x: 0.5, y: 0.5}, {key: "t1", marker: 1}, {key: "t1", marker: 2}],
      pointers: [{key: "p1", x: 0.5, y: 0.5}, {key: "p1", x: 0.1, y: 0.1}, {x: 0.2, y: 0.2}],
    });
    expect(surface.tokens.map(token => token.marker)).toEqual([1]);
    expect(surface.pointers.map(pointer => pointer.x)).toEqual([0.5]);
  });

  it("survives a message that holds nothing at all", () => {
    expect(normalizeSurface({})).toEqual(emptySurface());
    expect(normalizeSurface(null)).toEqual(emptySurface());
  });
});

describe("the frame of a surface", () => {
  it("attaches a session id to every object", () => {
    const sessions = createSessionIds();
    const surface = normalizeSurface({
      tokens: [{key: "t1", marker: 1, x: 0.5, y: 0.5, angle: 0}],
      pointers: [{key: "p1", x: 0.1, y: 0.2}],
    });
    const frame = frameOf(surface, sessions, frameInfo);
    expect(frame.frameId).toBe(7);
    expect(frame.tokens).toEqual([{sessionId: 1, typeId: 0, marker: 1, x: 0.5, y: 0.5, angle: 0}]);
    expect(frame.pointers[0]).toMatchObject({sessionId: 2, x: 0.1, y: 0.2, angle: 0, shear: 0});
  });

  it("keeps the session id of an object that stays and releases the one that leaves", () => {
    const sessions = createSessionIds();
    const put = normalizeSurface({tokens: [{key: "t1", marker: 1}, {key: "t2", marker: 2}]});
    const first = frameOf(put, sessions, frameInfo);
    expect(first.tokens.map(token => token.sessionId)).toEqual([1, 2]);

    const lifted = normalizeSurface({tokens: [{key: "t2", marker: 2}]});
    const second = frameOf(lifted, sessions, frameInfo);
    expect(second.tokens.map(token => token.sessionId)).toEqual([2]);

    const back = normalizeSurface({tokens: [{key: "t1", marker: 1}, {key: "t2", marker: 2}]});
    const third = frameOf(back, sessions, frameInfo);
    expect(third.tokens.map(token => token.sessionId)).toEqual([3, 2]);
  });

  it("gives a token and a touch of the same page key their own sessions", () => {
    const sessions = createSessionIds();
    const surface = normalizeSurface({
      tokens: [{key: "one", marker: 1}],
      pointers: [{key: "one", x: 0, y: 0}],
    });
    const frame = frameOf(surface, sessions, frameInfo);
    expect(frame.tokens[0].sessionId).toBe(1);
    expect(frame.pointers[0].sessionId).toBe(2);
  });
});
