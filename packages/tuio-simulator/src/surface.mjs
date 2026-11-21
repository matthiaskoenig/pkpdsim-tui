/**
 * The surface of the simulator: what is on the table, in the terms the control page speaks.
 *
 * The page sends whole states rather than events, because a state is idempotent: a dropped or a
 * duplicated message cannot leave the surface out of step with the page. Nothing that arrives is
 * trusted, so this is also where a position becomes a fraction of the surface, an angle becomes
 * the [0, 2 pi) of the protocol and a marker becomes a whole number.
 */

import {wrapAngle} from "./angle.mjs";
import {clampSensor, DEFAULT_SENSOR} from "./sensor.mjs";

/** The radius of a touch, as a fraction of the sensor height, when the page names none. */
export const DEFAULT_POINTER_RADIUS = 0.02;

/** The pressure of a touch on the glass. Negative pressure is a finger hovering above it. */
export const DEFAULT_POINTER_PRESS = 0.5;

/** The largest marker a token can carry: `c_id` is a signed 32 bit integer. */
const MAX_MARKER = 2147483647;

function fraction(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(1, Math.max(0, number));
}

function markerOf(value) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.min(number, MAX_MARKER);
}

function pressOf(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_POINTER_PRESS;
  return Math.min(1, Math.max(-1, number));
}

function keyOf(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 64 ? value : null;
}

/** An empty table of the default size, which is what the simulator starts on. */
export function emptySurface() {
  return {sensor: DEFAULT_SENSOR, tokens: [], pointers: []};
}

/**
 * The state of the surface described by `raw`, with every field of the protocol in range and
 * every object keyed once. A second token under a key that is already taken is dropped: two of
 * them would share a session id, and a session id is one presence of one object. A token and a
 * touch are separate objects, so the same key may name one of each.
 */
export function normalizeSurface(raw) {
  const sensor = clampSensor(raw?.sensor ?? DEFAULT_SENSOR);
  const tokenKeys = new Set();
  const pointerKeys = new Set();
  const tokens = [];
  const pointers = [];
  for (const token of Array.isArray(raw?.tokens) ? raw.tokens : []) {
    const key = keyOf(token?.key);
    if (key === null || tokenKeys.has(key)) continue;
    tokenKeys.add(key);
    tokens.push({
      key,
      marker: markerOf(token?.marker),
      x: fraction(token?.x),
      y: fraction(token?.y),
      angle: wrapAngle(Number(token?.angle)),
    });
  }
  for (const pointer of Array.isArray(raw?.pointers) ? raw.pointers : []) {
    const key = keyOf(pointer?.key);
    if (key === null || pointerKeys.has(key)) continue;
    pointerKeys.add(key);
    pointers.push({
      key,
      x: fraction(pointer?.x),
      y: fraction(pointer?.y),
      radius: pointer?.radius === undefined ? DEFAULT_POINTER_RADIUS : fraction(pointer.radius),
      press: pressOf(pointer?.press),
    });
  }
  return {sensor, tokens, pointers};
}

/**
 * The frame of a surface: the same objects, with the session ids of `sessions` attached and the
 * sessions of everything that has left released. The `tu_id` of every object is 0, which is the
 * type and user a tracker reports when it does not know who is touching.
 *
 * @param {object} surface a normalized surface
 * @param {object} sessions the allocator of `sessions.mjs`
 * @param {{frameId: number, time: bigint, source: string}} frame what the frame message carries
 */
export function frameOf(surface, sessions, {frameId, time, source}) {
  const tokens = surface.tokens.map(token => ({
    sessionId: sessions.idFor(`token:${token.key}`),
    typeId: 0,
    marker: token.marker,
    x: token.x,
    y: token.y,
    angle: token.angle,
  }));
  const pointers = surface.pointers.map(pointer => ({
    sessionId: sessions.idFor(`pointer:${pointer.key}`),
    typeId: 0,
    componentId: 0,
    x: pointer.x,
    y: pointer.y,
    angle: 0,
    shear: 0,
    radius: pointer.radius,
    press: pointer.press,
  }));
  sessions.retain([
    ...surface.tokens.map(token => `token:${token.key}`),
    ...surface.pointers.map(pointer => `pointer:${pointer.key}`),
  ]);
  return {frameId, time, source, sensor: surface.sensor, tokens, pointers};
}
