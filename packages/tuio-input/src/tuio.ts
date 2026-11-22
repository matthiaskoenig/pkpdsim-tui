/** Table input from a TUIO tracker over WebSocket, in either version of the protocol. */

import {Tuio11Client, Tuio20Client} from "tuio-client";
import type {Tuio11Blob, Tuio11Cursor, Tuio11Object, Tuio20Object, TuioTime} from "tuio-client";
import {
  applyTuioObject, emptySnapshot, removeTuioObject, sensorFromDim, withSensor,
} from "./snapshot.ts";
import type {TuioObjectLike} from "./snapshot.ts";
import {
  DEFAULT_TUIO_HOST, DEFAULT_TUIO_PATH, DEFAULT_TUIO_PORT, WebsocketTuioReceiver,
} from "./receiver.ts";
import type {TableInput, TableListener, TableSnapshot, TableStatus} from "./types.ts";

/** The versions of TUIO an application can be pointed at. */
export const TUIO_VERSIONS = ["2.0", "1.1"] as const;

export type TuioVersion = (typeof TUIO_VERSIONS)[number];

/** TUIO 2.0, which is what the simulator and the tables of Interactive Scape speak. */
export const DEFAULT_TUIO_VERSION: TuioVersion = "2.0";

/**
 * The radius and the pressure of a touch in TUIO 1.1, which has neither: a cursor is a point.
 * An application that draws a finger needs a size, so it gets the one of a fingertip.
 */
const CURSOR_RADIUS = 0.02;
const CURSOR_PRESS = 0.5;

/** The first wait before the page tries a tracker again, and the longest wait it ever takes. */
const RETRY_FIRST = 1000;
const RETRY_LONGEST = 8000;

/**
 * How long to wait before attempt number `attempt`, counted from one. The wait doubles until it
 * stands at `RETRY_LONGEST`, so a tracker which is restarting is back within a second and one
 * which is off for the evening is asked about every eight.
 */
export function retryDelay(attempt: number): number {
  return Math.min(RETRY_LONGEST, RETRY_FIRST * 2 ** Math.max(0, attempt - 1));
}

export interface TuioTableInputOptions {
  readonly host?: string;
  readonly port?: number;
  readonly secure?: boolean;
  /** The path of the WebSocket, "/" for a tracker which listens on a port of its own. */
  readonly path?: string;
  /** Which version the tracker speaks. The two are different protocols, not two dialects. */
  readonly version?: TuioVersion;
  /** The clock of the snapshots, so a test or a recording can supply its own. */
  readonly now?: () => number;
}

/**
 * A TUIO 1.1 object as the snapshot reads it: the symbol of a marker is its id, and the type and
 * user id of TUIO 2.0 has no counterpart, so it is 0, which is what a tracker reports when it
 * does not know who is touching.
 */
function objectOf(object: Tuio11Object): TuioObjectLike {
  return {
    sessionId: object.sessionId,
    token: {
      sessionId: object.sessionId, tuId: 0, cId: object.symbolId,
      position: {x: object.position.x, y: object.position.y}, angle: object.angle,
    },
    pointer: null,
  };
}

/** A TUIO 1.1 cursor as the snapshot reads it. */
function cursorOf(cursor: Tuio11Cursor): TuioObjectLike {
  return {
    sessionId: cursor.sessionId,
    token: null,
    pointer: {
      sessionId: cursor.sessionId, tuId: 0, cId: cursor.cursorId,
      position: {x: cursor.position.x, y: cursor.position.y}, angle: 0,
      radius: CURSOR_RADIUS, press: CURSOR_PRESS,
    },
  };
}

/**
 * A `TableInput` over `tuio-client`. The snapshot is published once per bundle, on the refresh
 * that closes it, so an application renders once per frame of the tracker and not once per
 * object.
 */
