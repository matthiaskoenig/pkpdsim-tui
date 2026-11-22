import {describe, expect, it} from "vitest";
import {createSolver} from "../src/solver.ts";
import type {SimulationRequest, SolverWorker} from "../src/types.ts";

/** The eight bytes of an empty module, which is all the solver needs to compile here. */
const EMPTY_WASM = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);

interface Sent {
  readonly type: string;
  readonly id?: number;
}

/** A worker which records what it was sent and answers when the test says so. */
function fakeWorker(): {
  worker: SolverWorker;
  sent: Sent[];
  terminations: () => number;
  answer: (id: number) => void;
} {
  const listeners = new Map<string, ((event: unknown) => void)[]>();
  const sent: Sent[] = [];
  let terminations = 0;
  const worker: SolverWorker = {
    postMessage(message: unknown): void {
      sent.push(message as Sent);
    },
    terminate(): void {
      terminations += 1;
    },
    addEventListener(type: string, listener: (event: unknown) => void): void {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    removeEventListener(type: string, listener: (event: unknown) => void): void {
      listeners.set(type, (listeners.get(type) ?? []).filter(known => known !== listener));
    },
  };
  return {
    worker, sent,
    terminations: () => terminations,
    answer(id: number): void {
      for (const listener of listeners.get("message") ?? []) {
        listener({data: {id, columns: ["time"], values: [0], nRows: 1}});
      }
    },
  };
}

const REQUEST = {start: 0, end: 1, steps: 1} as unknown as SimulationRequest;

async function solverWith(worker: SolverWorker): ReturnType<typeof createSolver> {
  return createSolver({
    host: {blobWorkers: () => () => worker},
    assets: {
      engine: EMPTY_WASM, mathlib: EMPTY_WASM, model: EMPTY_WASM, description: "{}",
    },
    createWorker: () => worker,
  });
}

describe("createSolver", () => {
  it("keeps the worker when a run is abandoned, so the next turn of an object is not a new engine", async () => {
    const fake = fakeWorker();
    const solver = await solverWith(fake.worker);
    const first = new AbortController();
    const abandoned = solver.simulate(REQUEST, {signal: first.signal});
    first.abort();
    await expect(abandoned).rejects.toThrow();
    expect(fake.terminations()).toBe(0);

    const second = solver.simulate(REQUEST);
    const run = fake.sent.filter(message => message.type === "simulate");
    expect(run).toHaveLength(2);
    // The engine and the model were built once, for the worker which is still there.
    expect(fake.sent.filter(message => message.type === "init")).toHaveLength(1);
    expect(fake.sent.filter(message => message.type === "model")).toHaveLength(1);
    fake.answer(run[1]?.id ?? 0);
    await expect(second).resolves.toMatchObject({nRows: 1});
  });

  it("throws the answer of a run nobody waits for away", async () => {
    const fake = fakeWorker();
    const solver = await solverWith(fake.worker);
    const controller = new AbortController();
    const abandoned = solver.simulate(REQUEST, {signal: controller.signal});
    controller.abort();
    await expect(abandoned).rejects.toThrow();
    const run = fake.sent.filter(message => message.type === "simulate");
    // The worker finishes what it was doing and its answer arrives late: nothing listens for it
    // any more, and nothing throws over it either.
    expect(() => fake.answer(run[0]?.id ?? 0)).not.toThrow();
  });

  it("tears the worker down when the solver is closed", async () => {
    const fake = fakeWorker();
    const solver = await solverWith(fake.worker);
    const pending = solver.simulate(REQUEST);
    solver.close();
    await expect(pending).rejects.toThrow();
    expect(fake.terminations()).toBe(1);
  });
});
