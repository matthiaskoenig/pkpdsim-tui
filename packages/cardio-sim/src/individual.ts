/**
 * Who the tables are about: the age, the sex and the body weight of the person on the glass.
 *
 * Every model of the collection is built on one physiology and scales its organs, their blood
 * volumes and their flows from the body weight and the height, which is what the three tables
 * of a person are solved with. Age is not a parameter of a model: it is the reference body of
 * that age, from the reference children of ICRP 89 (`database/tables/children_human.toml` of
 * pkpdsim: 0, 1, 5, 10 and 15 years of either sex, with the adult of `physiology_human.toml` at
 * 35 years), interpolated in age the way the library interpolates it, and the fall of the
 * kidney function of an adult with the years (`age_human.toml`, Delanaye 2022 and Eriksen 2020).
 *
 * What this is not: a model of a child. A four year old is not a small adult, and the enzymes
 * of a child, the fraction of water in their tissues and the way they absorb a tablet are not
 * those of a grown up. What the tables show at four years is the physiology of a body of that
 * size, which is where a visitor starts to see why a child is given another dose.
 */

/** The two reference bodies of the library. The female body is the one a table opens with. */
export const SEXES = ["female", "male"] as const;
export type Sex = (typeof SEXES)[number];

/** The years a visitor can be on the glass, and the age a table opens at. */
export const AGE_RANGE = {min: 4, max: 120, value: 35} as const;

/** The age of the reference adult of ICRP 89, where the children meet the grown ups. */
const ADULT_AGE = 35;

/**
 * The reference children and the reference adult of ICRP 89, by age in years: what a body of
 * that age weighs, how tall it is, and how much blood its heart moves in a minute.
 */
const REFERENCE: Readonly<Record<Sex, {
  readonly ages: readonly number[];
  readonly weight: readonly number[];
  readonly height: readonly number[];
  readonly output: readonly number[];
}>> = {
  male: {
    ages: [0, 1, 5, 10, 15, ADULT_AGE],
    weight: [3.5, 10, 19, 32, 56, 73],
    height: [51, 76, 109, 138, 167, 176],
    output: [0.6, 1.2, 3.4, 5, 6.1, 6.5],
  },
  female: {
    ages: [0, 1, 5, 10, 15, ADULT_AGE],
    weight: [3.5, 10, 19, 32, 53, 60],
    height: [51, 76, 109, 138, 161, 163],
    output: [0.6, 1.2, 3.4, 5, 6.1, 5.9],
  },
};

/** How a flow follows a body which is heavier than the reference of its age (Huisinga 2012). */
const FLOW_EXPONENT = 0.75;

/**
 * How much of the kidney function of a 40 year old is left at this age. It is one at every age
 * below 40, because the function of a child is grown by about a year of age and the library
 * matures it on the postmenstrual age, and falls from there with the years.
 */
const RENAL: Readonly<Record<Sex, {readonly ages: readonly number[]; readonly value: readonly number[]}>> = {
  male: {ages: [40, 50, 100], value: [1, 0.9169, 0.578]},
  female: {ages: [40, 50, 100], value: [1, 0.9169, 0.484]},
};

/** A value between the points of a table, held at its ends. */
function between(
  ages: readonly number[], values: readonly number[], age: number,
): number {
  const first = values[0] ?? 0;
  if (age <= (ages[0] ?? 0)) return first;
  for (let at = 1; at < ages.length; at += 1) {
    const upper = ages[at] ?? 0;
    const lower = ages[at - 1] ?? 0;
    if (age > upper) continue;
    const span = upper - lower;
    const low = values[at - 1] ?? first;
    const high = values[at] ?? first;
    return span === 0 ? high : low + (high - low) * (age - lower) / span;
  }
  return values[values.length - 1] ?? first;
}

/** The age, held inside the years the tables are about. */
export function clampAge(age: number): number {
  if (!Number.isFinite(age)) return AGE_RANGE.value;
  return Math.min(AGE_RANGE.max, Math.max(AGE_RANGE.min, age));
}

