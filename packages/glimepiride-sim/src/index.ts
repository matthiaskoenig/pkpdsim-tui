/** The glimepiride model as a table application needs it. */

export {
  ALLELE_ACTIVITY, CIRRHOSIS_CLASSES, GENOTYPES, nearestCategory, RENAL_CLASSES,
} from "./categories.ts";
export type {Category} from "./categories.ts";
export {
  GLIMEPIRIDE_CONTROLS, GLIMEPIRIDE_DOSE_STEPS, heightOf, HEIGHT_PARAMETER, NORMAL_CRCL,
  normalizeIndividual, parametersOf, startingDose,
  REFERENCE_BODIES, referenceIndividual, SEXES,
} from "./individual.ts";
export type {GlimepirideControl, GlimepirideIndividual, Sex} from "./individual.ts";
export {finalValue, pharmacokinetics} from "./pk.ts";
export type {Pharmacokinetics} from "./pk.ts";
export {
  GLIMEPIRIDE_COLUMNS, GLIMEPIRIDE_DOSES, GLIMEPIRIDE_SIMULATION, glimepirideRequest, SOLVER_SETTINGS,
} from "./request.ts";
