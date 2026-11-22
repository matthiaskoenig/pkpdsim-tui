/**
 * How long a liver takes to grow back, which is not the same question in a rat and in a person.
 *
 * The export runs every species over five days with one growth constant, which is the course of
 * a rat: a rat is most of the way back within a week. A human liver takes weeks, and the first
 * two of them are the steep part of it. The table therefore runs its own course per species,
 * over its own span and with its own constant, and the second object moves that constant.
 */

/** What a species does after an operation. */
export interface Course {
  /** How long the table runs the course, in days. */
  readonly days: number;
  /** The growth constant of the model, in 1/min, which is one over the time constant. */
  readonly growth: number;
}

/**
 * The course of each species the export carries. The time constant is `1 / growth`: two weeks
 * for a person, who is near a whole liver again after three months, and two days for the two
 * laboratory animals, which is the week their studies report.
 */
export const COURSES: Readonly<Record<string, Course>> = {
  human: {days: 60, growth: 1 / (14 * 24 * 60)},
  rat: {days: 10, growth: 1 / (2 * 24 * 60)},
  mouse: {days: 10, growth: 1 / (2 * 24 * 60)},
};

/** The course of a species, or the human one for a species the table does not know. */
export function courseOf(species: string): Course {
  return COURSES[species] ?? COURSES["human"] ?? {days: 60, growth: 1 / (14 * 24 * 60)};
}

/** How the days of the course are written: days for an animal, weeks for a person. */
export function tickOf(days: number): {step: number; weeks: boolean} {
  return days > 30 ? {step: 14, weeks: true} : {step: 2, weeks: false};
}
