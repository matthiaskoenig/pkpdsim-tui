/**
 * A compiled SBML model running on the shipped Web Worker of sbmlsim-core, solved with
 * SUNDIALS IDA. This is the protocol of that worker and nothing else: no model, no integrator
 * and no equation lives here.
 */

import type {
  CoreHost, SimulationRequest, SimulationResult, Solver, SolverAssets, SolverWorker,
} from "./types.ts";

interface PendingJob {
  resolve(result: SimulationResult): void;
  reject(error: unknown): void;
  cleanup(): void;
}

export interface SolverOptions {
  readonly host: CoreHost;
  readonly assets: SolverAssets;
  /** The name the model is registered under in the worker. */
  readonly key?: string;
  /** For a test or a node host that brings its own worker. */
  readonly createWorker?: () => SolverWorker;
}

function listen(worker: SolverWorker, type: string, listener: (event: unknown) => void): () => void {
  if (typeof worker.addEventListener === "function") {
    worker.addEventListener(type, listener);
    return () => worker.removeEventListener?.(type, listener);
  }
  worker.on?.(type, listener);
  return () => worker.off?.(type, listener);
}

/**
 * A solver for one compiled model. The worker is started on the first run and torn down on an
 * error or an abort, so a run that is cancelled cannot leave a half finished integration behind.
 */
export async function createSolver(options: SolverOptions): Promise<Solver> {
  const key = options.key ?? "model";
  const {assets} = options;
  const [engine, mathlib, module] = await Promise.all([
    WebAssembly.compile(assets.engine),
    WebAssembly.compile(assets.mathlib),
    WebAssembly.compile(assets.model),
  ]);
  const description = JSON.parse(assets.description) as Record<string, unknown>;

  const factory = options.createWorker ?? options.host.blobWorkers();
  let worker: SolverWorker | null = null;
  let detach: (() => void) | null = null;
  let nextId = 0;
  let closed = false;
  const pending = new Map<number, PendingJob>();

  const stop = (reason: unknown): void => {
    detach?.();
    detach = null;
    worker?.terminate();
    worker = null;
    for (const job of pending.values()) {
      job.cleanup();
      job.reject(reason);
    }
    pending.clear();
  };

  const spawn = (): void => {
    const started = factory();
    worker = started;
    const receive = (event: unknown): void => {
      const message = ((event as {data?: unknown})?.data ?? event) as
        {id: number; type?: string; error?: {message?: string}} & SimulationResult;
      const job = pending.get(message.id);
      if (job === undefined) return;
      pending.delete(message.id);
      job.cleanup();
      if (message.type === "error") {
        job.reject(Object.assign(new Error(message.error?.message ?? "The simulation failed."), message.error));
        return;
      }
      job.resolve(message);
    };
    const failed = (event: unknown): void => {
      stop(new Error((event as {message?: string})?.message ?? "The simulation worker failed."));
    };
    const detachMessage = listen(started, "message", receive);
    const detachError = listen(started, "error", failed);
    detach = () => {
      detachMessage();
      detachError();
    };
    started.postMessage({type: "init", engine, mathlib});
    started.postMessage({type: "model", key, module, description: assets.description});
  };

  return {
    description,

    async simulate(request: SimulationRequest, {signal}: {signal?: AbortSignal} = {}): Promise<SimulationResult> {
      if (closed) throw new Error("The solver is closed.");
      signal?.throwIfAborted();
      if (worker === null) spawn();
      const started = worker;
      if (started === null) throw new Error("The simulation worker did not start.");
      return new Promise<SimulationResult>((resolve, reject) => {
        const id = ++nextId;
        const abort = (): void => stop(signal?.reason ?? new DOMException("Aborted", "AbortError"));
        signal?.addEventListener("abort", abort, {once: true});
        pending.set(id, {
          resolve, reject,
          cleanup: () => signal?.removeEventListener("abort", abort),
        });
        started.postMessage({type: "simulate", id, key, request});
      });
    },

    close(): void {
      closed = true;
      stop(new DOMException("Closed", "AbortError"));
    },
  };
}
