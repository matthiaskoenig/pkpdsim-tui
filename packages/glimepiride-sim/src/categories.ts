/**
 * The names a value of a dial carries: the CYP2C9 genotype behind an activity, the Child-Pugh
 * class behind a degree of cirrhosis, and the stage behind a creatinine clearance.
 *
 * A dial on the table is continuous, and a clinician reads categories, so the table says both:
 * the number it is set to, and the category it is nearest to.
 */

/** The activity of one allele, as a fraction of the wild type. */
export const ALLELE_ACTIVITY: Readonly<Record<string, number>> = {
  "*1": 1,
  "*2": 0.63,
  "*3": 0.23,
};

export interface Category {
  readonly label: string;
  readonly value: number;
}

/** The genotypes of CYP2C9, by the activity of the pair. */
export const GENOTYPES: readonly Category[] = Object.entries(ALLELE_ACTIVITY)
  .flatMap(([first, left], index, alleles) => alleles.slice(index).map(([second, right]) => ({
    label: `${first}/${second}`,
    value: (left + right) / 2,
  })))
  .sort((left, right) => right.value - left.value);

/** The degrees of cirrhosis of the model, by Child-Pugh class. */
export const CIRRHOSIS_CLASSES: readonly Category[] = [
  {label: "healthy", value: 0},
  {label: "CPT A", value: 0.3994897959183674},
  {label: "CPT B", value: 0.6979591836734694},
  {label: "CPT C", value: 0.8127551020408164},
];

/** The stages of renal impairment, by creatinine clearance in ml/min. */
export const RENAL_CLASSES: readonly Category[] = [
  {label: "normal", value: 110},
  {label: "mild", value: 75.9},
  {label: "moderate", value: 35.2},
  {label: "severe", value: 20.9},
];

/** The category a value is nearest to, which is what the card beside the dial says. */
export function nearestCategory(categories: readonly Category[], value: number): Category {
  let nearest = categories[0];
  if (nearest === undefined) throw new RangeError("There are no categories to choose from.");
  for (const category of categories) {
    if (Math.abs(category.value - value) < Math.abs(nearest.value - value)) nearest = category;
  }
  return nearest;
}
