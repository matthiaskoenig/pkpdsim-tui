/**
 * What one table is handed when it starts. The application is one page with one surface, and a
 * table draws on the surface it is given rather than looking for elements of its own: that is
 * what lets the body, the circulation, the liver and the drug be one deployment and one port.
 */

import type {GlyphKind} from "./glyph.ts";
import type {Voice} from "./voice.ts";

/** The colour and the picture a table is known by, from the card which opens it. */
export interface TableMark {
  readonly picture: GlyphKind;
  readonly color: string;
}

/** Who a table is solved for, as the first screen put them together. */
export interface TableIndividual {
  /** Their age in years, between 3 and 120. */
  readonly age: number;
  readonly sex: "female" | "male";
  /** What they weigh, in kilograms: the `BW` of every model. */
  readonly weight: number;
  /** How tall they are, in centimetres: the `HEIGHT` of every model. */
  readonly height: number;
}

export interface TableHost {
  /** The element a mouse or a finger is read from while no tracker is connected. */
  readonly surface: HTMLElement;
  /** The scene of the surface, which spans the whole table. */
  readonly scene: SVGSVGElement;
  /** Where the two panels at the opposite edges go. */
  readonly chrome: HTMLElement;
  /** The query of the page: the tracker, the body, the species, which table this is. */
  readonly parameters: URLSearchParams;
  /**
   * The ids the markers of this table carry, from `?ids=` of the address, in the order the
   * objects of a table are picked up: the nth object of a table is read from the nth id. Empty
   * where the table is numbered from 1 like the application is, which is what the simulator and
   * the mouse give. See `markerIds` of `@pkpdsim-tui/tuio-input`.
   */
  readonly markerIds: readonly number[];
  /**
   * The language and the level of the person at the table, which every word a table says goes
   * through. Both are switches in the panel and both are in the address, so a table is handed
   * over as a link that says them.
   */
  readonly voice: Voice;
  /** What this table is called, in the language of the voice: the title of its panel. */
  readonly title: string;
  /**
   * The colour and the picture of this table, which are the ones its icon carries on the
   * landing page. A visitor who walked to a table across the room sees the same red heart or
   * green tablet they pressed a moment ago, so the table says which of the four it is without
   * being read. The landing page itself has none.
   */
  readonly mark?: TableMark;
  /**
   * Who this table is solved for: the person of the first screen, with the body weight and the
   * height every human model of the collection is run with. The age is not a parameter of a
   * model, it is the reference body of that age; `@pkpdsim-tui/cardio-sim` works the four
   * numbers out, and this is what a table reads them from.
   */
  readonly individual: TableIndividual;
  /** Where the exported models and reference data of this table are. */
  readonly assets: URL;
  /** What the starting table says it is doing, which the boot screen shows. */
  progress(message: string): void;
  /** What a touch on a switch of the panel does, which the application and not the table knows. */
  choose(group: string, option: string): void;
  /** Leave this table for the body, which is where every table is opened from. */
  back(): void;
  /**
   * Put this table back the way it opened: every value at the physiology it started from, and
   * nothing of what the last visitor did left on it. A table is one page, so it starts again
   * rather than unwinding its own state, which is what an exhibit between two visitors wants.
   */
  reset(): void;
}

/**
 * A table of the application: it takes the surface and keeps it. A table is left by reloading
 * the page with another `?app`, so a table never has to take itself down.
 */
export type TableApp = (host: TableHost) => Promise<void>;
