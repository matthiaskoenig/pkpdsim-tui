/**
 * The one entry point of the table applications of pkpdsim. The page is the surface: it shows
 * the body, and `?app` opens one table on it. Everything else is the same page, so the whole
 * collection is one build, one deployment and one port.
 *
 * Query parameters:
 *   ?app=cardiovascular   a table of `tables.ts`; without it the body is shown
 *   ?tuio                 a tracker on ws://localhost:3333
 *   ?tuio=host:port       a tracker somewhere else, which is how a table is addressed
 *   ?tuio=/tuio           a tracker behind the server this page came from, on its port
 *   ?tuio-version=1.1     a tracker that speaks TUIO 1.1 rather than TUIO 2.0
 *   ?sex=female           the female reference body, on the body and in every table
 *   ?species=rat          the liver of a rat or a mouse, in the lobed liver table
 */

import {chooseQuery} from "@pkpdsim-tui/tui-kit";
import type {ChoiceGroup, TableApp, TableHost} from "@pkpdsim-tui/tui-kit";
import {startOverview} from "./hub.ts";
import {OVERVIEW, selectedTable, TABLES, tableOf} from "./tables.ts";

function element<T extends Element>(id: string): T {
  const found = document.getElementById(id);
  if (found === null) throw new Error(`The page has no element "${id}".`);
  return found as unknown as T;
}

/** The switch every table carries: which table of the application this is. */
function tableChoices(selected: string): readonly ChoiceGroup[] {
  return [{
    id: "app", label: "Table", selected,
    options: [
      {id: OVERVIEW, label: "Body"},
      ...TABLES.map(entry => ({id: entry.id, label: entry.label})),
    ],
  }];
}

function fail(message: string): void {
  const boot = element<HTMLElement>("boot");
  boot.classList.add("boot--error");
  boot.hidden = false;
  const heading = boot.querySelector("h1");
  if (heading !== null) heading.textContent = "The table could not start";
  element<HTMLElement>("boot-message").textContent = message;
}

async function start(): Promise<void> {
  const parameters = new URLSearchParams(window.location.search);
  const entry = tableOf(parameters);
  const assets = new URL("assets/", document.baseURI);
  const title = entry?.title ?? "The body on the table";
  document.title = `${title} | pkpdsim-tui`;
  const heading = element<HTMLElement>("boot").querySelector("h1");
  if (heading !== null) heading.textContent = title;

  const host: TableHost = {
    surface: element<HTMLElement>("surface"),
    scene: element<SVGSVGElement>("scene"),
    chrome: element<HTMLElement>("chrome"),
    parameters,
    // Every table keeps its exported models and reference data in a folder of its own, so that
    // one page can serve all of them.
    assets: entry === undefined ? assets : new URL(entry.assets, assets),
    progress: message => {
      element<HTMLElement>("boot-message").textContent = message;
    },
    choices: tableChoices(selectedTable(parameters)),
    choose: (group, option) => {
      if (group === "app") chooseQuery("app", option, OVERVIEW);
    },
    back: () => chooseQuery("app", OVERVIEW, OVERVIEW),
  };

  // A table is left by opening another one, which reloads the page: nothing of a table has to be
  // taken down, and a solver, a worker and a socket go with the page they belong to.
  window.addEventListener("keydown", event => {
    if (event.key === "Escape" && entry !== undefined) chooseQuery("app", OVERVIEW, OVERVIEW);
  });

  const app: TableApp = entry === undefined ? startOverview : await entry.load();
  await app(host);
  element<HTMLElement>("boot").hidden = true;
}

try {
  await start();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  fail(`${message} The exported models and reference data are copied in with "npm run sync".`);
  console.error(error);
}
