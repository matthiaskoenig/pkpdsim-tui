/**
 * The request and the result of the simulation contract of sbmlsim-core, as the shipped Web
 * Worker speaks it. Nothing here is specific to a model.
 */

/** A value set on the model: the id of a parameter or a state, and its value. */
export type ValueChange = readonly [string, number];

/** A change applied to the running model at a time point. */
export interface TimedChange {
  readonly time: number;
  readonly values: readonly ValueChange[];
}

/** One run of a compiled model. */
export interface SimulationRequest {
  readonly contract: "simulation/1";
  readonly start: number;
  readonly end: number;
  readonly output: {readonly times: readonly number[]};
  /** Values applied before the initial values are resolved. */
  readonly preinit: readonly ValueChange[];
  /** Values applied to the running model, which is how an intervention at a time is written. */
  readonly changes: readonly TimedChange[];
  readonly steady_state: null;
  /** The columns of the result, by their id in the model. */
  readonly selections: readonly string[];
  readonly settings?: Readonly<Record<string, unknown>>;
}

/** The result of one run: the columns, and their values row by row in one flat array. */
export interface SimulationResult {
  readonly columns: readonly string[];
  readonly values: ArrayLike<number>;
  readonly nRows: number;
}

/** One column of a result per name. */
export type Series = Readonly<Record<string, number[]>>;

/** The bytes and the description a compiled model needs to run. */
export interface SolverAssets {
  readonly engine: BufferSource;
  readonly mathlib: BufferSource;
  readonly model: BufferSource;
  /** The `model.json` of the compiled model, as text. */
  readonly description: string;
}

/** The part of the browser host of sbmlsim-core this package uses. */
export interface CoreHost {
  blobWorkers(): () => SolverWorker;
}

/** What a worker has to offer, in the browser and in node. */
export interface SolverWorker {
  postMessage(message: unknown): void;
  terminate(): void;
  addEventListener?(type: string, listener: (event: unknown) => void): void;
  removeEventListener?(type: string, listener: (event: unknown) => void): void;
  on?(type: string, listener: (event: unknown) => void): void;
  off?(type: string, listener: (event: unknown) => void): void;
}

export interface Solver {
  /** The compiled model, as `model.json` describes it. */
  readonly description: Readonly<Record<string, unknown>>;
  simulate(request: SimulationRequest, options?: {signal?: AbortSignal}): Promise<SimulationResult>;
  close(): void;
}
