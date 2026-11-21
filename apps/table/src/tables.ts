/**
 * The tables of the application. One deployment carries all of them: the body is the overview,
 * and a table is opened by `?app`, which is the only thing that changes about the page. A table
 * is loaded when it is opened, so a visitor who looks at the body waits for nothing.
 */

import type {TableApp} from "@pkpdsim-tui/tui-kit";

/** The body itself, which is what the application shows when no table is named. */
export const OVERVIEW = "overview";

export interface TableEntry {
  /** What `?app` names it. */
  readonly id: string;
  /** What the switch in the panels calls it, in one or two words. */
  readonly label: string;
  /** The heading of its card on the body, and the title of the page while it is open. */
  readonly title: string;
  /** The few words on the card: what a visitor does at this table. */
  readonly blurb: string;
  /** The whole of it, behind the card: what the table is, for the visitor who asks. */
  readonly about: string;
  /** The organ a card points at, by the anchor id of the pkpdsim physiology. */
  readonly organ: string;
  /** The organs the table is about, which are marked on the body together. */
  readonly organs: readonly string[];
  /** Where its exported models and reference data are, under `assets/`. */
  readonly assets: string;
  /** Its module, which is only fetched when the table is opened. */
  load(): Promise<TableApp>;
}

export const TABLES: readonly TableEntry[] = [
  {
    id: "cardiovascular",
    label: "Circulation",
    title: "The circulation",
    blurb: "Narrow a vessel or change the beat.",
    about: "The heart pushes five to six litres of blood through the body every minute. Narrow "
      + "the vessels of an organ or change the beat, and watch the pressures and the flows of "
      + "the whole body settle somewhere new.",
    organ: "he",
    organs: ["he", "lu"],
    assets: "cardiovascular/",
    load: async () => (await import("@pkpdsim-tui/cardiovascular-table")).startCardiovascularTable,
  },
  {
    id: "lobes",
    label: "Liver",
    title: "The lobed liver",
    blurb: "Cut a piece away and watch it grow back.",
    about: "A liver is built of eight pieces, each with its own blood supply. Clamp them or cut "
      + "them away, and see how much of its work the rest can still do, and how it grows back "
      + "over the days which follow.",
    organ: "li",
    organs: ["li"],
    assets: "lobes/",
    load: async () => (await import("@pkpdsim-tui/lobes-table")).startLobesTable,
  },
  {
    id: "glimepiride",
    label: "Glimepiride",
    title: "One tablet, two people",
    blurb: "Follow one tablet through two bodies.",
    about: "Swallow a tablet of a diabetes drug and follow it through the gut, the liver and "
      + "the kidneys. Change who the person is, and the same tablet does something else.",
    organ: "si",
    organs: ["si", "li", "ki"],
    assets: "glimepiride/",
    load: async () => (await import("@pkpdsim-tui/glimepiride-table")).startGlimepirideTable,
  },
];

/** The table `?app` names, or nothing, which is the body. */
export function tableOf(parameters: URLSearchParams): TableEntry | undefined {
  const wanted = parameters.get("app");
  if (wanted === null || wanted === "" || wanted === OVERVIEW) return undefined;
  return TABLES.find(entry => entry.id === wanted);
}

/** Which table is open, for the switch the panels of every table carry. */
export function selectedTable(parameters: URLSearchParams): string {
  return tableOf(parameters)?.id ?? OVERVIEW;
}
