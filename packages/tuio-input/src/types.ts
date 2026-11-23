/** The surface, as a table application sees it: tokens and touches in sensor fractions. */

/** A tangible object on the surface. Positions are fractions of the sensor, angles are radians. */
export interface TableToken {
  /** The TUIO session id: one presence of one object. */
  readonly sessionId: number;
  /** The TUIO 2.0 component id, which is the marker id of the object. */
  readonly marker: number;
  /** The TUIO 2.0 type and user id, packed as the protocol packs it. */
  readonly typeId: number;
  readonly x: number;
  readonly y: number;
  /** The angle as delivered, in [0, 2 pi). */
  readonly angle: number;
  /** The angle accumulated across the 2 pi boundary, so a twist of several turns is one number. */
  readonly turn: number;
  readonly at: number;
}

/** A touch on the surface. */
export interface TablePointer {
  readonly sessionId: number;
  readonly typeId: number;
  readonly x: number;
  readonly y: number;
  /** Normalized to the sensor height, as TUIO 2.0 defines it. */
  readonly radius: number;
  /** Pressure in -1..1, where a negative value is a hovering pointer. */
  readonly press: number;
  /**
   * Whether this is the mouse of a laptop rather than a finger of a tracker. The page sends the
   * click of a mouse by itself, so what presses an element for a finger leaves this one alone,
   * and nothing is pressed twice on the machine an application is developed on.
   */
  readonly mouse: boolean;
  readonly at: number;
}

/** The sensor size in pixels, from the packed `dim` field of the TUIO 2.0 frame message. */
export interface SensorSize {
  readonly width: number;
  readonly height: number;
}

/** Everything on the surface at one instant. */
export interface TableSnapshot {
  readonly tokens: ReadonlyMap<number, TableToken>;
  readonly pointers: ReadonlyMap<number, TablePointer>;
  readonly sensor: SensorSize;
  /** Milliseconds, as `performance.now()` or `Date.now()` report them. */
  readonly at: number;
}

export type TableInputState = "idle" | "connecting" | "connected" | "error";

export interface TableStatus {
  readonly state: TableInputState;
  /** What is delivering the input, for the status chip of an application. */
  readonly source: string;
  /** What a person should do about it, empty when there is nothing to do. */
  readonly detail: string;
}

export type TableListener = (snapshot: TableSnapshot, status: TableStatus) => void;

/**
 * One source of table input. A tracker over TUIO and the mouse fallback implement the same
 * interface, so an application does not know which one it is drawing.
 */
export interface TableInput {
  readonly status: TableStatus;
  readonly snapshot: TableSnapshot;
  connect(): void;
  disconnect(): void;
  /** Returns the function that unsubscribes. */
  subscribe(listener: TableListener): () => void;
}
