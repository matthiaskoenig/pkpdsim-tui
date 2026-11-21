/**
 * Runtime validation of the exported data. A table application loads files it did not generate,
 * and a missing field has to be a readable message at the start, not a NaN in the middle of a
 * demonstration.
 */

import type {
  Anatomy, Body, CardiovascularData, HeartCase, HeartSummaries, HeartSummary, Organ,
  PressureReference, Series,
} from "./types.ts";

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

function arrayAt(source: Record<string, unknown>, key: string, what: string): unknown[] {
  const value = source[key];
  if (!Array.isArray(value)) throw new TypeError(`${what} has no array at "${key}".`);
  return value;
}

function parseOrgan(value: unknown, index: number): Organ {
  const source = record(value, `Organ ${index}`);
  return {
    id: stringAt(source, "id", `Organ ${index}`),
    name: stringAt(source, "name", `Organ ${index}`),
    portal: source["portal"] === true,
    resistance: numberAt(source, "resistance", `Organ ${index}`),
    flow: numberAt(source, "flow", `Organ ${index}`),
  };
}

export function parsePressureReference(value: unknown): PressureReference {
  const source = record(value, "The pressure reference");
  const organs = arrayAt(source, "organs", "The pressure reference").map(parseOrgan);
  if (organs.length === 0) throw new TypeError("The pressure reference has no organs.");
  return {
    arterial_pressure: numberAt(source, "arterial_pressure", "The pressure reference"),
    venous_pressure: numberAt(source, "venous_pressure", "The pressure reference"),
    portal_pressure: numberAt(source, "portal_pressure", "The pressure reference"),
    hepatic_pressure: numberAt(source, "hepatic_pressure", "The pressure reference"),
    cardiac_output: numberAt(source, "cardiac_output", "The pressure reference"),
    portal_resistance: numberAt(source, "portal_resistance", "The pressure reference"),
    hepatic_resistance: numberAt(source, "hepatic_resistance", "The pressure reference"),
    organs,
  };
}

function parseSeries(value: unknown, what: string): Series {
  const source = record(value, what);
  const columns = arrayAt(source, "columns", what).map((column, index) => {
    if (typeof column !== "string") throw new TypeError(`${what} has no column name at ${index}.`);
    return column;
  });
  const values = arrayAt(source, "values", what).map((row, index) => {
    if (!Array.isArray(row)) throw new TypeError(`${what} has no row at ${index}.`);
    return row as number[];
  });
  return {columns, values};
}

const SUMMARY_NUMBERS = [
  "arterial_systolic", "arterial_diastolic", "mean_arterial_pressure", "mean_portal_pressure",
  "mean_hepatic_pressure", "mean_cardiac_output", "mean_lung_flow", "stroke_volume", "heart_rate",
  "mean_hepatic_flow", "mean_portal_flow",
] as const;

function parseSummary(value: unknown, what: string): HeartSummary {
  const source = record(value, what);
  const numbers = Object.fromEntries(SUMMARY_NUMBERS.map(name => [name, numberAt(source, name, what)]));
  const flows = record(source["mean_flows"] ?? {}, `${what} mean flows`);
  return {...numbers, mean_flows: flows as Record<string, number>} as HeartSummary;
}

function parseSummaries(value: unknown, what: string): HeartSummaries {
  const source = record(value, what);
  return {
    before: parseSummary(source["before"], `${what} before`),
    after: parseSummary(source["after"], `${what} after`),
    maximum_blood_volume_error: typeof source["maximum_blood_volume_error"] === "number"
      ? source["maximum_blood_volume_error"]
      : 0,
  };
}

function parseCase(value: unknown, index: number): HeartCase {
  const what = `Heart case ${index}`;
  const source = record(value, what);
  const changes = record(source["changes"] ?? {}, `${what} changes`);
  return {
    id: stringAt(source, "id", what),
    label: stringAt(source, "label", what),
    description: typeof source["description"] === "string" ? source["description"] : "",
    changes: changes as Record<string, number>,
    heart_rate: numberAt(source, "heart_rate", what),
    series: parseSeries(source["series"], `${what} series`),
    beats: parseSeries(source["beats"], `${what} beats`),
    summary: parseSummaries(source["summary"], `${what} summary`),
  };
}

export function parseCardiovascularData(value: unknown): CardiovascularData {
  const source = record(value, "The cardiovascular data");
  if (!("pressure" in source)) throw new TypeError("The cardiovascular data has no pressure block.");
  return {
    schema_version: typeof source["schema_version"] === "number" ? source["schema_version"] : 0,
    provenance: record(source["provenance"] ?? {}, "The provenance"),
    pressure: parsePressureReference(source["pressure"]),
    cases: arrayAt(source, "cases", "The cardiovascular data").map(parseCase),
  };
}

function parseBody(value: unknown, name: string): Body {
  const source = record(value, `The body "${name}"`);
  const anchors = record(source["anchors"], `The anchors of "${name}"`);
  const parsed: Record<string, readonly [number, number]> = {};
  for (const [id, anchor] of Object.entries(anchors)) {
    if (!Array.isArray(anchor) || anchor.length < 2
      || typeof anchor[0] !== "number" || typeof anchor[1] !== "number") {
      throw new TypeError(`The anchor "${id}" of "${name}" is not a pair of numbers.`);
    }
    parsed[id] = [anchor[0], anchor[1]];
  }
  return {
    svg: stringAt(source, "svg", `The body "${name}"`),
    height: numberAt(source, "height", `The body "${name}"`),
    anchors: parsed,
  };
}

export function parseAnatomy(value: unknown): Anatomy {
  const source = record(value, "The anatomy");
  const bodies = record(source["bodies"], "The bodies of the anatomy");
  const parsed: Record<string, Body> = {};
  for (const [name, body] of Object.entries(bodies)) parsed[name] = parseBody(body, name);
  if (Object.keys(parsed).length === 0) throw new TypeError("The anatomy has no bodies.");
  return {
    attribution: typeof source["attribution"] === "string" ? source["attribution"] : "",
    source: typeof source["source"] === "string" ? source["source"] : "",
    license: typeof source["license"] === "string" ? source["license"] : "",
    bodies: parsed,
  };
}
