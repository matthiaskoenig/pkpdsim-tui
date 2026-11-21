/**
 * Where a table application gets its input from: the tracker it was pointed at, the tracker the
 * server it came from carries, or the mouse of the machine it is shown on.
 *
 * A tracker the page found by itself does not take the mouse away. The development server and
 * the preview server of this repository carry a tracker whether or not anybody is standing at a
 * simulated surface, so a page served by one answers both the objects of the simulator and the
 * keys and the pointer of the laptop it is open on. A tracker the address names is the real
 * table, and there the mouse is not a second pair of hands but a second set of ghosts.
 */

import {createMockTableInput} from "./mock.ts";
import {resolveTracker} from "./options.ts";
import type {TrackerOptions} from "./options.ts";
import {createTuioTableInput} from "./tuio.ts";
import type {TableInput, TableListener, TableSnapshot, TableStatus} from "./types.ts";

/** The sessions of the mouse are numbered far above those of a tracker, so the two never meet. */
const MOUSE_SESSION = 1000000;

function shifted<T extends {readonly sessionId: number}>(
  items: ReadonlyMap<number, T>,
): [number, T][] {
  return [...items.values()].map(item => [
    item.sessionId + MOUSE_SESSION, {...item, sessionId: item.sessionId + MOUSE_SESSION},
  ]);
}

function combine(tracker: TableSnapshot, mouse: TableSnapshot): TableSnapshot {
  return {
    tokens: new Map([...tracker.tokens, ...shifted(mouse.tokens)]),
    pointers: new Map([...tracker.pointers, ...shifted(mouse.pointers)]),
    sensor: tracker.sensor,
    at: Math.max(tracker.at, mouse.at),
  };
}

/** One surface out of two sources: what the tracker reports, and what the mouse puts down. */
function merge(tracker: TableInput, mouse: TableInput): TableInput {
  const listeners = new Set<TableListener>();
  let snapshot = combine(tracker.snapshot, mouse.snapshot);
  let status: TableStatus = tracker.status;
  const push = (): void => {
    for (const listener of listeners) listener(snapshot, status);
  };
  tracker.subscribe((next, nextStatus) => {
    snapshot = combine(next, mouse.snapshot);
    status = nextStatus;
    push();
  });
  mouse.subscribe(next => {
    snapshot = combine(tracker.snapshot, next);
    push();
  });
  return {
    get status(): TableStatus {
      return status;
    },
    get snapshot(): TableSnapshot {
      return snapshot;
    },
    connect(): void {
      tracker.connect();
      mouse.connect();
    },
    disconnect(): void {
      tracker.disconnect();
      mouse.disconnect();
    },
    subscribe(listener: TableListener): () => void {
      listeners.add(listener);
      return (): void => {
        listeners.delete(listener);
      };
    },
  };
}

export interface TableInputOptions {
  /** The query of the page, which says which tracker to use. */
  readonly parameters: URLSearchParams;
  /** The element the mouse drives the surface on. */
  readonly element: HTMLElement;
  /** The markers the number keys of the mouse put down, in order. */
  readonly markers: readonly number[];
}

export interface TableInputSource {
  readonly input: TableInput;
  /** The tracker the page settled on, for the panel which says what is driving the table. */
  readonly tracker: TrackerOptions;
}

/** The input of this page, with the tracker it is talking to. */
export async function openTableInput(options: TableInputOptions): Promise<TableInputSource> {
  const tracker = await resolveTracker(options.parameters);
  const mouse = (): TableInput => createMockTableInput({
    element: options.element, markers: [...options.markers],
  });
  if (!tracker.tracker) return {input: mouse(), tracker};
  const tuio = createTuioTableInput(tracker);
  return {input: tracker.discovered ? merge(tuio, mouse()) : tuio, tracker};
}
