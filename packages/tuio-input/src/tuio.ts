/** Table input from a TUIO 2.0 tracker over WebSocket. */

import {Tuio20Client} from "tuio-client";
import type {Tuio20Object, TuioTime} from "tuio-client";
import {applyTuioObject, emptySnapshot, removeTuioObject, sensorFromDim, withSensor} from "./snapshot.ts";
import {DEFAULT_TUIO_HOST, DEFAULT_TUIO_PORT, WebsocketTuioReceiver} from "./receiver.ts";
import type {TableInput, TableListener, TableSnapshot, TableStatus} from "./types.ts";

export interface TuioTableInputOptions {
  readonly host?: string;
  readonly port?: number;
  readonly secure?: boolean;
  /** The clock of the snapshots, so a test or a recording can supply its own. */
  readonly now?: () => number;
}

/**
 * A `TableInput` over `tuio-client`. The snapshot is published once per bundle, on the refresh
 * that closes it, so an application renders once per frame of the tracker and not once per
 * object.
 */
export function createTuioTableInput(options: TuioTableInputOptions = {}): TableInput {
  const host = options.host ?? DEFAULT_TUIO_HOST;
  const port = options.port ?? DEFAULT_TUIO_PORT;
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
    host, port, secure: options.secure ?? false,
    onOpen: () => setStatus({state: "connected", source: receiver.url, detail: ""}),
    onClose: () => setStatus({
      state: "error", source: receiver.url,
      detail: "The tracker closed the connection. Start it and reload, or work on the mouse.",
    }),
    onError: () => setStatus({
      state: "error", source: receiver.url,
      detail: `No tracker on ${receiver.url}. Start the simulator on WebSocket, TUIO 2.0, port ${port}.`,
    }),
  });

  const client = new Tuio20Client(receiver);
  client.addTuioListener({
    tuioAdd: (object: Tuio20Object) => {
      snapshot = applyTuioObject(snapshot, object, now());
      dirty = true;
    },
    tuioUpdate: (object: Tuio20Object) => {
      snapshot = applyTuioObject(snapshot, object, now());
      dirty = true;
    },
    tuioRemove: (object: Tuio20Object) => {
      snapshot = removeTuioObject(snapshot, object, now());
      dirty = true;
    },
    tuioRefresh: (_time: TuioTime) => {
      const sensor = sensorFromDim(client.dim);
      if (sensor.width !== snapshot.sensor.width || sensor.height !== snapshot.sensor.height) {
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
    },
  });

  return {
    get status() {
      return status;
    },
    get snapshot() {
      return snapshot;
    },
    connect(): void {
      setStatus({state: "connecting", source: receiver.url, detail: `Waiting for a tracker on ${receiver.url}.`});
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
