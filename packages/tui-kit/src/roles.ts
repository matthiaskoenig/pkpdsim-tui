/**
 * How a table names the objects on it. The objects of the four tables are nearly all the same
 * thing: a dial over a range, whose label and sentence are written once per language and level
 * and read out of the text of the table. This is where that object is built, so that a table
 * only writes down what is different about its own.
 */

import type {TokenRole} from "@pkpdsim-tui/tuio-input";
import type {Phrase, Voice} from "./voice.ts";

/** What an object of a table is called, said about and explained with. */
export interface Named {
  readonly label: Phrase;
  readonly info: Phrase;
  /** What this object is in the body, behind the light bulb of the page the table opens with. */
  readonly more?: Phrase;
}

/** The range an object is turned over, and the marker it is read from. */
export interface NamedDial {
  readonly id: string;
  readonly unit: string;
  readonly min: number;
  readonly max: number;
  readonly reference: number;
  readonly markers: readonly number[];
}

/**
 * One object of a table: a dial over `range`, named in the words of this visitor, which carries
 * the background behind its light bulb where the text has one. `extra` is whatever this object
 * does differently from the rest, for example the logarithmic scale of a ratio, the stops of a
 * dial which takes only certain values, or the relative reading of one that starts wherever it
 * is put down.
 */
export function namedRole(
  words: Named, voice: Voice, range: NamedDial,
  extra: Partial<Pick<TokenRole, "mode" | "scale" | "turns" | "steps">> = {},
): TokenRole {
  const more = words.more;
  return {
    id: range.id, label: voice.say(words.label), description: voice.say(words.info),
    unit: range.unit, markers: [...range.markers],
    min: range.min, max: range.max, reference: range.reference,
    mode: "absolute", scale: "linear", turns: 1,
    ...(more === undefined ? {} : {background: voice.say(more)}),
    ...extra,
  };
}