export interface ReferenceBody {
  /** The body weight of the reference person of this age and sex, in kilograms. */
  readonly weight: number;
  /** Their height, in centimetres. */
  readonly height: number;
}

/** The reference body of an age and a sex, which is the body a table opens with. */
export function referenceBody(age: number, sex: Sex = "female"): ReferenceBody {
  const table = REFERENCE[sex];
  const years = clampAge(age);
  return {
    weight: Math.round(between(table.ages, table.weight, years) * 10) / 10,
    height: Math.round(between(table.ages, table.height, years)),
  };
}

/**
 * How much heavier or lighter than the reference a visitor can make this body. A person of a
 * weight far from the reference of their age is a person the physiology was never written for,
 * so the dial stays inside half again of the reference either way.
 */
export function weightRange(age: number, sex: Sex = "female"): {min: number; max: number} {
  const {weight} = referenceBody(age, sex);
  return {
    min: Math.max(3, Math.round(weight * 0.65 * 10) / 10),
    max: Math.round(weight * 1.6 * 10) / 10,
  };
}

/** The body weight, held inside what the physiology of that age is written for. */
export function clampWeight(weight: number, age: number, sex: Sex = "female"): number {
  const range = weightRange(age, sex);
  if (!Number.isFinite(weight)) return referenceBody(age, sex).weight;
  return Math.min(range.max, Math.max(range.min, Math.round(weight * 10) / 10));
}

/**
 * The fraction of the kidney function of a young adult which is left at this age, which is what
 * the creatinine clearance of the individual is scaled by.
 */
export function renalFactor(age: number, sex: Sex = "female"): number {
  const table = RENAL[sex];
  return Math.round(between(table.ages, table.value, clampAge(age)) * 10000) / 10000;
}

/**
 * How much blood the heart of this person moves in a minute, in litres: the cardiac output of
 * the reference body of that age (ICRP 89, Table 2.39), carried to the weight of this body by
 * the three quarter power of the mass, as the flows of the physiology are.
 */
export function cardiacOutput(individual: Individual): number {
  const table = REFERENCE[individual.sex];
  const years = clampAge(individual.age);
  const output = between(table.ages, table.output, years);
  const reference = between(table.ages, table.weight, years);
  const factor = reference <= 0 ? 1 : (individual.weight / reference) ** FLOW_EXPONENT;
  return Math.round(output * factor * 1000) / 1000;
}

/**
 * How every flow of this person stands to the same flow of the reference adult of their body.
 * The circulation of the table is a network of resistances solved at a fixed pressure: a body
 * which moves half the blood of a grown up is that network with twice the resistance, which is
 * how the physiology renormalises the flows of the organs over the cardiac output.
 */
export function flowScale(individual: Individual): number {
  const adult = individualOf(ADULT_AGE, individual.sex);
  const reference = cardiacOutput(adult);
  return reference <= 0 ? 1 : cardiacOutput(individual) / reference;
}

/** Who is on the glass: what every table of a person is solved for. */
export interface Individual {
  readonly age: number;
  readonly sex: Sex;
  /** What they weigh, which is the reference of their age unless a dial says otherwise. */
  readonly weight: number;
  /** How tall they are, which follows the age and the sex alone. */
  readonly height: number;
}

/** The individual of an age, a sex and a weight, with everything checked and filled in. */
export function individualOf(
  age: number = AGE_RANGE.value, sex: Sex = "female", weight?: number,
): Individual {
  const years = clampAge(age);
  const body = referenceBody(years, sex);
  return {
    age: years,
    sex,
    weight: weight === undefined ? body.weight : clampWeight(weight, years, sex),
    height: body.height,
  };
}

/** The body of an individual, as the parameters every human model of the collection carries. */
export function bodyParameters(individual: Individual): [string, number][] {
  return [["BW", individual.weight], ["HEIGHT", individual.height]];
}
