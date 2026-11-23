/**
 * Fetching the files of an export: the bytes of a compiled model, the runtime it needs, and what
 * a table says when one of them is not where the page expects it.
 *
 * The models of the tables and their reference data are not in the repository: they are written
 * by pkpdsim and travel with a release, and `npm run assets` is what puts them where a page
 * looks for them. A sentence about a file which is not there says that one command, because it
 * is the one which puts all of them there, whichever table asked and whether the checkout was
 * cloned an hour ago or is a booth whose disk was replaced. Whoever looks after the table reads
 * it under the one sentence the visitor is given, and it is the whole of what they need: which
 * file, why, and what to run.
 */

import type {SolverAssets} from "./types.ts";

/**
 * The command which puts the resources of the table where a page looks for them: the models of
 * every table and the clips it reads aloud, taken from the release this checkout is.
 */
export const ASSET_COMMAND = "npm run assets";

/** The file, as short as it can be said: the path of it, without the host it came from. */
function where(url: string | URL): string {
  if (url instanceof URL) return url.pathname;
  try {
    return new URL(url, "http://table.invalid").pathname;
  } catch {
    return url;
  }
}

/** Which file could not be loaded, why, and the command which writes it. */
export function missingAsset(url: string | URL, why: string): Error {
  return new Error(`Could not load ${where(url)}: ${why}. Run "${ASSET_COMMAND}".`);
}

/**
 * The answer to a request for one file of an export, or an error which names it.
 *
 * A development server answers a path it does not know with the page of the application itself,
 * with a 200 beside it, so a model which was never copied in arrives as a page of HTML. That is
 * a missing file like a 404 is, and it is said so here: a parser further down would otherwise
 * report an unexpected character of the page, which names neither the file nor the command.
 */
export async function fetchAsset(url: string | URL): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok) throw missingAsset(url, `HTTP ${response.status}`);
  if ((response.headers.get("content-type") ?? "").includes("text/html")) {
    throw missingAsset(url, "the server answered with the page of the application, not the file");
  }
  return response;
}

/** One file of an export, read as the JSON it is. */
export async function assetJson(url: string | URL): Promise<unknown> {
  const response = await fetchAsset(url);
  try {
    return await response.json();
  } catch (error) {
    throw missingAsset(url, error instanceof Error ? error.message : String(error));
  }
}

async function bytes(url: URL): Promise<ArrayBuffer> {
  return (await fetchAsset(url)).arrayBuffer();
}

async function text(url: URL): Promise<string> {
  return (await fetchAsset(url)).text();
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
