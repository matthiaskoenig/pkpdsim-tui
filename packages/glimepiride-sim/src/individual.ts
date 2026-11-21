/**
 * The individual the glimepiride model is solved for: the dose they take, the activity of their
 * CYP2C9, how cirrhotic their liver is, what their kidneys still clear and what they weigh.
 *
 * The parameters are the ones of `glimepiride_body_flat.xml`, and the named categories are the
 * ones the marimo application of the model uses, so a table and that application describe the
 * same patient with the same numbers.
 */

/** The parameter of the model each control writes, and the values it may take. */
export interface GlimepirideControl {
  readonly id: string;
  readonly parameter: string;
  readonly label: string;
  readonly unit: string;
  readonly min: number;
  readonly max: number;
  /** The reference individual of this table, which is who is simulated without an object. */
  readonly value: number;
}

/** The sexes the body of the individual can be. */
export const SEXES = ["male", "female"] as const;

export type Sex = (typeof SEXES)[number];

/**
 * The reference adult of either sex, as `database/tables/physiology_human.toml` of pkpdsim
 * carries it (ICRP 89). The model scales the organs, their blood flows and the cardiac output
 * from the body weight and the height, so the sex of the individual is these two numbers.
 */
export const REFERENCE_BODIES: Readonly<Record<Sex, {weight: number; height: number}>> = {
  male: {weight: 73, height: 176},
  female: {weight: 60, height: 163},
};

/** What the body of an individual is set from: the height, which no dial carries. */
export const HEIGHT_PARAMETER = "HEIGHT";

/**
 * The reference individual takes 4 mg, has two wild type alleles, no cirrhosis, a creatinine
 * clearance of 110 ml/min and is the reference adult male of 73 kg. The female body is the same
 * individual at the female reference of 60 kg and 163 cm.
 */
export const GLIMEPIRIDE_CONTROLS = {
  dose: {
    id: "dose", parameter: "PODOSE_gli", label: "Dose", unit: "mg",
    min: 0, max: 8, value: 4,
  },
  cyp2c9: {
    id: "cyp2c9", parameter: "LI__f_cyp2c9", label: "CYP2C9 activity", unit: "x",
    min: 0.23, max: 1, value: 1,
  },
  cirrhosis: {
    id: "cirrhosis", parameter: "f_cirrhosis", label: "Cirrhosis", unit: "",
    min: 0, max: 0.95, value: 0,
  },
  renal: {
    id: "renal", parameter: "KI__f_renal_function", label: "Creatinine clearance", unit: "ml/min",
    min: 10, max: 110, value: 110,
  },
  weight: {
    id: "weight", parameter: "BW", label: "Body weight", unit: "kg",
    min: 40, max: 170, value: REFERENCE_BODIES.male.weight,
  },
} as const satisfies Record<string, GlimepirideControl>;

export type GlimepirideIndividual = {
  -readonly [K in keyof typeof GLIMEPIRIDE_CONTROLS]: number;
};

/** The creatinine clearance of a person whose kidneys work as the model expects. */
export const NORMAL_CRCL = 110;

/** The reference individual of a body, which is who is simulated with nothing on the table. */
export function referenceIndividual(sex: Sex = "male"): GlimepirideIndividual {
  const individual = Object.fromEntries(
    Object.entries(GLIMEPIRIDE_CONTROLS).map(([key, control]) => [key, control.value]),
  ) as GlimepirideIndividual;
  return {...individual, weight: REFERENCE_BODIES[sex].weight};
}

/**
 * The height of an individual of that body and that weight. The reference height of the sex is
 * kept, because a dial changes what a person weighs and not how tall they are.
 */
export function heightOf(sex: Sex = "male"): number {
  return REFERENCE_BODIES[sex].height;
}

/** The individual with every value checked and the reference filled in. */
export function normalizeIndividual(
  individual: Partial<GlimepirideIndividual> = {},
): GlimepirideIndividual {
  const values = {} as GlimepirideIndividual;
  for (const [key, control] of Object.entries(GLIMEPIRIDE_CONTROLS) as
      [keyof GlimepirideIndividual, GlimepirideControl][]) {
    const value = Number(individual[key] ?? control.value);
    if (!Number.isFinite(value)) throw new RangeError(`${control.label} must be a finite number.`);
    if (value < control.min || value > control.max) {
      throw new RangeError(`${control.label} must be between ${control.min} and ${control.max} ${control.unit}.`);
    }
    values[key] = value;
  }
  return values;
}

/**
 * The individual as the parameters of the model. The kidneys are the one control that is not a
 * parameter: the model takes the fraction of the renal function that is left, and a clearance
 * above the reference does not make the kidneys clear more than they can.
 */
export function parametersOf(
  individual: Partial<GlimepirideIndividual> = {},
  sex: Sex = "male",
): [string, number][] {
  const values = normalizeIndividual(individual);
  return [
    [HEIGHT_PARAMETER, heightOf(sex)],
    [GLIMEPIRIDE_CONTROLS.dose.parameter, values.dose],
    [GLIMEPIRIDE_CONTROLS.cyp2c9.parameter, values.cyp2c9],
    [GLIMEPIRIDE_CONTROLS.cirrhosis.parameter, values.cirrhosis],
    [GLIMEPIRIDE_CONTROLS.renal.parameter, Math.min(values.renal / NORMAL_CRCL, 1)],
    [GLIMEPIRIDE_CONTROLS.weight.parameter, values.weight],
  ];
}
