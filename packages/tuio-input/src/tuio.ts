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

  const publish = (): void => {
    for (const listener of listeners) listener(snapshot, status);
  };
  const setStatus = (next: TableStatus): void => {
    status = next;
    publish();
  };

  const receiver = new WebsocketTuioReceiver({
    host, port, secure: options.secure ?? false, path: options.path ?? DEFAULT_TUIO_PATH,
    onOpen: () => setStatus({state: "connected", source: receiver.url, detail: ""}),
    // What to do about it is the business of the application, which knows how it was started.
    onClose: () => setStatus({
      state: "error", source: receiver.url, detail: `The tracker on ${receiver.url} closed the connection.`,
    }),
    onError: () => setStatus({
      state: "error", source: receiver.url, detail: `No tracker answers on ${receiver.url}.`,
    }),
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
      setStatus({
        state: "connecting", source: receiver.url,
        detail: `Waiting for a TUIO ${version} tracker on ${receiver.url}.`,
      });
      client.connect();
    },
    disconnect(): void {
      client.disconnect();
      setStatus({state: "idle", source: receiver.url, detail: ""});
    },
    subscribe(listener: TableListener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
