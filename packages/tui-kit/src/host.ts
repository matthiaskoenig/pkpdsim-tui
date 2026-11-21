/**
 * What one table is handed when it starts. The application is one page with one surface, and a
 * table draws on the surface it is given rather than looking for elements of its own: that is
 * what lets the body, the circulation, the liver and the drug be one deployment and one port.
 */

import type {ChoiceGroup} from "./chrome.ts";

export interface TableHost {
  /** The element a mouse or a finger is read from while no tracker is connected. */
  readonly surface: HTMLElement;
  /** The scene of the surface, which spans the whole table. */
  readonly scene: SVGSVGElement;
  /** Where the two panels at the opposite edges go. */
  readonly chrome: HTMLElement;
  /** The query of the page: the tracker, the body, the species, which table this is. */
  readonly parameters: URLSearchParams;
  /** Where the exported models and reference data of this table are. */
  readonly assets: URL;
  /** What the starting table says it is doing, which the boot screen shows. */
  progress(message: string): void;
  /** The switches of the application, which a table shows in its panels beside its own. */
  readonly choices: readonly ChoiceGroup[];
  /** What a touch on one of `choices` does, which the application and not the table knows. */
  choose(group: string, option: string): void;
}

/**
 * A table of the application: it takes the surface and keeps it. A table is left by reloading
 * the page with another `?app`, so a table never has to take itself down.
 */
export type TableApp = (host: TableHost) => Promise<void>;
