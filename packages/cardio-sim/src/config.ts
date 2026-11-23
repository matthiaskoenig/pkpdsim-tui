/** The `config.json` beside the compiled heart: what one run of it asks for. */

import {assetJson} from "@pkpdsim-tui/core-runtime";
import type {HeartConfig} from "./heart.ts";

function numberAt(source: Record<string, unknown>, key: string, what: string): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${what} has no number "${key}".`);
  }
  return value;
}

/** The configuration of the compiled heart, with every field of a run checked. */
export function parseHeartConfig(value: unknown): HeartConfig {
  if (typeof value !== "object" || value === null) {
    throw new TypeError("The heart configuration is not an object.");
  }
  const source = value as Record<string, unknown>;
  const what = "The heart configuration";
  const columns = source["columns"];
  if (!Array.isArray(columns) || columns.some(column => typeof column !== "string")) {
    throw new TypeError(`${what} has no columns.`);
  }
  const settings = source["settings"];
  return {
    columns: columns as string[],
    start: numberAt(source, "start", what),
    end: numberAt(source, "end", what),
    intervention: numberAt(source, "intervention", what),
    initial_heart_rate: numberAt(source, "initial_heart_rate", what),
    summary_beats: numberAt(source, "summary_beats", what),
    summary_step_seconds: numberAt(source, "summary_step_seconds", what),
    ...(typeof source["sbml_sha256"] === "string" ? {sbml_sha256: source["sbml_sha256"]} : {}),
    ...(typeof settings === "object" && settings !== null
      ? {settings: settings as Record<string, unknown>}
      : {}),
  };
}

/** The configuration beside a compiled heart. */
export async function loadHeartConfig(url: URL): Promise<HeartConfig> {
  return parseHeartConfig(await assetJson(url));
}
