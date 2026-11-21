/** The exported liver lobe data of pkpdsim. */

/** What has been done to a segment of the liver. */
export type LobeState = "intact" | "portal" | "arterial" | "resected";

/** One segment of the liver, as the model divides it. */
export interface Lobe {
  /** The id the parameters of this segment are named after, for example `sg8`. */
  readonly token: string;
  readonly name: string;
  /** The share of the mass of the liver this segment carries. */
  readonly mass_fraction: number;
  readonly source: string;
}

export interface LobeCase {
  readonly label: string;
  /** `intact`, `PortalLigation` or `Resection`. */
  readonly kind: string;
  readonly lobes: readonly string[];
  readonly changes: Readonly<Record<string, number>>;
  readonly series: Readonly<Record<string, readonly number[]>>;
}

export interface LobeSpecies {
  readonly sbml_sha256: string;
  readonly sexes: readonly string[];
  readonly lobes: readonly Lobe[];
  readonly columns: readonly string[];
  readonly cases: Readonly<Record<string, LobeCase>>;
}

export interface LobeData {
  readonly schema_version: number;
  readonly provenance: Readonly<Record<string, unknown>>;
  readonly species: Readonly<Record<string, LobeSpecies>>;
}

/** The configuration shipped beside a compiled lobed liver. */
export interface LobeConfig {
  readonly species: string;
  readonly columns: readonly string[];
  readonly start: number;
  readonly end: number;
  readonly points: number;
  /** The dose of the marker drug, in mg. */
  readonly dose: number;
  readonly settings: Readonly<Record<string, unknown>>;
  readonly sbml_sha256: string;
}
