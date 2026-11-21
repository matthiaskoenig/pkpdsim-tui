/** The exported reference data of the cardiovascular model of pkpdsim. */

/** One organ of the systemic circulation. */
export interface Organ {
  readonly id: string;
  readonly name: string;
  /** True when the organ drains into the portal vein instead of the vena cava. */
  readonly portal: boolean;
  /** The vascular resistance of the reference physiology, in mmHg/(l/min). */
  readonly resistance: number;
  /** The blood flow of the reference physiology, in l/min. */
  readonly flow: number;
}

/** The steady state of the reference circulation, in mmHg and l/min. */
export interface PressureReference {
  readonly arterial_pressure: number;
  readonly venous_pressure: number;
  readonly portal_pressure: number;
  readonly hepatic_pressure: number;
  readonly cardiac_output: number;
  readonly portal_resistance: number;
  readonly hepatic_resistance: number;
  readonly organs: readonly Organ[];
}

/** What a table application sets: four resistance factors and the pressure boundaries. */
export interface PressureControls {
  /** Factor on the resistance of the hepatic veins. */
  readonly hepatic: number;
  /** Factor on the resistance of every systemic organ. */
  readonly systemic: number;
  /** Factor on the resistance of the portal vein. */
  readonly portal: number;
  /** Factor on the resistance of the kidneys, on top of the systemic factor. */
  readonly renal: number;
  readonly arterial: number;
  readonly venous: number;
}

export interface OrganFlow extends Organ {
  /** The conductance under the current controls, in (l/min)/mmHg. */
  readonly conductance: number;
}

/** The solution of the steady pressure network. */
export interface PressureSolution {
  /** The portal pressure, in mmHg. */
  readonly ppo: number;
  /** The pressure in the liver, in mmHg. */
  readonly pli: number;
  /** The portal flow, in l/min. */
  readonly qpo: number;
  /** The hepatic venous flow, in l/min. */
  readonly qh: number;
  /** The hepatic arterial flow, in l/min. */
  readonly qha: number;
  /** The cardiac output, in l/min. */
  readonly co: number;
  readonly flows: readonly OrganFlow[];
  /** The flow of the organs that drain directly into the vena cava, in l/min. */
  readonly systemicFlow: number;
  /** Conservation at the portal node; zero up to the rounding of the arithmetic. */
  readonly portalResidual: number;
  /** Conservation at the hepatic node; zero up to the rounding of the arithmetic. */
  readonly hepaticResidual: number;
}

export interface Series {
  readonly columns: readonly string[];
  readonly values: readonly (readonly number[])[];
}

/** One exported heartbeat case, solved with SUNDIALS IDA on the compiled SBML. */
export interface HeartCase {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  /** The parameter values the case applies at the intervention. */
  readonly changes: Readonly<Record<string, number>>;
  readonly heart_rate: number;
  readonly series: Series;
  readonly beats: Series;
  readonly summary: Readonly<Record<string, unknown>>;
}

export interface CardiovascularData {
  readonly schema_version: number;
  readonly provenance: Readonly<Record<string, unknown>>;
  readonly pressure: PressureReference;
  readonly cases: readonly HeartCase[];
}

/** One body of the exported anatomy: a silhouette in centimetres and the organ anchors. */
export interface Body {
  /** SVG path data of the silhouette, in centimetres, with the origin at the top of the head. */
  readonly svg: string;
  /** The body height, in centimetres. */
  readonly height: number;
  /** The organ anchors, as `[x, y]` in the coordinates of the silhouette. */
  readonly anchors: Readonly<Record<string, readonly [number, number]>>;
}

export interface Anatomy {
  readonly attribution: string;
  readonly source: string;
  readonly license: string;
  readonly bodies: Readonly<Record<string, Body>>;
}
