/**
 * The tables of the application. One deployment carries all of them: the body is the overview,
 * and a table is opened by `?app`, which is the only thing that changes about the page. A table
 * is loaded when it is opened, so a visitor who looks at the body waits for nothing.
 */

import type {Pictogram, TableApp, Voice} from "@pkpdsim-tui/tui-kit";
import {HUB_TEXT} from "./text.ts";
import type {EntryCopy} from "./text.ts";

/** The body itself, which is what the application shows when no table is named. */
export const OVERVIEW = "overview";

/** The page about the models, the software, the licences and the laboratory. */
export const ABOUT = "about";

/** The picture of the body, which is the table every other one is opened from. */
export const OVERVIEW_PICTURE: Pictogram = "body";

export interface TableEntry {
  /** What `?app` names it, and what its words are kept under in `HUB_TEXT`. */
  readonly id: string;
  /** The organ a card points at, by the anchor id of the pkpdsim physiology. */
  readonly organ: string;
  /** The organs the table is about, which are marked on the body together. */
  readonly organs: readonly string[];
  /** Where its exported models and reference data are, under `assets/`. */
  readonly assets: string;
  /** The picture of the table: the thing a visitor puts their hand on when they open it. */
  readonly picture: Pictogram;
  /** Its module, which is only fetched when the table is opened. */
  load(): Promise<TableApp>;
}

export const TABLES: readonly TableEntry[] = [
  {
    id: "cardiovascular",
    picture: "heart",
    organ: "he",
    organs: ["he", "lu"],
    assets: "cardiovascular/",
    load: async () => (await import("@pkpdsim-tui/cardiovascular-table")).startCardiovascularTable,
  },
  {
    id: "liver",
    picture: "liver",
    organ: "li",
    organs: ["li", "si"],
    assets: "cardiovascular/",
    load: async () => (await import("@pkpdsim-tui/liver-table")).startLiverTable,
  },
  {
    id: "lobes",
    picture: "scalpel",
    organ: "li",
    organs: ["li"],
    assets: "lobes/",
    load: async () => (await import("@pkpdsim-tui/lobes-table")).startLobesTable,
  },
  {
    id: "glimepiride",
    picture: "tablet",
    organ: "si",
    organs: ["si", "li", "ki"],
    assets: "glimepiride/",
    load: async () => (await import("@pkpdsim-tui/glimepiride-table")).startGlimepirideTable,
  },
  {
    id: "perfusion",
    picture: "pump",
    organ: "li",
    organs: ["li"],
    assets: "perfusion/",
    load: async () => (await import("@pkpdsim-tui/perfusion-table")).startPerfusionTable,
  },
];

/** What a table is called, in the language and at the level of this visitor. */
export function entryCopy(voice: Voice, id: string): EntryCopy {
  const copy = voice.pick(HUB_TEXT).entries[id] ?? HUB_TEXT.en.entries[id];
  if (copy === undefined) throw new Error(`No words for the table "${id}".`);
  return copy;
}

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
