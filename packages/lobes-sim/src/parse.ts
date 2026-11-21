/** Runtime validation of the exported lobe data and of the configuration of a compiled liver. */

import type {Lobe, LobeCase, LobeConfig, LobeData, LobeSpecies} from "./types.ts";

function record(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${what} is not an object.`);
  }
  return value as Record<string, unknown>;
}

function numberAt(source: Record<string, unknown>, key: string, what: string): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${what} has no finite number at "${key}".`);
  }
  return value;
}

function stringAt(source: Record<string, unknown>, key: string, what: string): string {
  const value = source[key];
  if (typeof value !== "string") throw new TypeError(`${what} has no string at "${key}".`);
  return value;
}

function numbers(value: unknown, what: string): Record<string, number> {
  const source = record(value, what);
  for (const [key, entry] of Object.entries(source)) {
    if (typeof entry !== "number") throw new TypeError(`${what} has no number at "${key}".`);
  }
  return source as Record<string, number>;
}

function parseLobe(value: unknown, index: number): Lobe {
  const source = record(value, `Lobe ${index}`);
  return {
    token: stringAt(source, "token", `Lobe ${index}`),
    name: stringAt(source, "name", `Lobe ${index}`),
    mass_fraction: numberAt(source, "mass_fraction", `Lobe ${index}`),
    source: typeof source["source"] === "string" ? source["source"] : "",
  };
}

function parseCase(value: unknown, id: string): LobeCase {
  const source = record(value, `Case "${id}"`);
  const series = record(source["series"] ?? {}, `The series of "${id}"`);
  for (const [name, values] of Object.entries(series)) {
    if (!Array.isArray(values)) throw new TypeError(`The series "${name}" of "${id}" is not an array.`);
  }
  const lobes = source["lobes"];
  return {
    label: stringAt(source, "label", `Case "${id}"`),
    kind: typeof source["kind"] === "string" ? source["kind"] : "",
    lobes: Array.isArray(lobes) ? lobes.map(String) : [],
    changes: numbers(source["changes"] ?? {}, `The changes of "${id}"`),
    series: series as Record<string, number[]>,
  };
}

function parseSpecies(value: unknown, name: string): LobeSpecies {
  const source = record(value, `The species "${name}"`);
  const lobes = source["lobes"];
  if (!Array.isArray(lobes) || lobes.length === 0) {
    throw new TypeError(`The species "${name}" has no lobes.`);
  }
  const columns = source["columns"];
  if (!Array.isArray(columns)) throw new TypeError(`The species "${name}" has no columns.`);
  const cases = record(source["cases"] ?? {}, `The cases of "${name}"`);
  return {
    sbml_sha256: typeof source["sbml_sha256"] === "string" ? source["sbml_sha256"] : "",
    sexes: Array.isArray(source["sexes"]) ? source["sexes"].map(String) : ["male"],
    lobes: lobes.map(parseLobe),
    columns: columns.map(String),
    cases: Object.fromEntries(Object.entries(cases).map(([id, entry]) => [id, parseCase(entry, id)])),
  };
}

export function parseLobeData(value: unknown): LobeData {
  const source = record(value, "The lobe data");
  const species = record(source["species"], "The species of the lobe data");
  if (Object.keys(species).length === 0) throw new TypeError("The lobe data holds no species.");
  return {
    schema_version: typeof source["schema_version"] === "number" ? source["schema_version"] : 0,
    provenance: record(source["provenance"] ?? {}, "The provenance"),
    species: Object.fromEntries(
      Object.entries(species).map(([name, entry]) => [name, parseSpecies(entry, name)]),
    ),
  };
}

export function parseLobeConfig(value: unknown): LobeConfig {
  const source = record(value, "The lobe configuration");
  const columns = source["columns"];
  if (!Array.isArray(columns) || columns.length === 0) {
    throw new TypeError("The lobe configuration has no columns.");
  }
  return {
    species: typeof source["species"] === "string" ? source["species"] : "",
    columns: columns.map(String),
    start: numberAt(source, "start", "The lobe configuration"),
    end: numberAt(source, "end", "The lobe configuration"),
    points: numberAt(source, "points", "The lobe configuration"),
    dose: numberAt(source, "dose", "The lobe configuration"),
    settings: record(source["settings"] ?? {}, "The solver settings"),
    sbml_sha256: typeof source["sbml_sha256"] === "string" ? source["sbml_sha256"] : "",
  };
}

async function loadJson(url: string | URL): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${String(url)}: HTTP ${response.status}. Run "npm run sync".`);
  }
  return response.json();
}

export async function loadLobeData(url: string | URL): Promise<LobeData> {
  return parseLobeData(await loadJson(url));
}

export async function loadLobeConfig(url: string | URL): Promise<LobeConfig> {
  return parseLobeConfig(await loadJson(url));
}
