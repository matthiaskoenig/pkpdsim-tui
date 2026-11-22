/**
 * Table input from a mouse, a touch screen and the keyboard. This is not a test double: it is how
 * a table application is developed and demonstrated on a laptop, and it carries the same
 * interface as a tracker, so an application cannot tell the difference.
 */

import {wrapAngle} from "./angle.ts";
import {applyTuioObject, emptySnapshot, removeTuioObject} from "./snapshot.ts";
import type {TuioObjectLike} from "./snapshot.ts";
import type {SensorSize, TableInput, TableListener, TableSnapshot, TableStatus} from "./types.ts";

export interface MockTableInputOptions {
  /** The element the gestures are read from, which is the surface of the application. */
  readonly element: HTMLElement;
  /** The markers the digit keys place, in order. */
  readonly markers?: readonly number[];
  readonly sensor?: SensorSize;
  /** How close to the centre of a token a press has to be to grab it, in pixels. */
  readonly grabRadius?: number;
  /** How far a wheel notch turns a token. */
  readonly radiansPerPixel?: number;
  readonly now?: () => number;
}

export interface MockTableInput extends TableInput {
  /** Puts a token of this marker on the surface and returns its session id. */
  place(marker: number, x: number, y: number): number;
  /** Lifts the token or pointer of this session. A session that is not there is ignored. */
  lift(sessionId: number): void;
  /** Lifts everything. */
  clear(): void;
}

export function createMockTableInput(options: MockTableInputOptions): MockTableInput {
  const {element} = options;
  const markers = options.markers ?? [1, 2, 3, 4];
  const grabRadius = options.grabRadius ?? 70;
  const radiansPerPixel = options.radiansPerPixel ?? 0.004;
  const now = options.now ?? (() => performance.now());
  const listeners = new Set<TableListener>();

  let snapshot: TableSnapshot = emptySnapshot(options.sensor);
  let status: TableStatus = {
    state: "idle", source: "mouse and keyboard",
    detail: "No tracker. The surface is driven from this machine.",
  };
  let nextSession = 1;
  let dragging: number | null = null;
  let touching: number | null = null;
  let cursor = {x: 0.5, y: 0.5};

  const publish = (): void => {
    for (const listener of listeners) listener(snapshot, status);
  };

  const normalize = (clientX: number, clientY: number): {x: number; y: number} => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.width > 0 ? (clientX - rect.left) / rect.width : 0,
      y: rect.height > 0 ? (clientY - rect.top) / rect.height : 0,
    };
  };

  const applyToken = (sessionId: number, marker: number, x: number, y: number, angle: number): void => {
    const object: TuioObjectLike = {
      sessionId, pointer: null,
      token: {sessionId, tuId: 0, cId: marker, position: {x, y}, angle: wrapAngle(angle)},
    };
    snapshot = applyTuioObject(snapshot, object, now());
    publish();
  };

  const applyPointer = (sessionId: number, x: number, y: number): void => {
    const object: TuioObjectLike = {
      sessionId, token: null,
      pointer: {sessionId, tuId: 0, cId: 0, position: {x, y}, angle: 0, radius: 0.01, press: 0.5},
    };
    snapshot = applyTuioObject(snapshot, object, now());
    publish();
  };

  const sessionAt = (x: number, y: number): number | null => {
    const rect = element.getBoundingClientRect();
    let best: number | null = null;
    let bestDistance = grabRadius * grabRadius;
    for (const token of snapshot.tokens.values()) {
      const dx = (token.x - x) * rect.width;
      const dy = (token.y - y) * rect.height;
      const distance = dx * dx + dy * dy;
      if (distance <= bestDistance) {
        best = token.sessionId;
        bestDistance = distance;
      }
    }
    return best;
  };

  const lift = (sessionId: number): void => {
    if (!snapshot.tokens.has(sessionId) && !snapshot.pointers.has(sessionId)) return;
    snapshot = removeTuioObject(snapshot, {sessionId}, now());
    if (dragging === sessionId) dragging = null;
    if (touching === sessionId) touching = null;
    publish();
  };

  const onPointerDown = (event: Event): void => {
    const {clientX, clientY} = event as PointerEvent;
    cursor = normalize(clientX, clientY);
    const grabbed = sessionAt(cursor.x, cursor.y);
    if (grabbed !== null) {
      dragging = grabbed;
      return;
    }
    touching = nextSession++;
    applyPointer(touching, cursor.x, cursor.y);
  };

  const onPointerMove = (event: Event): void => {
    const {clientX, clientY} = event as PointerEvent;
    cursor = normalize(clientX, clientY);
    if (dragging !== null) {
      const token = snapshot.tokens.get(dragging);
      if (token !== undefined) applyToken(token.sessionId, token.marker, cursor.x, cursor.y, token.turn);
      return;
    }
    if (touching !== null) applyPointer(touching, cursor.x, cursor.y);
  };

  const onPointerUp = (): void => {
    dragging = null;
    if (touching !== null) lift(touching);
  };

  const onWheel = (event: Event): void => {
    const wheel = event as WheelEvent;
    cursor = normalize(wheel.clientX, wheel.clientY);
    const turned = sessionAt(cursor.x, cursor.y);
    if (turned === null) return;
    const token = snapshot.tokens.get(turned);
    if (token === undefined) return;
    if (typeof wheel.preventDefault === "function") wheel.preventDefault();
    applyToken(token.sessionId, token.marker, token.x, token.y, token.turn + wheel.deltaY * radiansPerPixel);
  };

  const onKeyDown = (event: Event): void => {
    const key = (event as KeyboardEvent).key;
    const digit = Number.parseInt(key, 10);
    if (Number.isInteger(digit) && digit >= 0 && digit <= 9) {
      // The panel names an object by its marker, so that is the key which puts it down. A
      // table whose markers do not fit on the ten keys falls back to the place in its list.
      const marker = markers.includes(digit) ? digit : markers[digit - 1];
      if (marker !== undefined) place(marker, cursor.x, cursor.y);
      return;
    }
    if (key === "Backspace" || key === "Delete") {
      const under = sessionAt(cursor.x, cursor.y);
      if (under !== null) lift(under);
      return;
    }
    if (key === "Escape") clear();
  };

  function place(marker: number, x: number, y: number): number {
    const sessionId = nextSession++;
    applyToken(sessionId, marker, x, y, 0);
    return sessionId;
  }

  function clear(): void {
    for (const sessionId of [...snapshot.tokens.keys(), ...snapshot.pointers.keys()]) lift(sessionId);
  }

  return {
    get status() {
      return status;
    },
    get snapshot() {
      return snapshot;
    },
    connect(): void {
      element.addEventListener("pointerdown", onPointerDown);
      element.addEventListener("pointermove", onPointerMove);
      element.addEventListener("pointerup", onPointerUp);
      element.addEventListener("pointercancel", onPointerUp);
      element.addEventListener("wheel", onWheel, {passive: false});
      element.ownerDocument.addEventListener("keydown", onKeyDown);
      status = {...status, state: "connected"};
      publish();
    },
    disconnect(): void {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", onPointerUp);
      element.removeEventListener("pointercancel", onPointerUp);
      element.removeEventListener("wheel", onWheel);
      element.ownerDocument.removeEventListener("keydown", onKeyDown);
      status = {...status, state: "idle"};
      publish();
    },
    subscribe(listener: TableListener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    place,
    lift,
    clear,
  };
}
