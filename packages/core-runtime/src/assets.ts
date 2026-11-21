/** Fetching the bytes of a compiled model and of the runtime it needs. */

import type {SolverAssets} from "./types.ts";

async function bytes(url: URL): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${url.pathname}: HTTP ${response.status}. Run "npm run sync".`);
  }
  return response.arrayBuffer();
}

async function text(url: URL): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${url.pathname}: HTTP ${response.status}. Run "npm run sync".`);
  }
  return response.text();
}

export interface AssetOptions {
  /** Where the runtime lives, when it is shared between several models. */
  readonly runtimeBase?: URL;
  /** The name of the compiled model, for a directory that holds several. */
  readonly model?: string;
}

/**
 * The assets of one compiled model. `base` holds `model.wasm` and `model.json`; the runtime
 * `engine.wasm` and `mathlib.wasm` live there too unless `runtimeBase` says otherwise, which is
 * how several models of one application share one runtime.
 */
export async function fetchSolverAssets(base: URL, options: AssetOptions = {}): Promise<SolverAssets> {
  const runtime = options.runtimeBase ?? base;
  const model = options.model ?? "model.wasm";
  const [engine, mathlib, compiled, description] = await Promise.all([
    bytes(new URL("engine.wasm", runtime)),
    bytes(new URL("mathlib.wasm", runtime)),
    bytes(new URL(model, base)),
    text(new URL("model.json", base)),
  ]);
  return {engine, mathlib, model: compiled, description};
}