export function createTuioTableInput(options: TuioTableInputOptions = {}): TableInput {
  const host = options.host ?? DEFAULT_TUIO_HOST;
  const port = options.port ?? DEFAULT_TUIO_PORT;
  const version = options.version ?? DEFAULT_TUIO_VERSION;
  const now = options.now ?? (() => performance.now());
  const listeners = new Set<TableListener>();

  let snapshot = emptySnapshot();
  let status: TableStatus = {state: "idle", source: `ws://${host}:${port}`, detail: ""};
  let dirty = false;
  /** Whether the application asked for the tracker and has not let it go again. */
  let wanted = false;
  let attempt = 0;
  let timer: number | undefined;

  const publish = (): void => {
    for (const listener of listeners) listener(snapshot, status);
  };
  const setStatus = (next: TableStatus): void => {
    status = next;
    publish();
  };

  const waiting = (): TableStatus => ({
    state: "connecting", source: receiver.url,
    detail: `Waiting for a TUIO ${version} tracker on ${receiver.url}.`,
  });

  /**
   * A tracker which went away. The table of an exhibition stands for a day, and a tracker which
   * is restarted or a socket which is dropped once must not end the day, so the page asks again
   * until it answers. The objects of a tracker which is gone are not known to be on the glass
   * any anymore, so the surface is emptied and the table falls back to the body at rest; a
   * tracker which comes back reports what is on it with its first bundle.
   */
  const lost = (detail: string): void => {
    snapshot = emptySnapshot();
    if (!wanted) {
      setStatus({state: "idle", source: receiver.url, detail: ""});
      return;
    }
    if (timer !== undefined) {
      // A socket which fails reports the error and the close, which is one loss, not two.
      publish();
      return;
    }
    attempt += 1;
    const wait = retryDelay(attempt);
    setStatus({
      state: "error", source: receiver.url,
      detail: `${detail} Trying again in ${Math.round(wait / 1000)} s.`,
    });
    timer = window.setTimeout(() => {
      timer = undefined;
      if (!wanted) return;
      setStatus(waiting());
      client.connect();
    }, wait);
  };

  const receiver = new WebsocketTuioReceiver({
    host, port, secure: options.secure ?? false, path: options.path ?? DEFAULT_TUIO_PATH,
    onOpen: () => {
      attempt = 0;
      setStatus({state: "connected", source: receiver.url, detail: ""});
    },
    onClose: () => lost(`The tracker on ${receiver.url} closed the connection.`),
    onError: () => lost(`No tracker answers on ${receiver.url}.`),
  });

  const apply = (object: TuioObjectLike): void => {
    snapshot = applyTuioObject(snapshot, object, now());
    dirty = true;
  };
  const drop = (object: {sessionId: number}): void => {
    snapshot = removeTuioObject(snapshot, object, now());
    dirty = true;
  };

  /** The end of a bundle: the one place an application is told, and only when something moved. */
  const refresh = (sensor: {width: number; height: number} | null): void => {
    if (sensor !== null
      && (sensor.width !== snapshot.sensor.width || sensor.height !== snapshot.sensor.height)) {
      snapshot = withSensor(snapshot, sensor);
      dirty = true;
    }
    if (status.state !== "connected") {
      status = {state: "connected", source: receiver.url, detail: ""};
      dirty = true;
    }
    if (!dirty) return;
    dirty = false;
    publish();
  };

  const client = version === "1.1" ? new Tuio11Client(receiver) : new Tuio20Client(receiver);
  if (client instanceof Tuio11Client) {
    const ignore = (_blob: Tuio11Blob): void => undefined;
    client.addTuioListener({
      addTuioObject: (object: Tuio11Object) => apply(objectOf(object)),
      updateTuioObject: (object: Tuio11Object) => apply(objectOf(object)),
      removeTuioObject: (object: Tuio11Object) => drop(object),
      addTuioCursor: (cursor: Tuio11Cursor) => apply(cursorOf(cursor)),
      updateTuioCursor: (cursor: Tuio11Cursor) => apply(cursorOf(cursor)),
      removeTuioCursor: (cursor: Tuio11Cursor) => drop(cursor),
      // TUIO 1.1 blobs are the untagged shapes of a tracker, which no application here draws.
      addTuioBlob: ignore,
      updateTuioBlob: ignore,
      removeTuioBlob: ignore,
      // TUIO 1.1 carries no sensor size: the surface is the unit square and nothing else.
      refresh: (_time: TuioTime) => refresh(null),
    });
  } else {
    client.addTuioListener({
      tuioAdd: (object: Tuio20Object) => apply(object),
      tuioUpdate: (object: Tuio20Object) => apply(object),
      tuioRemove: (object: Tuio20Object) => drop(object),
      tuioRefresh: (_time: TuioTime) => refresh(sensorFromDim(client.dim)),
    });
  }

  return {
    get status() {
      return status;
    },
    get snapshot() {
      return snapshot;
    },
    connect(): void {
      wanted = true;
      attempt = 0;
      setStatus(waiting());
      client.connect();
    },
    disconnect(): void {
      wanted = false;
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
      client.disconnect();
      setStatus({state: "idle", source: receiver.url, detail: ""});
    },
    subscribe(listener: TableListener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
