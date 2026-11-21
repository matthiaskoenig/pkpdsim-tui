/**
 * The TUIO object model reduced to a snapshot. A `Tuio20Object` is a container that may carry a
 * token, a pointer, bounds or a symbol, each of them nullable, so the reduction is where the
 * nulls are dealt with once.
 */

import {unwrapAngle, wrapAngle} from "./angle.ts";
import type {SensorSize, TableSnapshot, TablePointer, TableToken} from "./types.ts";

/** The shape of a `Tuio20Token`, as the structural part a snapshot needs. */
export interface TuioTokenLike {
  readonly sessionId: number;
  readonly tuId: number;
  readonly cId: number;
  readonly position: {readonly x: number; readonly y: number};
  readonly angle: number;
}

/** The shape of a `Tuio20Pointer`. */
export interface TuioPointerLike extends TuioTokenLike {
  readonly radius: number;
  readonly press: number;
}

/** Any object identified by its session, which is all a removal needs. */
export interface TuioSession {
  readonly sessionId: number;
}

/** The shape of a `Tuio20Object`. */
export interface TuioObjectLike {
  readonly sessionId: number;
  readonly token: TuioTokenLike | null;
  readonly pointer: TuioPointerLike | null;
}

/**
 * The sensor of a surface nobody has reported yet. A tracker sends its real size in the frame
 * message within a frame or two of connecting.
 */
export const DEFAULT_SENSOR: SensorSize = {width: 1920, height: 1080};

/**
 * The sensor size of the packed `dim` field of a TUIO 2.0 frame: the width in the first two
 * bytes, the height in the final two.
 */
export function sensorFromDim(dim: number | null): SensorSize {
  if (dim === null || !Number.isFinite(dim) || dim <= 0) return DEFAULT_SENSOR;
  const width = dim % 65536;
  const height = Math.floor(dim / 65536);
  return width > 0 && height > 0 ? {width, height} : DEFAULT_SENSOR;
}

export function emptySnapshot(sensor: SensorSize = DEFAULT_SENSOR, at = 0): TableSnapshot {
  return {tokens: new Map(), pointers: new Map(), sensor, at};
}

export function withSensor(snapshot: TableSnapshot, sensor: SensorSize): TableSnapshot {
  return {...snapshot, sensor};
}

function tokenOf(previous: TableToken | undefined, token: TuioTokenLike, at: number): TableToken {
  const angle = wrapAngle(token.angle);
  return {
    sessionId: token.sessionId, marker: token.cId, typeId: token.tuId,
    x: token.position.x, y: token.position.y, angle,
    turn: previous === undefined ? angle : unwrapAngle(previous.turn, angle),
    at,
  };
}

function pointerOf(pointer: TuioPointerLike, at: number): TablePointer {
  return {
    sessionId: pointer.sessionId, typeId: pointer.tuId,
    x: pointer.position.x, y: pointer.position.y,
    radius: pointer.radius, press: pointer.press, at,
  };
}

/** The snapshot after a token or pointer was added or moved. */
export function applyTuioObject(snapshot: TableSnapshot, object: TuioObjectLike, at: number): TableSnapshot {
  if (object.token === null && object.pointer === null) return snapshot;
  const tokens = new Map(snapshot.tokens);
  const pointers = new Map(snapshot.pointers);
  if (object.token !== null) {
    tokens.set(object.sessionId, tokenOf(snapshot.tokens.get(object.sessionId), object.token, at));
  }
  if (object.pointer !== null) {
    pointers.set(object.sessionId, pointerOf(object.pointer, at));
  }
  return {tokens, pointers, sensor: snapshot.sensor, at};
}

/** The snapshot after an object was lifted. The session is gone, whatever it carried. */
export function removeTuioObject(snapshot: TableSnapshot, object: TuioSession | TuioObjectLike, at: number): TableSnapshot {
  if (!snapshot.tokens.has(object.sessionId) && !snapshot.pointers.has(object.sessionId)) {
    return {...snapshot, at};
  }
  const tokens = new Map(snapshot.tokens);
  const pointers = new Map(snapshot.pointers);
  tokens.delete(object.sessionId);
  pointers.delete(object.sessionId);
  return {tokens, pointers, sensor: snapshot.sensor, at};
}
